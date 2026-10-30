import { client } from "./redisClient.js";

/**
 * Creates or sets the initial dispatch job state in Redis.
 * Accepts either:
 * - setDispatchJob(postID, "cell_index_string")
 * - setDispatchJob(postID, { startingCell, userId, subject, ... })
 */
async function setDispatchJob(postID, payload) {
  const dispatchKey = `dispatch:${postID}`;

  let jobData = {
    status: "SEARCHING",
    startingCell: "",
    currentRing: "0",
    currentCandidateId: "",
    matchedUserId: "",
    createdAt: Date.now().toString(),
    sentAt: "",
    expiresAt: ""
  };

  if (typeof payload === "string") {
    jobData.startingCell = payload;
  } else if (payload && typeof payload === "object") {
    jobData = {
      ...jobData,
      ...payload,
      startingCell: payload.startingCell ? String(payload.startingCell) : ""
    };
  }

  // Convert all field values to pure strings for Redis safety
  const sanitizedData = {};
  for (const [key, val] of Object.entries(jobData)) {
    sanitizedData[key] = val !== undefined && val !== null ? String(val) : "";
  }

  await client.hSet(dispatchKey, sanitizedData);
  return true;
}

/**
 * Retrieves the current state of a dispatch job.
 */
async function getDispatchJob(postID) {
  const dispatchKey = `dispatch:${postID}`;
  const dispatchState = await client.hGetAll(dispatchKey);

  // Return null if the key doesn't exist or is empty
  if (!dispatchState || Object.keys(dispatchState).length === 0) {
    return null;
  }

  return dispatchState;
}

/**
 * Updates specific fields in an active dispatch job safely.
 */
async function updateDispatchJob(postID, updates) {
  if (!postID || !updates) return false;

  const dispatchKey = `dispatch:${postID}`;

  // Convert all update values to pure strings to prevent node-redis crashes
  const sanitizedUpdates = {};
  for (const [key, val] of Object.entries(updates)) {
    sanitizedUpdates[key] = val !== undefined && val !== null ? String(val) : "";
  }

  await client.hSet(dispatchKey, sanitizedUpdates);
  return true;
}

/**
 * Removes the dispatch job from Redis after resolution or timeout.
 */
async function deleteDispatchJob(postID) {
  const dispatchKey = `dispatch:${postID}`;
  await client.del(dispatchKey);
  return true;
}

export {
  setDispatchJob,
  setDispatchJob as createDispatchJob, // Alias so both function names work
  getDispatchJob,
  updateDispatchJob,
  deleteDispatchJob
};