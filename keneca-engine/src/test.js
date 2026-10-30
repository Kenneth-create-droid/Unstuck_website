import {
  scoreUser,
  assignScoresToUsers,
  rankUsersWithScore
} from "./scoring.js";

import { findUsersForPostWithDistance } from "./matching.js";
import { cellsAtCurrentRing } from "./propagation.js";
import { userLocToCell } from "./user.js";

import {
  addUserToSpatialIndex,
  removeUserFromSpatialIndex,
  moveUserLocation
} from "./spatialIndexManager.js";

import * as h3_lib from "h3-js";

import { calculateDistance, addDistanceToUsers } from "./distance.js";

import { sendRequest } from "./requestManager.js";

import {
  createDispatchJob,
  getDispatchJob,
  updateDispatchJob
} from "./redis/dispatchState.js";

import {
  createUserStatus,
  getUserStatus,
  updateUserStatus
} from "./redis/userStatus.js";

import { dispatchPost, propagateRing } from "./dispatcher.js";

import {
  removeUserFromDispatchHistory,
  addUserToDispatchHistory
} from "./redis/dispatchHistory.js";

// --- TEST DATASETS ---

const testPost = {
  id: 101,
  latitude: 43.9458,
  longitude: -78.896,
  post: "Need help with calculus"
};

const users = [
  { id: 1, username: "Kenneth", latitude: 43.9458, longitude: -78.896 },
  { id: 2, username: "Liam", latitude: 43.9459, longitude: -78.8961 },
  {
    id: 3,
    username: "Timi",
    latitude: 43.946,
    longitude: -78.8962,
    post: "Hey, can someone help me with calculus?"
  },
  { id: 4, username: "Mohammed", latitude: 43.95, longitude: -78.9 },
  {
    id: 5,
    username: "Yahaya",
    latitude: 43.955,
    longitude: -78.905,
    post: "Anyone available to study operating systems?"
  },
  { id: 6, username: "Sarah", latitude: 43.9461, longitude: -78.8963 },
  {
    id: 7,
    username: "Daniel",
    latitude: 43.9502,
    longitude: -78.9001,
    post: "Looking for help debugging my JavaScript code."
  },
  { id: 8, username: "David", latitude: 43.9552, longitude: -78.9051 },
  {
    id: 9,
    username: "Emma",
    latitude: 43.96,
    longitude: -78.91,
    post: "Does anyone want to join a study group?"
  },
  { id: 10, username: "Alex", latitude: 43.9601, longitude: -78.9101 }
];

const newUser = {
  id: 11,
  username: "Michael",
  latitude: 43.9457,
  longitude: -78.8962
};

// --- HELPER FUNCTION FOR SEEDING REDIS ---

function formatUser(u) {
  return {
    id: u.id,
    username: u.username,
    lat: u.latitude ?? u.lat,
    lng: u.longitude ?? u.lng,
    latitude: u.latitude ?? u.lat,
    longitude: u.longitude ?? u.lng
  };
}

async function seedUsersToRedis(userList) {
  for (const user of userList) {
    await addUserToSpatialIndex(formatUser(user));
  }
}

// --- UNIT TESTS ---

function testLocToCell() {
  console.log(
    "\nTEST - Changing user lat/lng to corresponding H3 cell"
  );
  const testCell = userLocToCell(formatUser(users[0]));
  console.log("The H3 cell for Kenneth is:", testCell);
}

async function testaddUserToSpatialIndex() {
  console.log("\nTEST - Add User to Redis Spatial Index");
  await addUserToSpatialIndex(formatUser(newUser));
  console.log("Added Michael (ID 11) to Redis.");
}

async function testRemoveUserFromSpatialIndex() {
  console.log("\nTEST - Remove User from Redis Spatial Index");
  await removeUserFromSpatialIndex(formatUser(newUser));
  console.log("Removed Michael (ID 11) from Redis.");
}

async function testMoveUserLoc() {
  console.log("\nTEST - Move User Location in Redis");
  const oldKenneth = formatUser(users[0]);
  const updatedKenneth = formatUser({
    id: 1,
    username: "Kenneth",
    latitude: 43.955,
    longitude: -78.905
  });
  await moveUserLocation(oldKenneth, updatedKenneth);
  console.log("Moved Kenneth's location in Redis.");
}

function testCellsAtCurrentRing() {
  console.log("\nTEST - Cells At Current Ring");
  const startingCell = h3_lib.latLngToCell(43.95, -78.9, 9);

  const ring0 = cellsAtCurrentRing(startingCell, 0);
  const ring1 = cellsAtCurrentRing(startingCell, 1);
  const ring2 = cellsAtCurrentRing(startingCell, 2);

  console.log("Ring 0 cells count:", ring0.length);
  console.log("Ring 1 cells count:", ring1.length);
  console.log("Ring 2 cells count:", ring2.length);
}

function testCalculateDistanceSameLocation() {
  const distance = calculateDistance(43.9458, -78.896, 43.9458, -78.896);
  console.log("\nTEST 1 - Distance Same Location:", distance, "meters");
}

