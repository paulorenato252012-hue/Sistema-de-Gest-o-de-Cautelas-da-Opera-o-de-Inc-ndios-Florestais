const fs = require('fs');
let file = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

file = file.replace("  AlertTriangle\n} from 'lucide-react';", "  AlertTriangle,\n  BarChart2,\n  Clock\n} from 'lucide-react';");

fs.writeFileSync('src/components/AdminPanel.tsx', file, 'utf8');
