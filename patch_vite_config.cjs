const fs = require('fs');
let file = fs.readFileSync('vite.config.ts', 'utf8');
file = file.replace("VitePWA({", "VitePWA({\n      workbox: {\n        maximumFileSizeToCacheInBytes: 5000000\n      },");
fs.writeFileSync('vite.config.ts', file, 'utf8');