function testCalculateDistanceKenneth() {
  const kenneth = users[0];
  const distance = calculateDistance(
    testPost.latitude,
    testPost.longitude,
    kenneth.latitude,
    kenneth.longitude
  );
  console.log("\nTEST 2 - Post to Kenneth Distance:", distance, "meters");
}

function testCalculateDistanceLiam() {
  const liam = users[1];
  const distance = calculateDistance(
    testPost.latitude,
    testPost.longitude,
    liam.latitude,
    liam.longitude
  );
  console.log("\nTEST 3 - Post to Liam Distance:", distance, "meters");
}

function testNearVsFarUser() {
  const liam = users[1];
  const alex = users[9];

  const liamDist = calculateDistance(
    testPost.latitude,
    testPost.longitude,
    liam.latitude,
    liam.longitude
  );
  const alexDist = calculateDistance(
    testPost.latitude,
    testPost.longitude,
    alex.latitude,
    alex.longitude
  );

  console.log("\nTEST 4 - Near vs Far User:");
  console.log("Liam Distance:", liamDist);
  console.log("Alex Distance:", alexDist);
  console.log("Is Liam closer?", liamDist < alexDist);
}

function testAddDistanceToUsers() {
  const selectedUsers = [users[0], users[1], users[3]];
  const result = addDistanceToUsers(selectedUsers, testPost);
  console.log("\nTEST 5 - Add Distance To Users:", result);
}

// --- MATCHING TESTS (REDIS INTEGRATED) ---

const matchingStartingCell = h3_lib.latLngToCell(
  testPost.latitude,
  testPost.longitude,
  9
);

async function testFindUsersRing0() {
  const result = await findUsersForPostWithDistance(
    matchingStartingCell,
    0,
    testPost
  );
  console.log("\nTEST - MATCHING RING 0");
  console.log("Users Found:", result);
}

async function testFindUsersRing1() {
  const result = await findUsersForPostWithDistance(
    matchingStartingCell,
    1,
    testPost
  );
  console.log("\nTEST - MATCHING RING 1");
  console.log("Users Found:", result);
}

async function testMatchingDistanceProperty() {
  const result = await findUsersForPostWithDistance(
    matchingStartingCell,
    0,
    testPost
  );
  console.log("\nTEST - MATCHING DISTANCE PROPERTY");
  for (const user of result) {
    console.log(
      `User ${user.id} | Distance: ${user.distance} | Has Distance: ${user.distance !== undefined}`
    );
  }
}

// --- SCORING & RANKING TESTS ---

function testScoreUserZeroDistance() {
  const score = scoreUser({ username: "ZeroUser", distance: 0 });
  console.log("\nTEST - Score at 0m:", score);
}

function testScoreUserHalfDistance() {
  const score = scoreUser({ username: "HalfUser", distance: 1500 });
  console.log("\nTEST - Score at 1500m:", score);
}

function testScoreUserBeyondMaxDistance() {
  const score = scoreUser({ username: "FarUser", distance: 4000 });
  console.log("\nTEST - Score beyond max distance:", score);
}

async function testAssignScoresToUsers() {
  await seedUsersToRedis(users);
  const result = await assignScoresToUsers(matchingStartingCell, 0, testPost);
  console.log("\nTEST - ASSIGN SCORES TO USERS:", result);
}

async function testRankUsersWithScore() {
  await seedUsersToRedis(users);
  const result = await rankUsersWithScore(matchingStartingCell, 0, testPost);
  console.log("\nTEST - RANK USERS BY SCORE:");
  for (const user of result) {
    console.log(
      `User ID: ${user.id} | Distance: ${user.distance}m | Score: ${user.score}`
    );
  }
}

// --- FULL PIPELINE DISPATCH TEST ---

async function testDispatchPost() {
  console.log("\nTEST - FULL DISPATCH POST ENGINE");

  await removeUserFromDispatchHistory(testPost.id);

  for (const user of users) {
    await updateUserStatus(user.id, {
      Status: "AVAILABLE",
      postID: ""
    });
  }

  await seedUsersToRedis(users);

  testPost.startingCell = h3_lib.latLngToCell(
    testPost.latitude,
    testPost.longitude,
    9
  );
  testPost.current_Ring = 0;

  await createDispatchJob(testPost.id, testPost.startingCell);

  await dispatchPost(testPost);
}

// --- SUITE EXECUTION RUNNER ---

async function runAllTests() {
  console.log("=== STARTING KENECA REDIS ENGINE TESTS ===");

  testLocToCell();
  await seedUsersToRedis(users);

  await testaddUserToSpatialIndex();
  await testRemoveUserFromSpatialIndex();
  await testMoveUserLoc();

  testCellsAtCurrentRing();
  testCalculateDistanceSameLocation();
  testCalculateDistanceKenneth();
  testCalculateDistanceLiam();
  testNearVsFarUser();
  testAddDistanceToUsers();

  await testFindUsersRing0();
  await testFindUsersRing1();
  await testMatchingDistanceProperty();

  testScoreUserZeroDistance();
  testScoreUserHalfDistance();
  testScoreUserBeyondMaxDistance();

  await testAssignScoresToUsers();
  await testRankUsersWithScore();

  await testDispatchPost();

  console.log("\n=== ALL TESTS COMPLETED ===");
}

runAllTests();