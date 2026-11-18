
import { calculateReliabilityScore } from "./reliabilityScoring.js";
import { db } from "./db.js";

try {
  const result = await calculateReliabilityScore(1);

  console.log(
    "Helper Reliability Results:",
    JSON.stringify(result, null, 2)
  );
} catch (error) {
  console.error("Reliability test failed:", error);
} finally {
  await db.end();
}
