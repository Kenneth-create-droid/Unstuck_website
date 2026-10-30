import { client } from "./redisClient.js";

async function createUserStatus(userID) {
  const statusKey = `user:${userID}:status`;

  await client.hSet(statusKey, {
    userid: String(userID),
    status: "OFFLINE", // Use "AVAILABLE", "BUSY", or "OFFLINE"
    postID: "",
  });

  return true;
}

async function updateUserStatus(userID, updates) {
  const statusKey = `user:${userID}:status`;
  await client.hSet(statusKey, updates);
  return true;
}

async function getUserStatus(userID) {
  const statusKey = `user:${userID}:status`;
  const userStatus = await client.hGetAll(statusKey);
  return userStatus;
}

export {
  createUserStatus,
  updateUserStatus,
  getUserStatus
};