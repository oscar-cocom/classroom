import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN';
const ORG_NAME = 'classroom-programacion-web';
const DEADLINE = new Date('2026-09-08T23:59:59Z');

const students = JSON.parse(fs.readFileSync('./src/data/students.json', 'utf8'));

const headers = {
  Accept: "application/vnd.github.v3+json",
  Authorization: `Bearer ${GITHUB_TOKEN}`,
};

async function getDeliveryInfo(repoName) {
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

async function getRepoTree(repoName, branch = "main") {
  try {
    const res = await fetch(`https://api.github.com/repos/${ORG_NAME}/${repoName}/git/trees/${branch}?recursive=1`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data.tree || [];
  } catch (error) {
    return [];
  }
}

async function getFileContent(blobUrl) {
  try {
    const res = await fetch(blobUrl, { headers });
    if (!res.ok) return "";
    const data = await res.json();
    return atob(data.content);
  } catch (error) {
    return "";
  }
}

async function runEvaluation() {
  console.log("Evaluando a los 36 alumnos (Imágenes y Formulario)... Esto tomará unos segundos.\n");
  
  let report = "## 🏆 Reporte Final de Tareas (Límite: 8 Sep)\n\n";
  report += "| Alumno | Estado Entrega | Tarea 1 (Imágenes) | Tarea 2 (Formulario) | Total (100) |\n";
  report += "|---|---|---|---|---|\n";

  const results = [];

  for (const student of students) {
    const result = {
      name: student.name,
      delivery: { status: "missing", date: null },
      task1: false,
      task2: false,
      totalScore: 0
    };

    result.delivery = await getDeliveryInfo(student.repoName);
    const tree = await getRepoTree(student.repoName);
    
    if (tree.length > 0) {
      const htmlFiles = tree.filter(file => file.path.endsWith('.html'));
      for (const file of htmlFiles) {
        const content = await getFileContent(file.url);
        const lower = content.toLowerCase();
        
        if (lower.includes("<img")) result.task1 = true;
        if (lower.includes("<form") && lower.includes("<button")) result.task2 = true;
      }
    }

    let maxPerTask = result.delivery.status === "on_time" ? 50 : 
                     result.delivery.status === "late" ? 40 : 0;
                     
    let score1 = result.task1 ? maxPerTask : 0;
    let score2 = result.task2 ? maxPerTask : 0;
    result.totalScore = score1 + score2;
    
    let statusEmoji = result.delivery.status === "on_time" ? "🟢 A tiempo" : result.delivery.status === "late" ? "🟡 Tarde" : "🔴 Faltante";
    let t1Emoji = result.task1 ? "✅ " + score1 : "❌ 0";
    let t2Emoji = result.task2 ? "✅ " + score2 : "❌ 0";

    results.push(result);
    report += `| ${student.name} | ${statusEmoji} | ${t1Emoji} | ${t2Emoji} | **${result.totalScore}** |\n`;
    process.stdout.write("."); // loading indicator
  }
  
  fs.writeFileSync('task_evaluation_report.md', report);
  console.log("\nReporte generado en task_evaluation_report.md");
}

runEvaluation();
