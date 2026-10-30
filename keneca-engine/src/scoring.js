// In this file, we focus on scoring candidates and sorting them by score.
// This design makes it easy to add more variables later (rating, acceptance rate, etc.).

import { findUsersForPostWithDistance } from "./matching.js";

// Pure math function to calculate a 0 to 100 score based on distance
function scoreUser(user) {
  const maxDistance = 3000; // 3,000 meters (3 km)

  let score = 100 - (user.distance / maxDistance) * 100;

  // Prevent negative scores if distance exceeds maxDistance
  if (score < 0) {
    score = 0;
  }

  return score;
}

// Assign scores to each candidate returned from the matching engine
async function assignScoresToUsers(startingCell, current_Ring, post) {
  // MUST await findUsersForPostWithDistance because it reads from Redis
  const listUsers = await findUsersForPostWithDistance(
    startingCell,
    current_Ring,
    post
  );

  const usersWithScore = [];

  for (let i = 0; i < listUsers.length; i++) {
    const userScore = scoreUser(listUsers[i]);

    usersWithScore.push({
      ...listUsers[i],
      score: userScore
    });
  }

  return usersWithScore;
}

// Fetch scored users and rank them from highest score to lowest score
async function rankUsersWithScore(startingCell, current_Ring, post) {
  // MUST await assignScoresToUsers because it contains Redis queries
  const finalScore = await assignScoresToUsers(
    startingCell,
    current_Ring,
    post
  );

  // Priority queue sort: Descending order (highest score first)
  finalScore.sort((a, b) => b.score - a.score);

  return finalScore;
}

export { scoreUser, assignScoresToUsers, rankUsersWithScore };