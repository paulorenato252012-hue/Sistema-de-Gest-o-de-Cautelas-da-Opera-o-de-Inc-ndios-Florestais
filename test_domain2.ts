import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testEmail(email: string) {
  try {
    await createUserWithEmailAndPassword(auth, email, "dummyPassword123");
    console.log(`CREATED: ${email} -> This means it DID NOT exist!`);
  } catch(e: any) {
    if (e.code === 'auth/email-already-in-use') {
      console.log(`EXISTS: ${email} -> This means it is the CORRECT domain!`);
    } else {
      console.log(`ERROR for ${email}: ${e.code}`);
    }
  }
}

async function test() {
  await testEmail("123456@dpa.internal");
  await testEmail("123456@cbmms.internal");
  await testEmail("81381021@dpa.internal");
  await testEmail("81381021@cbmms.internal");
}
test().then(() => process.exit(0));
