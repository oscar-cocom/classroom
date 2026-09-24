const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const ORG_NAME = import.meta.env.VITE_GITHUB_ORG || "classroom-programacion-web";

const headers = {
  Accept: "application/vnd.github.v3+json",
  ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
};

/**
 * Fetch the latest commit time for a specific repository.
 */
export async function getLatestCommitTime(repoName) {
  try {
    const res = await fetch(`https://api.github.com/repos/${ORG_NAME}/${repoName}/commits?per_page=1`, { headers });
    if (!res.ok) throw new Error("Repo not found or no access");
    const data = await res.json();
    if (data.length > 0) {
      return data[0].commit.committer.date;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching commits for ${repoName}:`, error);
    return null;
  }
}

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

const DEADLINE = new Date('2026-09-08T23:59:59Z');

export async function getDeliveryInfo(repoName) {
  try {
    const resOnTime = await fetch(`https://api.github.com/repos/${ORG_NAME}/${repoName}/commits?until=${DEADLINE.toISOString()}&per_page=1`, { headers });
    if (!resOnTime.ok) return { status: "missing", date: null };
    const dataOnTime = await resOnTime.json();
    
    if (dataOnTime.length > 0) {
      return { status: "on_time", date: new Date(dataOnTime[0].commit.committer.date) };
    }
    
    const resLate = await fetch(`https://api.github.com/repos/${ORG_NAME}/${repoName}/commits?since=${DEADLINE.toISOString()}`, { headers });
    const dataLate = await resLate.json();
    
    if (dataLate.length > 0) {
      return { status: "late", date: new Date(dataLate[dataLate.length - 1].commit.committer.date) };
    }
    
    return { status: "missing", date: null };
  } catch (err) {
    return { status: "error", date: null };
  }
}

export async function evaluateStudentTasks(repoName) {
  const result = {
    delivery: { status: "missing", date: null },
    task1: { completed: false, score: 0 },
    task2: { status: "missing", score: 0 },
    totalScore: 0,
    error: false,
  };

  try {
    result.delivery = await getDeliveryInfo(repoName);
    const tree = await getRepoTree(repoName);
    
    if (!tree.length) {
      result.error = true;
      return result;
    }

    const htmlFiles = tree.filter(file => file.path.endsWith('.html'));

    for (const file of htmlFiles) {
      const content = await getFileContent(file.url);
      const lower = content.toLowerCase();
      
      if (lower.includes("<img")) result.task1.completed = true;
      
      const buttonMatches = lower.match(/<button/g);
      const buttonCount = buttonMatches ? buttonMatches.length : 0;
      
      if (lower.includes("<form")) {
        if (buttonCount >= 2) {
          result.task2.status = "complete";
        } else if (buttonCount === 1) {
          // Si ya estaba en complete por otro archivo, no lo bajamos a partial
          if (result.task2.status !== "complete") {
             result.task2.status = "partial";
          }
        }
      }
    }

    let maxPerTask = result.delivery.status === "on_time" ? 50 : 
                     result.delivery.status === "late" ? 40 : 0;
                     
    if (result.task1.completed) result.task1.score = maxPerTask;
    
    if (result.task2.status === "complete") {
      result.task2.score = maxPerTask;
    } else if (result.task2.status === "partial") {
      result.task2.score = maxPerTask / 2;
    }
    
    result.totalScore = result.task1.score + result.task2.score;

  } catch (error) {
    console.error("Error verifying task:", error);
    result.error = true;
  }

  return result;
}
