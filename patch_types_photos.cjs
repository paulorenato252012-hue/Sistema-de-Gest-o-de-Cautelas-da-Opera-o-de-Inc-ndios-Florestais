const fs = require('fs');
let file = fs.readFileSync('src/lib/types.ts', 'utf8');
file = file.replace("  observationWithdrawal: string;", "  observationWithdrawal: string;\n  photosWithdrawal?: string[];");
fs.writeFileSync('src/lib/types.ts', file, 'utf8');
