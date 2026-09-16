const fs = require('fs');
let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

content = content.replace(
  /<label className="block text-xs font-bold text-gray-700 mb-1">Unidade \/ Lotação<\/label>\s*<select.*?<\/select>\s*\{formData\.unidade === 'OUTRA' && \(\s*<input.*? \/>\s*\)\}\s*<\/div>/s,
  `<label className="block text-xs font-bold text-gray-700 mb-1">Unidade / Lotação</label>
            <input list="unidades-list" required type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm uppercase" value={formData.unidade} onChange={e => setFormData({...formData, unidade: e.target.value.toUpperCase()})} placeholder="Ex: AQUIDAUANA, DPA..." />
            <datalist id="unidades-list">
              <option value="QCG" />
              <option value="DPA" />
              <option value="ABM" />
              <option value="AMAMBAI" />
              <option value="APARECIDA DO TABOADO" />
              <option value="AQUIDAUANA" />
              <option value="BATAGUASSU" />
              <option value="BELA VISTA" />
              <option value="BONITO" />
              <option value="CAARAPÓ" />
              <option value="CAMPO GRANDE" />
              <option value="CHAPADÃO DO SUL" />
              <option value="CORUMBÁ" />
              <option value="COSTA RICA" />
              <option value="COXIM" />
              <option value="DOURADOS" />
              <option value="FÁTIMA DO SUL" />
              <option value="IVINHEMA" />
              <option value="JARDIM" />
              <option value="MARACAJU" />
              <option value="MIRANDA" />
              <option value="MUNDO NOVO" />
              <option value="NAVIRAÍ" />
              <option value="NOVA ANDRADINA" />
              <option value="PARANAÍBA" />
              <option value="PONTA PORÃ" />
              <option value="RIBAS DO RIO PARDO" />
              <option value="SÃO GABRIEL DO OESTE" />
              <option value="SIDROLÂNDIA" />
              <option value="TRÊS LAGOAS" />
            </datalist>
          </div>`
);

fs.writeFileSync('src/components/AdminPanel.tsx', content);
