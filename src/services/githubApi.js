import tasksData from '@/data/tasks.json';

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const ORG_NAME = import.meta.env.VITE_GITHUB_ORG || "classroom-programacion-web";

const headers = {
  Accept: "application/vnd.github.v3+json",
  ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
};

/**
 * Fetch the file tree of the default branch recursively.
 */
export async function getRepoTree(repoName, branch = "main") {
  try {
    const res = await fetch(`https://api.github.com/repos/${ORG_NAME}/${repoName}/git/trees/${branch}?recursive=1`, { headers });
    if (!res.ok) throw new Error("Could not fetch tree");
    const data = await res.json();
    return data.tree || [];
  } catch (error) {
    console.error(`Error fetching tree for ${repoName}:`, error);
    return [];
  }
}

/**
 * Fetch file content given a blob url from the tree.
 */
export async function getFileContent(blobUrl) {
  try {
    const res = await fetch(blobUrl, { headers });
    if (!res.ok) throw new Error("Could not fetch blob");
    const data = await res.json();
    // GitHub API returns base64 content for blobs
    return atob(data.content);
  } catch (error) {
    console.error("Error fetching file content:", error);
    return "";
  }
}

/**
 * We fetch all commits once to evaluate deadlines locally
 */
export async function getRepoCommits(repoName) {
  try {
    const res = await fetch(`https://api.github.com/repos/${ORG_NAME}/${repoName}/commits?per_page=100`, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

function getTaskDeliveryStatus(commits, deadlineStr) {
  if (!commits.length) return { status: "missing", date: null };
  const deadline = new Date(deadlineStr);
  
  // commits are ordered latest first. Find the first commit that is ON OR BEFORE the deadline.
  const onTimeCommit = commits.find(c => new Date(c.commit.committer.date) <= deadline);
  
  if (onTimeCommit) {
    return { status: "on_time", date: new Date(onTimeCommit.commit.committer.date) };
  }
  
  // All commits are AFTER the deadline -> late
  return { status: "late", date: new Date(commits[0].commit.committer.date) };
}

export async function evaluateStudentTasks(repoName) {
  const result = {
    tasks: {}, // Evaluated tasks
    totalScore: 0,
    sprintScores: {},
    error: false,
  };

  try {
    const commits = await getRepoCommits(repoName);
    const tree = await getRepoTree(repoName);
    
    if (!tree.length) {
      result.error = true;
      return result;
    }

    // Pre-fetch all html/js files to avoid multiple network calls per task
    const codeFiles = tree.filter(file => 
      file.path.endsWith('.html') || file.path.endsWith('.js')
    );
    
    const fileContents = [];
    for (const file of codeFiles) {
      const content = await getFileContent(file.url);
      fileContents.push({ path: file.path, content: content.toLowerCase() });
    }

    for (const task of tasksData) {
      let taskScore = 0;
      let completed = false;
      const delivery = getTaskDeliveryStatus(commits, task.deadline);
      
      let maxScoreForTask = delivery.status === "on_time" ? task.maxScore : 
                            delivery.status === "late" ? task.maxScore * 0.8 : 0; // 80% if late

      if (delivery.status !== "missing") {
        if (task.evaluation.strategy === "keyword") {
          let totalMatches = 0;
          for (const keyword of task.evaluation.keywords) {
            const found = fileContents.some(f => f.content.includes(keyword.toLowerCase()));
            if (found) totalMatches++;
          }
          
          if (totalMatches >= task.evaluation.matchCount) {
            completed = true;
            taskScore = maxScoreForTask;
          }
        } 
        else if (task.evaluation.strategy === "custom_form_buttons") {
          // Backward compatibility for Tarea 2 Sprint 1
          let hasForm = false;
          let maxButtons = 0;
          
          for (const f of fileContents) {
            if (f.content.includes("<form")) hasForm = true;
            const buttonMatches = f.content.match(/<button/g);
            if (buttonMatches && buttonMatches.length > maxButtons) {
               maxButtons = buttonMatches.length;
            }
          }
          
          if (hasForm) {
            if (maxButtons >= 2) {
              completed = true;
              taskScore = maxScoreForTask;
            } else if (maxButtons === 1) {
              completed = true;
              taskScore = maxScoreForTask / 2;
            }
          }
        }
      }

      result.tasks[task.id] = {
        taskInfo: task,
        delivery,
        completed,
        score: taskScore,
      };
      
      if (!result.sprintScores[task.sprint]) result.sprintScores[task.sprint] = 0;
      result.sprintScores[task.sprint] += taskScore;
      result.totalScore += taskScore;
    }

  } catch (error) {
    console.error("Error verifying task:", error);
    result.error = true;
  }

  return result;
}
