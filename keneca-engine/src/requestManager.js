// Import dispatch state functions
import {
  updateDispatchJob,
  getDispatchJob
} from "./redis/dispatchState.js";

// Import dispatch history function
import {
  addUserToDispatchHistory
} from "./redis/dispatchHistory.js";

// Import user status function
import {
  updateUserStatus,
  getUserStatus
} from "./redis/userStatus.js";


async function sendRequest(user, post) {
  const sentAt = Date.now();
  const expiresAt = sentAt + 20 * 1000;

  // Confirm the helper is still available.
  const helperStatus = await getUserStatus(user.id);

  if (helperStatus?.status !== "AVAILABLE") {
    return "DEACTIVATED";
  }

  // Assign the request to this helper.
  await updateUserStatus(user.id, {
    status: "BUSY",
    postID: String(post.id)
  });

  // Store the pending offer in the dispatch job.
  await updateDispatchJob(post.id, {
    status: "PENDING_CANDIDATE",
    currentCandidateId: String(user.id),
    sentAt: String(sentAt),
    expiresAt: String(expiresAt)
  });

  // Prevent repeatedly offering the same request.
  await addUserToDispatchHistory(post.id, user.id);

  // Wait for acceptance, rejection, or timeout.
  return await handleTimeOut(post, user);
}

async function handleTimeOut(post, user) {
  const postState = await getDispatchJob(post.id);
  if (!postState || !postState.expiresAt) return "CANCELLED";

  const expiresAt = Number(postState.expiresAt);
  const timeRemaining = Math.max(0, expiresAt - Date.now());

  return new Promise((resolve) => {
    let finished = false;

    // 1. Polling interval to check if candidate accepted, passed, or deactivated location
    const checkInterval = setInterval(async () => {
      if (finished) return;

      const latestState = await getDispatchJob(post.id);

      // If job was deleted or cancelled
      if (!latestState || latestState.status === "CANCELLED") {
        finished = true;
        clearInterval(checkInterval);
        clearTimeout(timer);
        resolve("CANCELLED");
        return;
      }

      // If candidate accepted
      if (latestState.status === "MATCHED") {
        finished = true;
        clearInterval(checkInterval);
        clearTimeout(timer);
        resolve("ACCEPTED");
        return;
      }

      // If user toggled off location or passed, currentCandidateId will no longer match
      if (
        latestState.status === "SEARCHING" || 
        latestState.currentCandidateId !== user.id.toString()
      ) {
        finished = true;
        clearInterval(checkInterval);
        clearTimeout(timer);
        resolve("DEACTIVATED");
        return;
      }
    }, 500);

    // 2. Timeout fallback if user takes no action on mobile screen
    const timer = setTimeout(async () => {
      if (finished) return;

      finished = true;
      clearInterval(checkInterval);

      const latestState = await getDispatchJob(post.id);

      if (latestState && latestState.currentCandidateId === user.id.toString()) {
        await updateDispatchJob(post.id, {
          status: "SEARCHING",
          currentCandidateId: "",
          sentAt: "",
          expiresAt: ""
        });

        // Reset the helper's status back to AVAILABLE so dispatcher doesn't skip them later
        await updateUserStatus(user.id, {
          status: "AVAILABLE",
          postID: ""
        });
      }

      resolve("TIMEOUT");
    }, timeRemaining);
  });
}

export { sendRequest };