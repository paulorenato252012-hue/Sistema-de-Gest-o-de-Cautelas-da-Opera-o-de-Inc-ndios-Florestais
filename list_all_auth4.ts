import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function check() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  
  for (const doc of snap.docs) {
    const data = doc.data();
    if(data.matricula === '123456') {
        console.log(`User data in firestore:`, data);
    }
  }
}
check().then(() => process.exit(0)).catch(console.error);
