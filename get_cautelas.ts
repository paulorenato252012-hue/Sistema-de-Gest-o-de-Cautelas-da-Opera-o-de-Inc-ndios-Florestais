import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function getC() {
  const cRef = collection(db, 'cautions');
  const snap = await getDocs(cRef);
  console.log(`Found ${snap.size} cautions.`);
  let i = 0;
  snap.forEach(doc => {
    if (i < 3) {
      console.log(`Caution ID: ${doc.id} | User: ${doc.data().userId} | Admin: ${doc.data().adminId}`);
    }
    i++;
  });
}
getC().then(() => process.exit(0)).catch(console.error);
