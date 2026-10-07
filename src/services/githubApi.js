import { auth } from '@/lib/firebase';

const ORG_NAME = import.meta.env.VITE_GITHUB_ORG || "classroom-programacion-web";
const TEMPLATE_REPO = "tareas-template";
// Commits by these accounts are not student work
const NON_STUDENT_LOGINS = ["oscar-cocom", "github-classroom[bot]"];

/**
 * Single entry point for GitHub reads. Returns parsed JSON, or null on 404.
 * Goes through api/github.js, which keeps the token on the server and checks
 * the caller's Firebase login.
 */
async function githubGet(path) {
  const idToken = await auth?.currentUser?.getIdToken();
  const res = await fetch(`/api/github?path=${encodeURIComponent(path)}`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return res.json();
}

/**
 * Recursive file tree at a branch or commit sha.
 */
export async function getRepoTree(repoName, ref = "main") {
  const data = await githubGet(`repos/${ORG_NAME}/${repoName}/git/trees/${ref}?recursive=1`);
  return data?.tree || [];
}

/**
 * Commits (newest first), or null when the repo does not exist.
 */
export async function getRepoCommits(repoName, params = "") {
  return githubGet(`repos/${ORG_NAME}/${repoName}/commits?per_page=100${params}`);
}

// Blob contents never change for a given sha, so cache them for the session
const blobCache = new Map();
function getBlobText(repoName, sha) {
  if (!blobCache.has(sha)) {
    blobCache.set(sha, githubGet(`repos/${ORG_NAME}/${repoName}/git/blobs/${sha}`).then(data => {
      if (!data?.content) return "";
      const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes).toLowerCase();
    }));
  }
  return blobCache.get(sha);
}

const isCodeFile = path => path.endsWith(".html") || path.endsWith(".js");

