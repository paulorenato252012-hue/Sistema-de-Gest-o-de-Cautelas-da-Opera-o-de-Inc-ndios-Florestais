import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function check() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  snap.forEach(doc => {
    console.log(doc.id, "=>", doc.data().matricula, doc.data().perfil);
  });
}
check().catch(console.error).finally(() => process.exit(0));
