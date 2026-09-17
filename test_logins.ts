import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const emails = [
  "123456@dpa.internal",
  "123456@cbmms.internal",
  "26114022@dpa.internal",
  "26114022@cbmms.internal",
  "106666021@dpa.internal",
  "81381021@dpa.internal"
];

async function test() {
  for (const e of emails) {
    try {
      await signInWithEmailAndPassword(auth, e, "dpa_admin");
      console.log(`SUCCESS: ${e} with dpa_admin`);
    } catch(err: any) {
      console.log(`FAIL: ${e} with dpa_admin -> ${err.code}`);
    }
  }
}
test().then(() => process.exit(0));
