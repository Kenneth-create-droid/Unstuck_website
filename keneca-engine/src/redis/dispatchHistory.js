import { client } from "./redisClient.js";

/**
 * Adds a user ID to the post's dispatch history set (prevents re-notification).
 */
async function addUserToDispatchHistory(postID, userID) {
  if (!postID || !userID) return false;
  const historyKey = `dispatch:${postID}:seen`;
  await client.sAdd(historyKey, userID.toString());
  return true;
}

/**
 * Checks if a specific user has already seen this request.
 */
async function checkUserInDispatchHistory(postID, userID) {
  if (!postID || !userID) return false;
  const historyKey = `dispatch:${postID}:seen`;
  const alreadySeen = await client.sIsMember(historyKey, userID.toString());
  return alreadySeen;
}

/**
 * Returns all user IDs who have already received this request.
 */
async function usersInDispatchHistory(postID) {
  if (!postID) return [];
  const historyKey = `dispatch:${postID}:seen`;
  const userHistory = await client.sMembers(historyKey);
  return userHistory || [];
}

/**
 * Deletes the post's history set after completion or max-ring termination.
 */
async function removeUserFromDispatchHistory(postID) {
  if (!postID) return false;
  const historyKey = `dispatch:${postID}:seen`;
  await client.del(historyKey);
  return true;
}

export {
  addUserToDispatchHistory,
  checkUserInDispatchHistory,
  usersInDispatchHistory,
  removeUserFromDispatchHistory
};