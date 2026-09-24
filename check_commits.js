import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN';
const ORG_NAME = 'classroom-programacion-web';

const students = JSON.parse(fs.readFileSync('./src/data/students.json', 'utf8'));

const headers = {
  Accept: "application/vnd.github.v3+json",
  Authorization: `Bearer ${GITHUB_TOKEN}`,
};

const DEADLINE = new Date('2026-09-08T23:59:59Z');

async function checkCommits() {
  console.log("# Reporte de Commits de Alumnos (Límite: 8 de Septiembre)\n");
  
  const results = [];

  for (const student of students) {
    try {
      // Fetch commits until deadline
      const resOnTime = await fetch(`https://api.github.com/repos/${ORG_NAME}/${student.repoName}/commits?until=${DEADLINE.toISOString()}&per_page=1`, { headers });
      
      if (!resOnTime.ok) {
        results.push({ name: student.name, status: "Error", dateStr: resOnTime.statusText });
        continue;
      }
      
      const dataOnTime = await resOnTime.json();
      
      if (dataOnTime.length > 0) {
        const commitDate = new Date(dataOnTime[0].commit.committer.date);
        results.push({ 
          name: student.name, 
          status: "A tiempo", 
          dateStr: commitDate.toLocaleDateString('es-MX') + ' ' + commitDate.toLocaleTimeString('es-MX'),
          date: commitDate
        });
      } else {
        // They didn't commit before the deadline. Let's see when their first commit was.
        const resLate = await fetch(`https://api.github.com/repos/${ORG_NAME}/${student.repoName}/commits?since=${DEADLINE.toISOString()}`, { headers });
        const dataLate = await resLate.json();
        
        if (dataLate.length > 0) {
          // The last element is the oldest commit after the deadline
          const commitDate = new Date(dataLate[dataLate.length - 1].commit.committer.date);
          results.push({ 
            name: student.name, 
            status: "Tarde", 
            dateStr: commitDate.toLocaleDateString('es-MX') + ' ' + commitDate.toLocaleTimeString('es-MX'),
            date: commitDate
          });
        } else {
          results.push({ name: student.name, status: "Sin entrega", dateStr: "No hay commits", date: null });
        }
      }
    } catch (error) {
      results.push({ name: student.name, status: "Error", dateStr: error.message, date: null });
    }
  }

  // Sort: A tiempo first, then Tarde, then Sin entrega
  results.sort((a, b) => {
    if (a.status === "A tiempo" && b.status !== "A tiempo") return -1;
    if (a.status !== "A tiempo" && b.status === "A tiempo") return 1;
    if (a.status === "Tarde" && b.status !== "Tarde") return -1;
    if (a.status !== "Tarde" && b.status === "Tarde") return 1;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date - b.date;
  });

  let markdown = `## 📊 Reporte de Entregas (Límite: 8 de Septiembre)\n\n| Alumno | Fecha de Entrega | Estado |\n|---|---|---|\n`;
  
  for (const r of results) {
    let icon = "🔴";
    if (r.status === "A tiempo") icon = "🟢 A tiempo";
    if (r.status === "Tarde") icon = "🟡 Tarde";
    if (r.status === "Sin entrega") icon = "🔴 Sin entrega";
    if (r.status === "Error") icon = "❌ Error";
    
    markdown += `| ${r.name} | ${r.dateStr} | ${icon} |\n`;
  }

  fs.writeFileSync('commits_report.md', markdown);
  console.log("Reporte generado en commits_report.md");
}

checkCommits();
