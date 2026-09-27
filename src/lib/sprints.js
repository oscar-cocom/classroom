// First class day whose attendance counts toward each sprint. An absence belongs
// to the latest sprint that started on or before its date, so absences from a
// previous sprint never add up in the next one.
export const SPRINT_ATTENDANCE_START = {
  1: '2026-08-31',
  2: '2026-09-23',
};

// Sprint points: tasks 40 + project 50 + attendance 5 + participation 5 = 100
export const MAX_ATTENDANCE = 5;
export const DEFAULT_PARTICIPATION = 5;

// Unexcused absences in a sprint that send it to recovery instead of an ordinary grade
export const RECOVERY_ABSENCES = 4;
export const RECOVERY_DATES = '14–16 dic';

export function sprintOfDate(dateStr) {
  let sprint = 1;
  for (const [n, start] of Object.entries(SPRINT_ATTENDANCE_START)) {
    if (dateStr >= start && Number(n) > sprint) sprint = Number(n);
  }
  return sprint;
}

// Excused absences (justificante) are recorded but never counted
export function isUnexcusedAbsence(record) {
  return !record.isPresent && !record.justified;
}

// Attendance points (0-5) from a sprint's unexcused absences: 0-1 → 5, 2 → 2.5, 3+ → 0
export function attendancePoints(absences) {
  if (absences <= 1) return MAX_ATTENDANCE;
  if (absences === 2) return MAX_ATTENDANCE / 2;
  return 0;
}

// YYYY-MM-DD in local time (toISOString() would give tomorrow's date after 7 pm in Cancún)
export function localDateString(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Deadlines are Cancún time (UTC-5, no daylight saving), whatever the browser's timezone.
// These convert between an ISO timestamp and a <input type="datetime-local"> value.
const CANCUN_OFFSET_MS = 5 * 60 * 60 * 1000;

export function toCancunInputValue(isoString) {
  return new Date(new Date(isoString).getTime() - CANCUN_OFFSET_MS).toISOString().substring(0, 16);
}

// "2026-10-01T23:59" → the last second of that minute in Cancún, as ISO
export function fromCancunInputValue(value) {
  return new Date(`${value}:59-05:00`).toISOString();
}
