
import { db } from "./db.js";

const VALID_EVENTS = new Set([
  "OFFER_SENT",
  "ACCEPTED",
  "PASSED",
  "TIMED_OUT",
  "COMPLETED",
  "REDISPATCHED",
  "CANCELLED",
  "DEACTIVATED"
]);

async function logHelperEvent({
  helperId,
  postId,
  offerId = null,
  eventType
}) {
  if (!VALID_EVENTS.has(eventType)) {
    throw new Error(`Invalid helper event: ${eventType}`);
  }

  if (!helperId || !postId) {
    throw new Error("helperId and postId are required");
  }

  const result = await db.query(
    `
      INSERT INTO helper_events
        (helper_id, post_id, offer_id, event_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      RETURNING id
    `,
    [
      helperId,
      String(postId),
      offerId,
      eventType
    ]
  );

  return result.rows[0] || null;
}

export { logHelperEvent };
