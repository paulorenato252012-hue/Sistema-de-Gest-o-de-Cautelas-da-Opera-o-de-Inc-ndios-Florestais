const fs = require('fs');
let file = fs.readFileSync('src/lib/types.ts', 'utf8');
file = file.replace("  condition?: string;", "  condition?: string;\n  avariaImageUrl?: string;");
fs.writeFileSync('src/lib/types.ts', file, 'utf8');
