const fs = require('fs');
let file = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

file = file.replace("{activeTab === 'cycles' && <CycleManager />}", `{activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'audit' && <AdminAuditLogs />}
      {activeTab === 'cycles' && <CycleManager />}`);

fs.writeFileSync('src/components/AdminPanel.tsx', file, 'utf8');
