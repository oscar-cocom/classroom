import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

// References
const STUDENTS_COL = collection(db, 'students');
const GRADES_COL = collection(db, 'grades');
const ATTENDANCE_COL = collection(db, 'attendance');
const TASKS_COL = collection(db, 'tasks');
const FOLLOWUPS_COL = collection(db, 'followups');

import tasksData from '@/data/tasks.json';

/**
 * TASKS
 */
export async function getTasks() {
  if (!db) return [];
  const snapshot = await getDocs(TASKS_COL);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveTask(taskData) {
  if (!db) return;
  const docRef = doc(TASKS_COL, taskData.id);
  await setDoc(docRef, taskData, { merge: true });
}

export async function deleteTask(id) {
  if (!db) return;
  const docRef = doc(TASKS_COL, id);
  await deleteDoc(docRef);
}

export async function migrateTasksToFirestore() {
  if (!db) return;
  const existingTasks = await getTasks();
  if (existingTasks.length === 0) {
    console.log("Migrating tasks.json to Firestore...");
    for (const t of tasksData) {
      await saveTask(t);
    }
    console.log("Tasks migrated successfully.");
  }
}

/**
 * MIGRATION HELPER:
 * In a real scenario, the teacher would seed this from the JSON.
 * We provide a function to save a student document.
 */
export async function saveStudent(studentData) {
  if (!db) throw new Error("Firestore not initialized");
  const docRef = doc(STUDENTS_COL, studentData.id);
  await setDoc(docRef, studentData, { merge: true });
}

export async function getStudents() {
  if (!db) return [];
  const snapshot = await getDocs(STUDENTS_COL);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * ATTENDANCE
 */
export async function saveAttendance(dateStr, studentId, isPresent, justified = false) {
  if (!db) return;
  // Use a composite ID: date_studentId
  const id = `${dateStr}_${studentId}`;
  await setDoc(doc(ATTENDANCE_COL, id), {
    date: dateStr,
    studentId,
    isPresent,
    // An absence with a justificante: recorded, but it doesn't count
    justified: !isPresent && justified
  });
}

export async function getAllAttendanceRecords() {
  if (!db) return [];
  const snapshot = await getDocs(ATTENDANCE_COL);
  return snapshot.docs.map(d => d.data());
}

export async function getAttendanceByDate(dateStr) {
  if (!db) return [];
  const snapshot = await getDocs(ATTENDANCE_COL);
  // Manual filter since we don't have complex queries set up yet (in prod we'd use query(where()))
  return snapshot.docs
    .map(d => d.data())
    .filter(a => a.date === dateStr);
}

export async function getStudentAttendance(studentId) {
  if (!db) return [];
  // Filtered in the query: the security rules only let a student list their own records
  const snapshot = await getDocs(query(ATTENDANCE_COL, where('studentId', '==', studentId)));
  return snapshot.docs.map(d => d.data());
}

/**
 * GRADES
 */
export async function saveParticipationGrade(studentId, sprint, score) {
  if (!db) return;
  const id = `${studentId}_${sprint.replace(/\s+/g, '')}`;
  await setDoc(doc(GRADES_COL, id), {
    studentId,
    sprint,
    participationScore: score
  }, { merge: true });
}

export async function saveTaskGrade(studentId, sprint, score) {
  if (!db) return;
  const id = `${studentId}_${sprint.replace(/\s+/g, '')}`;
  await setDoc(doc(GRADES_COL, id), {
    studentId,
    sprint,
    taskScore: score
  }, { merge: true });
}

export async function saveStudentGrades(studentId, sprint, gradesData) {
  if (!db) return;
  const id = `${studentId}_${sprint.replace(/\s+/g, '')}`;
  await setDoc(doc(GRADES_COL, id), {
    studentId,
    sprint,
    ...gradesData
  }, { merge: true });
}

export async function getStudentGrades(studentId, sprint) {
  if (!db) return null;
  const id = `${studentId}_${sprint.replace(/\s+/g, '')}`;
  try {
    const docSnap = await getDoc(doc(GRADES_COL, id));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    // A student reading a sprint that has no grades yet gets permission-denied
    if (err.code === 'permission-denied') return null;
    throw err;
  }
}

export async function getAllGrades() {
  if (!db) return [];
  const snapshot = await getDocs(GRADES_COL);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * FOLLOW-UPS: teacher notes on students to talk to (no repo, no work pushed...)
 * One document per student: { studentId, status, note, reason, manual, updatedAt }
 */
export async function getFollowUps() {
  if (!db) return [];
  const snapshot = await getDocs(FOLLOWUPS_COL);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveFollowUp(studentId, data) {
  if (!db) return;
  await setDoc(doc(FOLLOWUPS_COL, studentId), {
    studentId,
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function deleteFollowUp(studentId) {
  if (!db) return;
  await deleteDoc(doc(FOLLOWUPS_COL, studentId));
}

/**
 * TEAM EVALUATIONS: project rubric and individual expo scores, per team and sprint.
 * One document per team: { sprints: { "1": { rubric: { func: true, ... }, students: { s1: 8 }, updatedAt } } }
 * Returns { [sprint]: { rubric, students, updatedAt } }.
 */
function evaluationBySprint(data) {
  const sprints = { ...data.sprints };
  // Evaluations saved before sprints existed were all Sprint 1
  if (!sprints[1] && (data.rubric || data.students)) {
    sprints[1] = { rubric: data.rubric || {}, students: data.students || {}, updatedAt: data.updatedAt };
  }
  return sprints;
}

export async function getTeamEvaluation(teamId) {
  if (!db) return {};
  const docSnap = await getDoc(doc(db, 'evaluations', teamId));
  return docSnap.exists() ? evaluationBySprint(docSnap.data()) : {};
}

// { [teamId]: { [sprint]: { rubric, students, published, updatedAt } } }
export async function getAllTeamEvaluations() {
  if (!db) return {};
  const snapshot = await getDocs(collection(db, 'evaluations'));
  return Object.fromEntries(snapshot.docs.map(d => [d.id, evaluationBySprint(d.data())]));
}

export async function saveTeamEvaluation(teamId, sprint, { rubric, students, published = false }) {
  if (!db) return;
  await setDoc(doc(db, 'evaluations', teamId), {
    sprints: { [sprint]: { rubric, students, published, updatedAt: new Date().toISOString() } }
  }, { merge: true });
}

/**
 * PUBLIC SHOWCASE: which teams already presented each sprint's demo, for the
 * public landing page. Holds no names or grades; anyone can read it, only the
 * teacher writes it (see firestore.rules).
 * Document public/showcase: { teams: { amazon: { "1": true } } }
 */
export async function getShowcase() {
  if (!db) return {};
  const docSnap = await getDoc(doc(db, 'public', 'showcase'));
  return docSnap.exists() ? docSnap.data().teams || {} : {};
}

export async function setTeamDemoPublished(teamId, sprint, published) {
  if (!db) return;
  await setDoc(doc(db, 'public', 'showcase'), {
    teams: { [teamId]: { [sprint]: published } },
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
