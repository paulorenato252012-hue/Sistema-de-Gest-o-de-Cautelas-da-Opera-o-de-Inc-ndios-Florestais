import { initializeApp } from "firebase/app";
import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
async function test() {
  try {
    const m1 = await fetchSignInMethodsForEmail(auth, "123456@dpa.internal");
    console.log("123456@dpa.internal:", m1);
  } catch (e) {}
  try {
    const m2 = await fetchSignInMethodsForEmail(auth, "81381021@dpa.internal");
    console.log("81381021@dpa.internal:", m2);
  } catch (e) {}
  try {
    const m3 = await fetchSignInMethodsForEmail(auth, "123456@cbmms.internal");
    console.log("123456@cbmms.internal:", m3);
  } catch (e) {}
}
test().finally(() => process.exit(0));
