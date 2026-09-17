import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function getU() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Mat: ${data.matricula} | Email: ${data.email} | Perfil: ${data.perfil}`);
  });
}
getU().then(() => process.exit(0)).catch(console.error);
