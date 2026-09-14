const fs = require('fs');
let file = fs.readFileSync('vite.config.ts', 'utf8');
file = file.replace("      VitePWA({\n      workbox: {\n        maximumFileSizeToCacheInBytes: 5000000\n      },", "      VitePWA({");
file = file.replace("workbox: {\n          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],\n        },", "workbox: {\n          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],\n          maximumFileSizeToCacheInBytes: 10000000\n        },");
fs.writeFileSync('vite.config.ts', file, 'utf8');
