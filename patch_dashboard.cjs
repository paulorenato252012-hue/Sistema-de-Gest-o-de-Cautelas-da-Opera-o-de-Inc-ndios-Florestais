const fs = require('fs');
let file = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const targetImports = "import { PWAInstallButton } from '../components/PWAInstallButton';";
const replacementImports = "import { PWAInstallButton } from '../components/PWAInstallButton';\nimport { Moon, Sun } from 'lucide-react';";

file = file.replace(targetImports, replacementImports);

const targetState = "  const [adminViewMode, setAdminViewMode] = React.useState<'ADMIN' | 'MILITAR' | 'LOGISTICA'>('ADMIN');";
const replacementState = `  const [adminViewMode, setAdminViewMode] = React.useState<'ADMIN' | 'MILITAR' | 'LOGISTICA'>('ADMIN');
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.filter = 'invert(0.9) hue-rotate(180deg)';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.filter = 'none';
    }
  }, [isDarkMode]);`;

file = file.replace(targetState, replacementState);

const targetBtn1 = "<PWAInstallButton />";
const replacementBtn1 = `<PWAInstallButton />
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 transition ml-2" 
                title="Modo Noturno">
                {isDarkMode ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4 text-gray-200" />}
              </button>`;
// Only replace the first match (desktop) and second match (mobile)
const parts = file.split(targetBtn1);
if (parts.length >= 3) {
  file = parts[0] + replacementBtn1 + parts[1] + replacementBtn1 + parts.slice(2).join(targetBtn1);
} else if (parts.length === 2) {
  file = parts[0] + replacementBtn1 + parts[1];
}

fs.writeFileSync('src/pages/Dashboard.tsx', file, 'utf8');
