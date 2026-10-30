import {
  getDispatchJob,
  deleteDispatchJob,
  updateDispatchJob
} from "./redis/dispatchState.js";

import {
  updateUserStatus,
  getUserStatus
} from "./redis/userStatus.js";

import { rankUsersWithScore } from "./scoring.js";
import { sendRequest } from "./requestManager.js";

import {
  usersInDispatchHistory,
  removeUserFromDispatchHistory
} from "./redis/dispatchHistory.js";

// Helper delay to give searching.tsx telemetry pacing between H3 k-ring expansions
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function propagateRing(post) {
  const postStatus = await getDispatchJob(post.id);
  
  // Exit immediately if job was cancelled or deleted from a prior run
  if (!postStatus || postStatus.status === "CANCELLED" || postStatus.status === "FAILED") {
    console.log(`[Dispatcher] Aborting propagation for post ${post.id} (Status: ${postStatus?.status || "DELETED"})`);
    return null;
  }

  let postStatus_Value = Number(postStatus.currentRing || 0);

  if (postStatus_Value >= 7) {
    console.log(`[Dispatcher] Max ring depth reached for post ${post.id}. Dispatch failed.`);

    await updateDispatchJob(post.id, {
      status: "FAILED",
      currentRing: "7"
    });

    setTimeout(async () => {
      await deleteDispatchJob(post.id);
      await removeUserFromDispatchHistory(post.id);
    }, 2000);

    return { success: false, reason: "NO_HELPERS_FOUND" };
  }

  postStatus_Value++;
  console.log(`[Dispatcher] Propagating post ${post.id} to Ring: ${postStatus_Value}`);

  post.current_Ring = postStatus_Value;

  await updateDispatchJob(post.id, {
    status: "SEARCHING",
    currentRing: postStatus_Value.toString()
  });

  return await dispatchPost(post);
}

async function dispatchPost(post) {
  const currentRingStr = (post.current_Ring || 0).toString();

  // 1. Immediate exit check if job was cancelled
  const postStatus = await getDispatchJob(post.id);
  if (!postStatus || postStatus.status === "CANCELLED") return null;

  // Sync state to Redis only if it's not already updated
  if (postStatus.currentRing !== currentRingStr || postStatus.status !== "SEARCHING") {
    await updateDispatchJob(post.id, {
      status: "SEARCHING",
      currentRing: currentRingStr
    });
  }

  // Rank candidate helpers in current H3 ring by distance and score
  const rankedUsers = await rankUsersWithScore(
    post.startingCell,
    post.current_Ring || 0,
    post
  );

  // If no candidates are found in this ring, expand ring INSTANTLY (0ms delay)
  if (!rankedUsers || rankedUsers.length === 0) {
    return await propagateRing(post);
  }

  // Get users who already received this request
  const dispatchHistory = await usersInDispatchHistory(post.id);

  // 2. Parallelize status checks across all ranked users in the ring

  const userCheckPromises = rankedUsers.map(async (currentUser) => {
  const currentUserId = currentUser.id.toString();
  const requesterId = post.userId.toString();

  // Never allow the requester to receive their own request
  if (currentUserId === requesterId) {
    console.log(
      `[Dispatcher] Skipping requester ${currentUserId} for their own request ${post.id}`
    );
    return null;
  }

  const alreadySeen = dispatchHistory.includes(currentUserId);

  if (alreadySeen) return null;

  const userStatus = await getUserStatus(currentUser.id);
  const currentStatus = userStatus?.status;
  if (currentStatus === "AVAILABLE") {
    return currentUser;
  }

  return null;
});
  
  const resolvedUsers = await Promise.all(userCheckPromises);
  const validCandidates = resolvedUsers.filter(Boolean);

  // If all candidates in this ring were unavailable or already seen, expand ring instantly
  if (validCandidates.length === 0) {
    return await propagateRing(post);
  }

  // 3. Process available candidates
  for (let i = 0; i < validCandidates.length; i++) {
    const currentUser = validCandidates[i];
    const currentUserId = currentUser.id.toString();

    // Check again before offering in case the client cancelled mid-loop
    const liveStatus = await getDispatchJob(post.id);
    if (!liveStatus || liveStatus.status === "CANCELLED") return null;

    console.log(`[Dispatcher] Offering request ${post.id} to user ${currentUserId}`);

    // Update user status to BUSY and link post ID so frontend can render offer card
    const latestHelperStatus = await getUserStatus(currentUser.id);

if (
  latestHelperStatus?.status === "BUSY" &&
  String(latestHelperStatus.postID) === String(post.id)
) {
  await updateUserStatus(currentUser.id, {
    status: "AVAILABLE",
    postID: ""
  });
}

    // Update dispatch job candidate state
   await updateDispatchJob(post.id, {
      status: "PENDING_CANDIDATE",
      currentCandidateId: currentUserId
    });

    // Send request offer with timeout logic inside requestManager
    const result = await sendRequest(currentUser, post);
    console.log(`[Dispatcher] Request result for ${currentUserId}: ${result}`);

    if (result === "ACCEPTED") {
      // Lock match state in Redis
      await updateDispatchJob(post.id, {
        status: "MATCHED",
        matchedUserId: currentUserId
      });

      return { success: true, matchedUserId: currentUserId };
    }

    // Reset candidate back to AVAILABLE if offer was rejected, timed out, or passed
    await updateUserStatus(currentUser.id, {
      status: "AVAILABLE",
      postID: ""
    });

    // Reset job state back to SEARCHING so searching.tsx doesn't hang on PENDING_CANDIDATE
    const latestJob = await getDispatchJob(post.id);

if (!latestJob || latestJob.status === "CANCELLED") {
  return null;
}

if (latestJob.status === "MATCHED") {
  return {
    success: true,
    matchedUserId: latestJob.matchedUserId
  };
}

if (
  latestJob.status === "PENDING_CANDIDATE" &&
  String(latestJob.currentCandidateId) === currentUserId
) {
  await updateDispatchJob(post.id, {
    status: "SEARCHING",
    currentCandidateId: "",
    sentAt: "",
    expiresAt: ""
  });
}

    if (
      result === "TIMEOUT" ||
      result === "REJECTED" ||
      result === "CANCELLED" ||
      result === "DEACTIVATED" || 
      result === "PASS"
    ) {
      continue;
    }
  }

  // 4. Pacing delay ONLY when all candidates in a populated ring have passed/declined
  await sleep(1000);

  // Expand ring
  return await propagateRing(post);
}

export { propagateRing, dispatchPost };