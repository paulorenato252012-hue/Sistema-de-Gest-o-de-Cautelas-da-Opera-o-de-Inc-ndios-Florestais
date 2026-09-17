import { initializeApp } from "firebase/app";
import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const matriculas = [
  "106666021",
  "26200021",
  "456789",
  "81381021",
  "96809021",
  "26114022",
  "123456",
  "23144021",
  "24200021",
  "433036021",
  "15027021",
  "26200021"
];

async function run() {
  for (const mat of matriculas) {
    try {
      const dpa = await fetchSignInMethodsForEmail(auth, `${mat}@dpa.internal`);
      if (dpa.length > 0) console.log(`FOUND in Auth: ${mat}@dpa.internal`);
    } catch(e) {}
    try {
      const cbmms = await fetchSignInMethodsForEmail(auth, `${mat}@cbmms.internal`);
      if (cbmms.length > 0) console.log(`FOUND in Auth: ${mat}@cbmms.internal`);
    } catch(e) {}
  }
}
run().then(() => process.exit(0));
