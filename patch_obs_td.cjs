const fs = require('fs');
let file = fs.readFileSync('src/components/CautionForm.tsx', 'utf8');

const target = `                    {/* Observações */}
                    <td className="px-4 py-2.5">
                      <input
                        type="text"
                        readOnly={isReadOnly}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-red-500 focus:border-red-500 bg-white"
                        value={item.observationWithdrawal || ''}
                        onChange={e => handleItemChange(idx, 'observationWithdrawal', e.target.value)}
                        placeholder="Detalhes adicionais (opcional)"
                      />
                    </td>`;

const replacement = `                    {/* Observações */}
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly={isReadOnly}
                            className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-red-500 focus:border-red-500 bg-white"
                            value={item.observationWithdrawal || ''}
                            onChange={e => handleItemChange(idx, 'observationWithdrawal', e.target.value)}
                            placeholder="Detalhes adicionais (opcional)"
                          />
                          {!isReadOnly && item.conditionWithdrawal === 'Com Alteração' && (
                            <label className="cursor-pointer text-gray-500 hover:text-red-600 transition p-1 border border-gray-200 rounded bg-gray-50">
                              {uploadingImage === idx ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Camera className="w-4 h-4" />
                              )}
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(idx, e)} />
                            </label>
                          )}
                        </div>
                        {item.photosWithdrawal && item.photosWithdrawal.length > 0 && (
                          <div className="flex gap-2 mt-1">
                            {item.photosWithdrawal.map((url, pIdx) => (
                              <img key={pIdx} src={url} alt="Avaria" className="w-10 h-10 object-cover rounded border border-gray-200" />
                            ))}
                          </div>
                        )}
                      </div>
                    </td>`;

file = file.replace(target, replacement);
fs.writeFileSync('src/components/CautionForm.tsx', file, 'utf8');
