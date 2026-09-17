import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function check() {
  const cRef = collection(db, 'users');
  const snap = await getDocs(cRef);
  console.log(`Found ${snap.size} users.`);
}
check().then(() => process.exit(0));
