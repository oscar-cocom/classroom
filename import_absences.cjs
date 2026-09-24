const fs = require('fs');
const xlsx = require('xlsx');

// 1. Read Excel
const workbook = xlsx.readFile('/Users/oscarcocomeuan/Documents/clases/dto/Asistencia_Alumnos (1).xlsx');
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

// 2. Read students.json
const students = JSON.parse(fs.readFileSync('./src/data/students.json', 'utf8'));

// Manual overrides for names that fuzzy won't catch
const manualMap = {
  "Geysler An-kin Yam Olvera": "s20",
  "González Echezuría Isaí José": "s3",
  "Zárate Ancona Sinuhé Antonio": "s5",
  "Jorge Armando Hernández Cobuo": "s18",
  "Jose Antonio Canul Chan": "s21",
  "Rodrigo Sanchez Ruiz": "s35",
  "Sergio Silva Cortés": "s4",
  "Hernandez Cocom Joaquin Fernando": "s17",
  "Loria Berrelleza Angel Yahir": "__SKIP__",
  "Aldana Vargas Diego": "__SKIP__",
  "Martinez Cortes Dafne Montserrat": "__SKIP__",
  "Navarrete Escalante Armin": "__SKIP__",
};

// Helper: normalize for fuzzy match (strip accents)
function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
}

function findStudentId(excelName) {
  if (!excelName) return null;
  
  // Check manual map first
  if (manualMap[excelName] === "__SKIP__") return null;
  if (manualMap[excelName]) return manualMap[excelName];
  
  const normalizedExcel = normalize(excelName);
  const nameParts = normalizedExcel.split(' ').filter(p => p.length > 2);
  
  // Try matching at least 2 words
  for (const student of students) {
    const sNorm = normalize(student.name);
    const sNameParts = sNorm.split(' ').filter(p => p.length > 2);
    let matchCount = 0;
    for (const part of nameParts) {
      if (sNameParts.some(sp => sp === part || part.includes(sp) || sp.includes(part))) matchCount++;
    }
    if (matchCount >= 2) return student.id;
  }
  
  // Fallback: 1 unique word match (must be 4+ chars)
  for (const student of students) {
    const sNorm = normalize(student.name);
    const sNameParts = sNorm.split(' ').filter(p => p.length > 3);
    for (const part of nameParts) {
      if (part.length > 3 && sNameParts.includes(part)) return student.id;
    }
  }
  return null;
}

// Count absences per student
const absenceCounts = {};
let unmatchedNames = [];

for (const row of data) {
  const name = row['__EMPTY'];
  if (!name || name === 'Nombre del Alumno') continue;
  
  const studentId = findStudentId(name);
  if (!studentId) {
    unmatchedNames.push(name);
    continue;
  }
  
  let dots = 0;
  // Check all columns for dots
  for (const key of Object.keys(row)) {
    if (key.startsWith('__EMPTY_') && row[key] === '.') {
      dots++;
    }
  }
  
  absenceCounts[studentId] = dots;
  console.log(`${name} => ${studentId} => ${dots} faltas`);
}

if (unmatchedNames.length > 0) {
  console.log("\n--- NO MATCH ---");
  unmatchedNames.forEach(n => console.log("  ", n));
}

// Now generate Firestore requests to SET the correct absence count
// We need to delete old data and re-create with the real data from the Excel
let requests = [];

for (const [studentId, count] of Object.entries(absenceCounts)) {
  for (let i = 0; i < count; i++) {
    const day = (i + 1).toString().padStart(2, '0');
    const dateStr = `2026-09-${day}`;
    const docId = `${dateStr}_${studentId}`;
    requests.push({
      docId,
      body: {
        fields: {
          date: { stringValue: dateStr },
          studentId: { stringValue: studentId },
          isPresent: { booleanValue: false }
        }
      }
    });
  }
}

console.log(`\nTotal absences to import: ${requests.length}`);
fs.writeFileSync('firestore_import.json', JSON.stringify(requests, null, 2));

// Generate bash script
let bashScript = `#!/bin/bash\n\n`;
for (const req of requests) {
  bashScript += `curl -s -X PATCH -H "Content-Type: application/json" -d '${JSON.stringify(req.body)}' "https://firestore.googleapis.com/v1/projects/classroom-grading-app-2026/databases/(default)/documents/attendance/${req.docId}"\n`;
}
fs.writeFileSync('run_import.sh', bashScript);
fs.chmodSync('run_import.sh', '755');
console.log("Created run_import.sh!");

// Summary
console.log("\n=== SUMMARY ===");
console.log("Students matched:", Object.keys(absenceCounts).length);
console.log("Students unmatched:", unmatchedNames.length);
console.log("Absence counts:");
for (const [id, count] of Object.entries(absenceCounts)) {
  const student = students.find(s => s.id === id);
  console.log(`  ${student?.name || id}: ${count} faltas`);
}
