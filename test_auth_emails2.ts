import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test(email: string, pass: string) {
  try {
     await signInWithEmailAndPassword(auth, email, pass);
     console.log(`SUCCESS: ${email} with ${pass}`);
  } catch(e: any) {
     console.log(`FAIL: ${email} -> ${e.code}`);
  }
}

async function run() {
  await test("123456@cbmms.internal", "dpa_admin");
  await test("123456@cbmms.internal", "dummyPassword123");
  await test("123456@dpa.internal", "dpa_admin");
  await test("81381021@cbmms.internal", "dpa_admin");
  await test("81381021@dpa.internal", "dummyPassword123");
}
run().then(() => process.exit(0));
