import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, initializeFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function fixDez() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  let count = 0;
  for (const userDoc of snap.docs) {
    const data = userDoc.data();
    if (data.postoGraduacao && data.postoGraduacao.includes('DEZ')) {
      const newPosto = data.postoGraduacao.replace(/DEZ/g, 'TEN').replace(/BN/g, 'BM');
      await updateDoc(doc(db, 'users', userDoc.id), {
        postoGraduacao: newPosto
      });
      console.log(`Updated user ${userDoc.id}: ${data.postoGraduacao} -> ${newPosto}`);
      count++;
    }
  }
  console.log(`Updated ${count} users.`);
}
fixDez().catch(console.error).finally(() => process.exit(0));
