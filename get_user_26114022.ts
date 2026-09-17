import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function check() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  
  snap.forEach(doc => {
      if(doc.data().matricula === '26114022') {
         console.log(doc.data());
      }
  });
}
check().then(() => process.exit(0)).catch(console.error);
