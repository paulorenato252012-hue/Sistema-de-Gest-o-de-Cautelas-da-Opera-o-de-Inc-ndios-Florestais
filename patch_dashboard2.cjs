const fs = require('fs');
let file = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

file = file.replace("document.documentElement.style.filter = 'invert(0.9) hue-rotate(180deg)';", "");
file = file.replace("document.documentElement.style.filter = 'none';", "");

fs.writeFileSync('src/pages/Dashboard.tsx', file, 'utf8');
