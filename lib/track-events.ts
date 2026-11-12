/** События воронки (общие для клиента и /api/track). */
export const TRACK_EVENTS = [
  "landing_view", "quiz_start", "quiz_block_done", "quiz_complete", "results_view", "mode_switch", "profession_open",
  "university_open", "event_click", "plan_add", "compare_open", "report_download", "report_share", "feedback",
  // v3
  "chapter_open", "vibe_test_start", "vibe_test_complete", "vibe_card_share", "favorite_add", "plan_step_done", "internship_open", "story_submit",
] as const;
export type TrackEvent = (typeof TRACK_EVENTS)[number];