// Sprint 2+ work lives in a `sprint-N/` folder; Sprint 1 work is anywhere else.
// Keeps e.g. an <img> added to a sprint-2 card from counting as a Sprint 1 task.
function isInSprintFolder(path, sprint) {
  const folder = path.match(/^sprint-(\d+)\//i);
  return folder ? Number(folder[1]) === sprint : sprint === 1;
}

/**
 * Template code files keyed by path: { sha, content }. Loaded once per session.
 * Lets us ignore what every student got for free from the template
 * (empty <img> tags, instructions in comments, CSS).
 */
let templatePromise = null;
function getTemplateFiles() {
  if (!templatePromise) {
    templatePromise = (async () => {
      const tree = await getRepoTree(TEMPLATE_REPO);
      const files = new Map();
      for (const f of tree.filter(f => f.type === "blob" && isCodeFile(f.path))) {
        files.set(f.path, { sha: f.sha, content: await getBlobText(TEMPLATE_REPO, f.sha) });
      }
      return files;
    })().catch(err => {
      templatePromise = null;
      throw err;
    });
  }
  return templatePromise;
}

function isStudentCommit(commit) {
  const login = commit.author?.login || commit.committer?.login;
  if (login && NON_STUDENT_LOGINS.includes(login.toLowerCase())) return false;
  if (/oscar\s*cocom/i.test(commit.commit.author.name)) return false;
  return true;
}

const commitDate = c => new Date(c.commit.committer.date);
const countOf = (text, needle) => text.split(needle).length - 1;

/**
 * Code files of a snapshot that differ from the template, each with the
 * template's version of the same path for comparison.
 */
async function getStudentFiles(repoName, ref, templateFiles) {
  const tree = await getRepoTree(repoName, ref);
  const files = [];
  for (const f of tree.filter(f => f.type === "blob" && isCodeFile(f.path))) {
    const template = templateFiles.get(f.path);
    if (template?.sha === f.sha) continue;
    files.push({
      path: f.path,
      content: await getBlobText(repoName, f.sha),
      templateContent: template?.content || "",
    });
  }
  return files;
}

/**
 * Lines containing `needle` that the student wrote or changed, i.e. not present
 * verbatim in the template's version of the file. Filling in a template's
 * `<img src="">` counts; leaving it untouched, or an instruction comment, does not.
 */
function addedCount(file, needle) {
  const templateLines = new Map();
  for (const line of file.templateContent.split("\n")) {
    if (line.includes(needle)) templateLines.set(line.trim(), (templateLines.get(line.trim()) || 0) + 1);
  }
  let added = 0;
  for (const line of file.content.split("\n")) {
    if (!line.includes(needle)) continue;
    const left = templateLines.get(line.trim()) || 0;
    if (left > 0) templateLines.set(line.trim(), left - 1);
    else added += countOf(line, needle);
  }
  return added;
}

const inFolder = (path, folder) => path.toLowerCase().startsWith(folder.toLowerCase());

/**
 * Checks one task against a snapshot.
 * A task with `evaluation.folder` only looks inside that folder, and the other
 * tasks skip it, so e.g. an object written for Task 3 never counts as Task 1.
 * Returns { ratio: share of the task's points (0..1), files: paths that satisfied it }.
 */
function checkTask(task, allFiles, taskFolders = []) {
  const folder = task.evaluation?.folder;
  const files = allFiles.filter(f => isInSprintFolder(f.path, Number(task.sprint))
    && (folder ? inFolder(f.path, folder) : !taskFolders.some(tf => inFolder(f.path, tf))));
  if (task.evaluation?.strategy === "custom_form_buttons") {
    const best = files
      .filter(f => addedCount(f, "<form") > 0)
      .map(f => ({ path: f.path, buttons: countOf(f.content, "<button") }))
      .sort((a, b) => b.buttons - a.buttons)[0];
    if (!best || best.buttons === 0) return { ratio: 0, files: [] };
    return { ratio: best.buttons >= 2 ? 1 : 0.5, files: [best.path] };
  }

  // Matched exactly as typed: "MAYORIA_DE_EDAD" or "esMayorDeEdad" must keep their capitals
  const keywords = task.evaluation?.keywords || [];
  const matchCount = Number(task.evaluation?.matchCount) || 1;
  const matchedFiles = new Set();
  let matches = 0;
  for (const keyword of keywords) {
    const hits = files.filter(f => addedCount(f, keyword) > 0);
    if (hits.length) {
      matches++;
      hits.forEach(f => matchedFiles.add(f.path));
    }
  }
  return matches >= matchCount ? { ratio: 1, files: [...matchedFiles] } : { ratio: 0, files: [] };
}

/**
 * Date of the student commit that delivered the task: the last one touching the
 * matched files up to the deadline, or the first one after it when late.
 */
async function findDeliveryDate(repoName, paths, deadline, late, templateCopySha) {
  const range = late ? `&since=${deadline.toISOString()}` : `&until=${deadline.toISOString()}`;
  const dates = [];
  for (const path of paths) {
    const commits = (await getRepoCommits(repoName, `&path=${encodeURIComponent(path)}${range}`)) || [];
    const own = commits.filter(c => isStudentCommit(c) && c.sha !== templateCopySha);
    const pick = late ? own[own.length - 1] : own[0];
    if (pick) dates.push(commitDate(pick));
  }
  if (!dates.length) return null;
  return new Date(late ? Math.min(...dates) : Math.max(...dates));
}

/**
 * Evaluates a student's task repo.
 *
 * Delivery status per task:
 *  - on_time:    met by the code as it was at the deadline
 *  - late:       met only thanks to commits after the deadline (80% of the points)
 *  - incomplete: the student pushed work, but it does not meet the requirement
 *  - missing:    no student commits at all (only the template)
 * `repoMissing` is true when the repo does not exist in the org.
 */
export async function evaluateStudentTasks(repoName, tasksList = []) {
  const result = {
    tasks: {},
    totalScore: 0,
    sprintScores: {},
    repoMissing: false,
    studentCommits: 0,
    lastStudentCommit: null,
    error: false,
  };

  try {
    const commits = repoName ? await getRepoCommits(repoName) : null;
    if (!commits) {
      result.repoMissing = true;
      return result;
    }

    // The oldest commit is GitHub Classroom's copy of the template
    const templateCopy = commits[commits.length - 1];
    const studentWork = commits.filter(c => isStudentCommit(c) && c.sha !== templateCopy?.sha);
    result.studentCommits = studentWork.length;
    result.lastStudentCommit = studentWork[0] ? commitDate(studentWork[0]) : null;
    if (!tasksList.length) return result;

    // Folders that belong to a single task (see checkTask)
    const taskFolders = tasksList.map(t => t.evaluation?.folder).filter(Boolean);
    const templateFiles = await getTemplateFiles();
    const snapshots = new Map();
    const filesAt = sha => {
      if (!snapshots.has(sha)) snapshots.set(sha, getStudentFiles(repoName, sha, templateFiles));
      return snapshots.get(sha);
    };

    for (const task of tasksList) {
      const deadline = new Date(task.deadline);
      let delivery = { status: "missing", date: null };
      let check = { ratio: 0 };
      let penalty = 1;

      if (studentWork.length) {
        // Newest first: the first commit at or before the deadline is the code as delivered
        const atDeadline = studentWork.find(c => commitDate(c) <= deadline);
        const onTime = atDeadline ? checkTask(task, await filesAt(atDeadline.sha), taskFolders) : { ratio: 0 };
        // Work pushed after the deadline counts at 80%; keep it only if it beats what was on time
        // (e.g. 1 button on time = 50%, both buttons late = 80%)
        const late = commitDate(studentWork[0]) > deadline
          ? checkTask(task, await filesAt(studentWork[0].sha), taskFolders)
          : { ratio: 0 };

        if (late.ratio * 0.8 > onTime.ratio) {
          check = late;
          penalty = 0.8;
          delivery = { status: "late", date: await findDeliveryDate(repoName, late.files, deadline, true, templateCopy?.sha) };
        } else if (onTime.ratio > 0) {
          check = onTime;
          delivery = { status: "on_time", date: await findDeliveryDate(repoName, onTime.files, deadline, false, templateCopy?.sha) };
        } else {
          delivery = { status: "incomplete", date: null };
        }
      }

      const score = Math.round(task.maxScore * check.ratio * penalty * 10) / 10;
      result.tasks[task.id] = {
        taskInfo: task,
        delivery,
        completed: check.ratio > 0,
        partial: check.ratio > 0 && check.ratio < 1,
        score,
      };
      result.sprintScores[task.sprint] = (result.sprintScores[task.sprint] || 0) + score;
      result.totalScore += score;
    }
  } catch (error) {
    console.error(`Error evaluating ${repoName}:`, error);
    result.error = true;
  }

  return result;
}
