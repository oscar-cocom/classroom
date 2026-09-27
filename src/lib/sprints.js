// First class day whose attendance counts toward each sprint. An absence belongs
// to the latest sprint that started on or before its date, so absences from a
// previous sprint never add up in the next one.
export const SPRINT_ATTENDANCE_START = {
  1: '2026-08-31',
  2: '2026-09-23',
};

export function sprintOfDate(dateStr) {
  let sprint = 1;
  for (const [n, start] of Object.entries(SPRINT_ATTENDANCE_START)) {
    if (dateStr >= start && Number(n) > sprint) sprint = Number(n);
  }
  return sprint;
}

// Participation (0-100) from a sprint's absences: 0-1 → 100, 2 → 50, 3+ → 0
export function participationFromAbsences(absences) {
  if (absences <= 1) return 100;
  if (absences === 2) return 50;
  return 0;
}
