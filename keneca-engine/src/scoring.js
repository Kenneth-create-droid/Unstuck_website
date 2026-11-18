
import { findUsersForPostWithDistance } from "./matching.js";
import { db } from "../../backend/db.js";
import { calculateReliabilityScore } from "../../backend/reliabilityScoring.js";

const MAX_DISTANCE = 3000;
const DEFAULT_RELIABILITY = 70;

function scoreUser(user) {
  const distance = Number(user.distance);

  if (!Number.isFinite(distance)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, 100 - (distance / MAX_DISTANCE) * 100)
  );
}

function normalizeSkill(skill) {
  return typeof skill === "string"
    ? skill.trim().toLowerCase()
    : "";
}

async function assignScoresToUsers(startingCell, current_Ring, post) {
  const listUsers = await findUsersForPostWithDistance(
    startingCell,
    current_Ring,
    post
  );

  if (listUsers.length === 0) {
    return [];
  }

  // Read the requested skill from the Redis job.
  const requestedSkill = normalizeSkill(post.requestedSkill);

  // Candidate IDs must come from the actual matching engine.
  const candidateIds = [
    ...new Set(
      listUsers
        .map((user) => Number(user.userId ?? user.id))
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    )
  ];

  // Load candidate skills in one database query.
  const skillsByUser = new Map();

  if (requestedSkill && candidateIds.length > 0) {
    const result = await db.query(
      `SELECT user_id, skill_name
       FROM user_skills
       WHERE user_id = ANY($1::integer[])`,
      [candidateIds]
    );

    for (const row of result.rows) {
      const id = Number(row.user_id);

      if (!skillsByUser.has(id)) {
        skillsByUser.set(id, new Set());
      }

      skillsByUser.get(id).add(normalizeSkill(row.skill_name));
    }
  }

  const usersWithScore = [];

  for (const user of listUsers) {
    const helperId = Number(user.userId ?? user.id);

    const distanceScore = scoreUser(user);

    let reliabilityScore = DEFAULT_RELIABILITY;

    if (Number.isSafeInteger(helperId) && helperId > 0) {
      try {
        const reliability = await calculateReliabilityScore(helperId);
        reliabilityScore = reliability.reliabilityScore;
      } catch (error) {
        console.error(
          `[Scoring] Reliability lookup failed for helper ${helperId}:`,
          error
        );
      }
    }

    const skillScore = requestedSkill
      ? skillsByUser.get(helperId)?.has(requestedSkill)
        ? 100
        : 0
      : null;

    const finalScore = requestedSkill
      ? distanceScore * 0.5 +
        skillScore * 0.3 +
        reliabilityScore * 0.2
      : distanceScore * 0.8 +
        reliabilityScore * 0.2;

    usersWithScore.push({
      ...user,
      distanceScore,
      skillScore,
      reliabilityScore,
      score: Math.round(finalScore * 100) / 100
    });
  }

  return usersWithScore;
}

async function rankUsersWithScore(startingCell, current_Ring, post) {
  const users = await assignScoresToUsers(
    startingCell,
    current_Ring,
    post
  );

  users.sort((a, b) => b.score - a.score);

  return users;
}

export {
  scoreUser,
  assignScoresToUsers,
  rankUsersWithScore
};
