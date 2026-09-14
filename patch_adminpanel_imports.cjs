const fs = require('fs');
let file = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

file = file.replace("import { AdminDescautelaManager } from './AdminDescautelaManager';", `import { AdminDescautelaManager } from './AdminDescautelaManager';
import { AdminDashboard } from './AdminDashboard';
import { AdminAuditLogs } from './AdminAuditLogs';`);

file = file.replace("const [activeTab, setActiveTab] = useState<'cycles' | 'descautela_admin' | 'users' | 'materials' | 'vehicles' | 'bases'>('cycles');", "const [activeTab, setActiveTab] = useState<'dashboard' | 'audit' | 'cycles' | 'descautela_admin' | 'users' | 'materials' | 'vehicles' | 'bases'>('cycles');");

file = file.replace(`<button
            onClick={() => setActiveTab('cycles')}`, `<button
            onClick={() => setActiveTab('dashboard')}
            className={\`whitespace-nowrap py-3.5 px-1 border-b-2 font-bold text-sm flex items-center transition-colors \${
              activeTab === 'dashboard' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Dashboard & Exportação
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={\`whitespace-nowrap py-3.5 px-1 border-b-2 font-bold text-sm flex items-center transition-colors \${
              activeTab === 'audit' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Auditoria
          </button>
          <button
            onClick={() => setActiveTab('cycles')}`);

fs.writeFileSync('src/components/AdminPanel.tsx', file, 'utf8');
