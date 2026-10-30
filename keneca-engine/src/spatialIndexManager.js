// The job of the manager is to manage our spatial index data in Redis.
import { client } from "./redis/redisClient.js";
import { userLocToCell } from "./user.js";

// --- WRITE OPERATIONS ---

async function addUserToSpatialIndex(user) {
  const my_Cell = userLocToCell(user);

  // 1. Add user ID to the H3 cell Set (for spatial search)
  await client.sAdd(`h3:${my_Cell}`, String(user.id));

  // 2. Store coordinates in a Hash (for distance calculations)
  await client.hSet(`user:${user.id}:geo`, {
    lat: String(user.lat),
    lng: String(user.lng),
    cell: my_Cell
  });
}

async function removeUserFromSpatialIndex(user) {
  // 1. Get the user's current cell from their geo hash
  const currentCell = await client.hGet(`user:${user.id}:geo`, "cell");

  // 2. Remove the user's ID from the H3 Cell Set
  if (currentCell) {
    await client.sRem(`h3:${currentCell}`, String(user.id));
  }

  // 3. Delete the user's coordinate Hash completely
  await client.del(`user:${user.id}:geo`);

  return true;
}

async function moveUserLocation(oldUser, updatedUser) {
  const oldCell = userLocToCell(oldUser);
  const newCell = userLocToCell(updatedUser);

  // Only update Sets if the user crossed into a DIFFERENT H3 hexagon
  if (oldCell !== newCell) {
    await client.sRem(`h3:${oldCell}`, String(updatedUser.id));
    await client.sAdd(`h3:${newCell}`, String(updatedUser.id));
  }

  // Always update exact lat/lng and current cell in their Hash
  await client.hSet(`user:${updatedUser.id}:geo`, {
    lat: String(updatedUser.lat),
    lng: String(updatedUser.lng),
    cell: newCell
  });
}

// --- READ / QUERY OPERATIONS ---

// 1. Fetch all unique user IDs sitting in a list of H3 cells
async function getUsersInCells(cells) {
  if (!cells || cells.length === 0) return [];

  const userIds = new Set();

  for (const cell of cells) {
    const members = await client.sMembers(`h3:${cell}`);
    for (const id of members) {
      userIds.add(id);
    }
  }

  return Array.from(userIds);
}

// 2. Fetch full location objects (lat, lng, cell) for a list of user IDs
async function getCandidatesData(userIds) {
  if (!userIds || userIds.length === 0) return [];

  const candidates = [];

  for (const id of userIds) {
    const geoData = await client.hGetAll(`user:${id}:geo`);

    // Only add if the hash actually exists in Redis
    if (geoData && geoData.lat && geoData.lng) {
      candidates.push({
        id: id,
        lat: parseFloat(geoData.lat),
        lng: parseFloat(geoData.lng),
        cell: geoData.cell
      });
    }
  }

  return candidates;
}

export {
  addUserToSpatialIndex,
  removeUserFromSpatialIndex,
  moveUserLocation,
  getUsersInCells,
  getCandidatesData
};