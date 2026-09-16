const fs = require('fs');
let content = fs.readFileSync('src/pages/FirstAccess.tsx', 'utf8');

// We need to add customUnidade state
content = content.replace(
  "const [unidade, setUnidade] = useState('');",
  "const [unidade, setUnidade] = useState('');\n  const [customUnidade, setCustomUnidade] = useState('');"
);

// We need to initialize customUnidade if userProfile has something else
content = content.replace(
  "setUnidade(userProfile.unidade || (isAdm ? 'DPA' : ''));",
  `const existingUnidade = userProfile.unidade || (isAdm ? 'DPA' : '');
      const validOptions = ['QCG', 'DPA', 'ABM', 'AMAMBAI', 'APARECIDA DO TABOADO', 'AQUIDAUANA', 'BATAGUASSU', 'BELA VISTA', 'BONITO', 'CAARAPÓ', 'CAMPO GRANDE', 'CHAPADÃO DO SUL', 'CORUMBÁ', 'COSTA RICA', 'COXIM', 'DOURADOS', 'FÁTIMA DO SUL', 'IVINHEMA', 'JARDIM', 'MARACAJU', 'MIRANDA', 'MUNDO NOVO', 'NAVIRAÍ', 'NOVA ANDRADINA', 'PARANAÍBA', 'PONTA PORÃ', 'RIBAS DO RIO PARDO', 'SÃO GABRIEL DO OESTE', 'SIDROLÂNDIA', 'TRÊS LAGOAS'];
      
      if (existingUnidade && !validOptions.includes(existingUnidade)) {
        setUnidade('OUTRA');
        setCustomUnidade(existingUnidade);
      } else {
        setUnidade(existingUnidade);
      }`
);

// We need to change finalUnidade before submission
content = content.replace(
  "if (!nomeCompleto.trim() || !nomeGuerra.trim() || !postoGraduacao || !unidade.trim()) {",
  `const finalUnidade = unidade === 'OUTRA' ? customUnidade.trim().toUpperCase() : unidade.trim().toUpperCase();

    if (!nomeCompleto.trim() || !nomeGuerra.trim() || !postoGraduacao || !finalUnidade) {`
);

// Update payload to use finalUnidade
content = content.replace(
  "unidade: unidade.trim().toUpperCase(),",
  "unidade: finalUnidade,"
);

// Replace the <select> tag options
const selectRegex = /<select[^>]*>[\s\S]*?<\/select>/;
const newSelect = `<select
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 uppercase text-sm bg-white"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value.toUpperCase())}
              >
                <option value="" disabled>SELECIONE SUA UNIDADE...</option>
                <option value="QCG">QCG - QUARTEL DO COMANDO GERAL</option>
                <option value="DPA">DPA - DIRETORIA DE PATRIMÔNIO E ALMOXARIFADO</option>
                <option value="ABM">ABM - ACADEMIA DE BOMBEIROS MILITAR</option>
                <option value="AMAMBAI">AMAMBAI</option>
                <option value="APARECIDA DO TABOADO">APARECIDA DO TABOADO</option>
                <option value="AQUIDAUANA">AQUIDAUANA</option>
                <option value="BATAGUASSU">BATAGUASSU</option>
                <option value="BELA VISTA">BELA VISTA</option>
                <option value="BONITO">BONITO</option>
                <option value="CAARAPÓ">CAARAPÓ</option>
                <option value="CAMPO GRANDE">CAMPO GRANDE</option>
                <option value="CHAPADÃO DO SUL">CHAPADÃO DO SUL</option>
                <option value="CORUMBÁ">CORUMBÁ</option>
                <option value="COSTA RICA">COSTA RICA</option>
                <option value="COXIM">COXIM</option>
                <option value="DOURADOS">DOURADOS</option>
                <option value="FÁTIMA DO SUL">FÁTIMA DO SUL</option>
                <option value="IVINHEMA">IVINHEMA</option>
                <option value="JARDIM">JARDIM</option>
                <option value="MARACAJU">MARACAJU</option>
                <option value="MIRANDA">MIRANDA</option>
                <option value="MUNDO NOVO">MUNDO NOVO</option>
                <option value="NAVIRAÍ">NAVIRAÍ</option>
                <option value="NOVA ANDRADINA">NOVA ANDRADINA</option>
                <option value="PARANAÍBA">PARANAÍBA</option>
                <option value="PONTA PORÃ">PONTA PORÃ</option>
                <option value="RIBAS DO RIO PARDO">RIBAS DO RIO PARDO</option>
                <option value="SÃO GABRIEL DO OESTE">SÃO GABRIEL DO OESTE</option>
                <option value="SIDROLÂNDIA">SIDROLÂNDIA</option>
                <option value="TRÊS LAGOAS">TRÊS LAGOAS</option>
                <option value="OUTRA">OUTRA (ESPECIFICAR...)</option>
              </select>
              
              {unidade === 'OUTRA' && (
                <div className="mt-3">
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 uppercase text-sm"
                    value={customUnidade}
                    onChange={(e) => setCustomUnidade(e.target.value.toUpperCase())}
                    placeholder="DIGITE O NOME DA SUA UNIDADE / CIDADE"
                  />
                </div>
              )}`;

content = content.replace(selectRegex, newSelect);

fs.writeFileSync('src/pages/FirstAccess.tsx', content);
