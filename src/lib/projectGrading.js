// Project rubric reviewed at each sprint demo. It is feedback for the team and a
// guide for each student's expo score; it does not add points by itself.
export const RUBRIC_ITEMS = [
  { id: "func", label: "Funcionalidades terminadas", points: 4 },
  { id: "demo", label: "Demo funciona en vivo sin errores", points: 2 },
  { id: "repo", label: "Repo con commits de todos", points: 2 },
  { id: "scrum", label: "Tablero Scrum al día", points: 1 },
  { id: "po", label: "Presentación clara del PO", points: 1 },
];

// Sprints whose project is reviewed in a demo
export const PROJECT_SPRINTS = [1, 2, 3];

export function rubricPoints(rubric = {}) {
  return RUBRIC_ITEMS.reduce((sum, item) => sum + (rubric[item.id] ? item.points : 0), 0);
}

/**
 * A student's project grade (0-100), worth 50 sprint points.
 * Only the student's own expo (0-10) counts: each expo point is 5 sprint points,
 * so an 8 in the expo is 40 of 50.
 */
export function projectScore(expo) {
  return Number(expo) * 10;
}
