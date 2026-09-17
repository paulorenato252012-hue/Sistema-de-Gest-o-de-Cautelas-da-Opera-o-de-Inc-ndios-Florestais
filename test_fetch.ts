import { initializeApp } from "firebase/app";
import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
async function test() {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, "123456@cbmms.internal");
    console.log("Methods:", methods);
  } catch (e) {
    console.error(e);
  }
}
test().finally(() => process.exit(0));
