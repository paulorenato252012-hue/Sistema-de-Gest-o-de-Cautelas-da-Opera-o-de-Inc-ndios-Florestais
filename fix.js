const fs = require('fs');
let content = fs.readFileSync('src/components/CautionForm.tsx', 'utf8');
content = content.replace("Sparkles, Wrench } from 'lucide-react';", "Sparkles, Wrench, RefreshCw, Camera } from 'lucide-react';\nimport { uploadAvariaImage } from '../lib/storage';");
fs.writeFileSync('src/components/CautionForm.tsx', content, 'utf8');

let dashboard = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');
dashboard = dashboard.replace("i.condition && i.condition.toLowerCase().includes('avaria')", "i.conditionWithdrawal && i.conditionWithdrawal.toLowerCase().includes('avaria')");
fs.writeFileSync('src/components/AdminDashboard.tsx', dashboard, 'utf8');

let firebaseStr = fs.readFileSync('src/lib/firebase.ts', 'utf8');
firebaseStr = firebaseStr.replace("  databaseId: firebaseConfig.firestoreDatabaseId\n});", "}, firebaseConfig.firestoreDatabaseId);");
fs.writeFileSync('src/lib/firebase.ts', firebaseStr, 'utf8');
