const fs = require('fs');
let file = fs.readFileSync('src/lib/firebase.ts', 'utf8');
file = file.replace("import { getFirestore } from 'firebase/firestore';", "import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';");
file = file.replace("export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);", `export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()}),
  databaseId: firebaseConfig.firestoreDatabaseId
});`);
fs.writeFileSync('src/lib/firebase.ts', file, 'utf8');
