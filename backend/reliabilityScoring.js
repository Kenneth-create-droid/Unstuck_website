
import { db } from "./db.js";

const DEFAULT_RELIABILITY = 70;
const PRIOR_SAMPLE_SIZE = 10;

const RESPONSE_WEIGHT = 0.4;
const COMPLETION_WEIGHT = 0.6;

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

async function calculateReliabilityScore(helperId) {
  const result = await db.query(
    `
    WITH offers AS (
      SELECT
        offer_id,

        BOOL_OR(event_type = 'OFFER_SENT') AS was_offered,
        BOOL_OR(event_type = 'ACCEPTED') AS was_accepted,
        BOOL_OR(event_type = 'PASSED') AS was_passed,
        BOOL_OR(event_type = 'TIMED_OUT') AS was_timed_out,
        BOOL_OR(event_type = 'COMPLETED') AS was_completed,
        BOOL_OR(event_type = 'REDISPATCHED') AS was_redispatched

      FROM helper_events
      WHERE helper_id = $1
        AND offer_id IS NOT NULL
      GROUP BY offer_id
    )
    SELECT
      COUNT(*) FILTER (
        WHERE was_offered
      )::int AS total_offers,

      COUNT(*) FILTER (
        WHERE was_offered
          AND (was_accepted OR was_passed OR was_timed_out)
      )::int AS resolved_offers,

      COUNT(*) FILTER (
        WHERE was_offered
          AND (was_accepted OR was_passed)
          AND NOT was_timed_out
      )::int AS responded_offers,

      COUNT(*) FILTER (
        WHERE was_offered AND was_accepted
      )::int AS accepted_offers,

      COUNT(*) FILTER (
        WHERE was_offered
          AND was_accepted
          AND was_completed
      )::int AS completed_offers,

      COUNT(*) FILTER (
        WHERE was_offered AND was_timed_out
      )::int AS timed_out_offers,

      COUNT(*) FILTER (
        WHERE was_offered AND was_redispatched
      )::int AS redispatched_offers,

      COUNT(*) FILTER (
        WHERE was_offered
          AND NOT was_accepted
          AND NOT was_passed
          AND NOT was_timed_out
      )::int AS unresolved_offers,

      COUNT(*) FILTER (
        WHERE was_completed AND NOT was_accepted
      )::int AS invalid_completions,

      COUNT(*) FILTER (
        WHERE was_offered
          AND was_timed_out
          AND (was_accepted OR was_passed)
      )::int AS conflicting_responses

    FROM offers
    `,
    [helperId]
  );

  const stats = result.rows[0];

  // Exclude conflicting response records until reviewed.
  const validResolvedOffers =
    stats.resolved_offers - stats.conflicting_responses;

  const validRespondedOffers = stats.responded_offers;

  const validAcceptedOffers =
    stats.accepted_offers - stats.conflicting_responses;

  // Only count completions associated with accepted offers,
  // excluding conflicting response records.
  const validCompletedOffers = Math.max(
    0,
    stats.completed_offers - stats.conflicting_responses
  );

  const responseScore =
    (validRespondedOffers * 100 +
      PRIOR_SAMPLE_SIZE * DEFAULT_RELIABILITY) /
    (validResolvedOffers + PRIOR_SAMPLE_SIZE);

  const completionScore =
    (validCompletedOffers * 100 +
      PRIOR_SAMPLE_SIZE * DEFAULT_RELIABILITY) /
    (validAcceptedOffers + PRIOR_SAMPLE_SIZE);

  const reliabilityScore =
    RESPONSE_WEIGHT * responseScore +
    COMPLETION_WEIGHT * completionScore;

  return {
    helperId: Number(helperId),
    reliabilityScore: roundScore(reliabilityScore),
    responseScore: roundScore(responseScore),
    completionScore: roundScore(completionScore),
    stats: {
      totalOffers: stats.total_offers,
      resolvedOffers: validResolvedOffers,
      respondedOffers: validRespondedOffers,
      acceptedOffers: validAcceptedOffers,
      completedOffers: validCompletedOffers,
      timedOutOffers: stats.timed_out_offers,
      redispatchedOffers: stats.redispatched_offers,
      unresolvedOffers: stats.unresolved_offers,
      invalidCompletions: stats.invalid_completions,
      conflictingResponses: stats.conflicting_responses
    }
  };
}

export { calculateReliabilityScore };
