import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function check() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  
  for (const doc of snap.docs) {
    const data = doc.data();
    const emails = [`${data.matricula}@cbmms.internal`, `${data.matricula}@dpa.internal`];
    for(const e of emails) {
       try {
         const m = await fetchSignInMethodsForEmail(auth, e);
         if (m.length > 0) console.log(`AUTH EXISTS: ${e}`);
       } catch(err) {}
    }
  }
}
check().then(() => process.exit(0)).catch(console.error);
