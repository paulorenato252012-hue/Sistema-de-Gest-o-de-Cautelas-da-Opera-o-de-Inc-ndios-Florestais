const fs = require('fs');
let content = fs.readFileSync('src/pages/FirstAccess.tsx', 'utf8');

const regex = /<label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">\s*Posto \/ Graduação\s*<\/label>\s*<select[\s\S]*?<\/select>\s*(?:\{\s*unidade === 'OUTRA'[\s\S]*?\}\s*\))?/g;

const replacement = `<label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Posto / Graduação
                </label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 uppercase text-sm bg-white"
                  value={postoGraduacao}
                  onChange={(e) => setPostoGraduacao(e.target.value)}
                >
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
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Unidade / Lotação
                </label>
                <select
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

content = content.replace(regex, replacement);

fs.writeFileSync('src/pages/FirstAccess.tsx', content);
