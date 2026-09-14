const fs = require('fs');
let file = fs.readFileSync('src/components/CautionForm.tsx', 'utf8');

file = file.replace("  RefreshCw\n} from 'lucide-react';", "  RefreshCw,\n  Camera\n} from 'lucide-react';\nimport { uploadAvariaImage } from '../lib/storage';");

fs.writeFileSync('src/components/CautionForm.tsx', file, 'utf8');
