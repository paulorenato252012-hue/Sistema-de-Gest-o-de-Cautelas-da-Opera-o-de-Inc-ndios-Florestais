const fs = require('fs');
let file = fs.readFileSync('src/components/CautionForm.tsx', 'utf8');
file = file.replace("item.conditionWithdrawal === 'Com Alteração'", "item.conditionWithdrawal === 'Com Avaria'");
fs.writeFileSync('src/components/CautionForm.tsx', file, 'utf8');
