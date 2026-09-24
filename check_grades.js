import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "grading-app-dto"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snapshot = await getDocs(collection(db, 'grades'));
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.taskScore !== 50 && data.taskScore !== 100 && data.taskScore !== 0 && data.taskScore !== 80) {
      console.log(data.studentId, data.taskScore);
    }
  });
  console.log("Done");
}
check();
