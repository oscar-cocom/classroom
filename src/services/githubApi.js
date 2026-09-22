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

/**
 * Check if the student's task 1 is complete.
 * Rules: Must have an image (<img>) and a button (<button>).
 */
export async function verifyTaskOne(repoName) {
  const result = {
    hasImage: false,
    hasButton: false,
    checked: false,
    error: false,
  };

  try {
    const tree = await getRepoTree(repoName);
    if (!tree.length) {
      result.error = true;
      return result;
    }

    // Look for HTML files
    const htmlFiles = tree.filter(file => file.path.endsWith('.html'));

    for (const file of htmlFiles) {
      const content = await getFileContent(file.url);
      if (content.toLowerCase().includes("<img")) {
        result.hasImage = true;
      }
      if (content.toLowerCase().includes("<button")) {
        result.hasButton = true;
      }

      // If we found both, no need to keep checking other HTML files
      if (result.hasImage && result.hasButton) {
        break;
      }
    }
    
    result.checked = true;
  } catch (error) {
    console.error("Error verifying task:", error);
    result.error = true;
  }

  return result;
}
