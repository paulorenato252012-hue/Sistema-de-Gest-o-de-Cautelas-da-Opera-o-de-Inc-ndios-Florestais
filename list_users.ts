import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function listUsers() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  for (const userDoc of snap.docs) {
    const data = userDoc.data();
    console.log(`User ${userDoc.id}: ${data.matricula} - ${data.postoGraduacao}`);
  }
}
listUsers().catch(console.error).finally(() => process.exit(0));
