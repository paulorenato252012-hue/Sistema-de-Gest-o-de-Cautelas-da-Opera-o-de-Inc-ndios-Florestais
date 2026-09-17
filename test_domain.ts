import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    await signInWithEmailAndPassword(auth, "123456@cbmms.internal", "dpa_admin");
    console.log("SUCCESS cbmms.internal with dpa_admin");
  } catch(e: any) {
    console.log("FAIL cbmms.internal:", e.code);
  }
  
  try {
    await signInWithEmailAndPassword(auth, "123456@dpa.internal", "dpa_admin");
    console.log("SUCCESS dpa.internal with dpa_admin");
  } catch(e: any) {
    console.log("FAIL dpa.internal:", e.code);
  }
}
test().then(() => process.exit(0));
