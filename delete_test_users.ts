import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import firebaseConfig from './firebase-applet-config.json' assert { type: "json" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function clean(email:string) {
  try {
     const c = await signInWithEmailAndPassword(auth, email, "dummyPassword123");
     await deleteUser(c.user);
     console.log(`Deleted ${email}`);
  } catch(e) {}
  try {
     const c = await signInWithEmailAndPassword(auth, email, "dummy123");
     await deleteUser(c.user);
     console.log(`Deleted ${email}`);
  } catch(e) {}
}

async function run() {
   await clean("123456@dpa.internal");
   await clean("81381021@dpa.internal");
   await clean("26114022@cbmms.internal");
}
run().then(() => process.exit(0));
