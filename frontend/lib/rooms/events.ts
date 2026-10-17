/**
 * Every broadcast the database triggers emit, in one place.
 *
 * Payloads are deliberately thin — they exist to say "something happened",
 * not to carry state, because a broadcast is identical for every subscriber
 * and is not filtered by row-level security. The one exception is
 * `round_closed`, which is built inside the closing transaction and may carry
 * card values precisely because that is the moment they become readable
 * anyway.
 */
const roomEvents = [
  "vote_cast",
  "vote_cleared",
  "round_closed",
  "round_reopened",
  "participant_joined",
  "participant_left",
  "participant_renamed",
  "issue_updated",
] as const

type RoomEventType = (typeof roomEvents)[number]

type RoomEvent = {
  type: RoomEventType
  /** Straight from `realtime.send` in a trigger, so shape is not guaranteed. */
  payload: Record<string, unknown>
}

export { roomEvents }
export type { RoomEvent, RoomEventType }
