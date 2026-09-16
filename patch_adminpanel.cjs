const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Replace postoGraduacao input with select
content = content.replace(
  /<label className="block text-xs font-bold text-gray-700 mb-1">Posto\/Graduação \*(.*?\n.*?)<\/div>/s,
  `<label className="block text-xs font-bold text-gray-700 mb-1">Posto/Graduação *</label>
            <select required className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white" value={formData.postoGraduacao} onChange={e => setFormData({...formData, postoGraduacao: e.target.value})}>
              <option value="CEL BM">CEL BM</option>
              <option value="TC BM">TC BM</option>
              <option value="MAJ BM">MAJ BM</option>
              <option value="CAP BM">CAP BM</option>
              <option value="1º TEN BM">1º TEN BM</option>
              <option value="2º TEN BM">2º TEN BM</option>
              <option value="SUBTEN BM">SUBTEN BM</option>
              <option value="1º SGT BM">1º SGT BM</option>
              <option value="2º SGT BM">2º SGT BM</option>
              <option value="3º SGT BM">3º SGT BM</option>
              <option value="CB BM">CB BM</option>
              <option value="SD BM">SD BM</option>
            </select>
          </div>`
);

// We should also replace the Unidade input with the select, but this might need custom value as well. Let's just make it a select with the same options and an "OUTRA" option, maybe leaving it as an input if the admin wants to type anything? The user said "Alterar na página de primeiro acesso", so maybe AdminPanel should remain a text input for flexibility, or we can update it. Let's update Unidade to a select as well for consistency.

const unidadeSelect = `<label className="block text-xs font-bold text-gray-700 mb-1">Unidade / Lotação</label>
            <select required className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white" value={formData.unidade} onChange={e => setFormData({...formData, unidade: e.target.value})}>
              <option value="QCG">QCG</option>
              <option value="DPA">DPA</option>
              <option value="ABM">ABM</option>
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
              <option value="OUTRA">OUTRA</option>
            </select>
            {formData.unidade === 'OUTRA' && (
              <input type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-2" placeholder="Digite a unidade" onChange={e => setFormData({...formData, unidade: e.target.value.toUpperCase()})} />
            )}
          </div>`;

content = content.replace(
  /<label className="block text-xs font-bold text-gray-700 mb-1">Unidade \/ Lotação<\/label>\s*<input required type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value=\{formData\.unidade\} onChange=\{e => setFormData\(\{...formData, unidade: e\.target\.value\}\)\} placeholder="Ex: 1º SGBM, TIF" \/>\s*<\/div>/s,
  unidadeSelect
);

fs.writeFileSync('src/components/AdminPanel.tsx', content);
