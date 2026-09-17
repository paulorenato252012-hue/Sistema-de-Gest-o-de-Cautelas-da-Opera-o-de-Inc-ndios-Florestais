import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, initializeFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function run() {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  for (const userDoc of snap.docs) {
    const data = userDoc.data();
    if (data.email && data.email.includes('@dpa.internal')) {
      const newEmail = data.email.replace('@dpa.internal', '@cbmms.internal');
      await updateDoc(doc(db, 'users', userDoc.id), { email: newEmail });
      console.log(`Updated user ${userDoc.id}: ${newEmail}`);
    } else if (!data.email) {
       const newEmail = `${data.matricula}@cbmms.internal`;
       await updateDoc(doc(db, 'users', userDoc.id), { email: newEmail });
       console.log(`Set email for ${userDoc.id}: ${newEmail}`);
    }
  }
}
run().then(() => process.exit(0)).catch(console.error);
