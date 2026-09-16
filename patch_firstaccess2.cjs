const fs = require('fs');
let content = fs.readFileSync('src/pages/FirstAccess.tsx', 'utf8');

// We need to initialize customUnidade if userProfile has something else
content = content.replace(
  "setUnidade(userProfile.unidade || (isAdm ? 'LOGÍSTICA / TIF' : ''));",
  `const existingUnidade = userProfile.unidade || (isAdm ? 'DPA' : '');
      const validOptions = ['QCG', 'DPA', 'ABM', 'AMAMBAI', 'APARECIDA DO TABOADO', 'AQUIDAUANA', 'BATAGUASSU', 'BELA VISTA', 'BONITO', 'CAARAPÓ', 'CAMPO GRANDE', 'CHAPADÃO DO SUL', 'CORUMBÁ', 'COSTA RICA', 'COXIM', 'DOURADOS', 'FÁTIMA DO SUL', 'IVINHEMA', 'JARDIM', 'MARACAJU', 'MIRANDA', 'MUNDO NOVO', 'NAVIRAÍ', 'NOVA ANDRADINA', 'PARANAÍBA', 'PONTA PORÃ', 'RIBAS DO RIO PARDO', 'SÃO GABRIEL DO OESTE', 'SIDROLÂNDIA', 'TRÊS LAGOAS'];
      
      if (existingUnidade && !validOptions.includes(existingUnidade)) {
        setUnidade('OUTRA');
        setCustomUnidade(existingUnidade);
      } else {
        setUnidade(existingUnidade);
      }`
);

fs.writeFileSync('src/pages/FirstAccess.tsx', content);
