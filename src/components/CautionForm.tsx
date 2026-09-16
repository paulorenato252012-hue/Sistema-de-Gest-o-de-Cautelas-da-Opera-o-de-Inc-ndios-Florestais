import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Caution, CautionItem, Cycle, MaterialCatalog } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { Save, Plus, Trash2, PackagePlus, CheckCircle2, AlertCircle, Sparkles, Wrench, RefreshCw, Camera, X, Eye } from 'lucide-react';
import { uploadAvariaImage } from '../lib/storage';

// Relação completa de materiais padronizados de combate a incêndios florestais (CBMMS / TIF)
export const DEFAULT_MATERIAIS_PADRONIZADOS = [
  'Soprador Costal STIHL (BR 420 / BR 600)',
  'Soprador Costal GUARANY',
  'Motosserra a Combustão (STIHL / Husqvarna)',
  'Pinga Fogo (Tocha de Gotejamento 5L)',
  'Mochila Costal Flexível (20L)',
  'Mochila Costal Rígida',
  'Abafador para Combate Direto',
  'Pá Coração / Pá de Bico com Cabo',
  'Enxada com Cabo',
  'Gorgui / Ferramenta McLeod',
  'Machado Pulaski',
  'Foice com Cabo',
  'Facão 18"/20" com Bainha',
  'Lima Triangular para Afiação com Cabo',
  'Chave Combinada / Chave de Vela para Motosserra/Soprador',
  'Galão Combinado (Combustível 5L + Óleo 3L)',
  'Galão / Tambor de Combustível Reserva (20L)',
  'Óleo 2 Tempos (Frascos)',
  'Óleo para Corrente de Motosserra',
  'Corrente Sobressalente para Motosserra',
  'Sabre Sobressalente para Motosserra',
  'Rádio Transceptor Portátil (HT)',
  'Bateria Reserva para Rádio HT',
  'Carregador de Mesa para Rádio HT',
  'Lanterna de Cabeça (Headlamp) com Pilhas/Bateria',
  'Lanterna Tática Portátil com Carregador',
  'Kit de Primeiros Socorros / Bolsa APH',
  'Óculos de Proteção Ampla Visão',
  'Luvas de Vaqueta / Proteção Térmica (Pares)',
  'Perneiras de Proteção (Pares)',
  'Máscara Facial com Filtro contra Fumaça',
  'Cantil / Mochila de Hidratação (Camelbak)'
];

// Checklist completo de viatura operacional
export const DEFAULT_VIATURA_CHECKLIST = [
  'Filtro de ar',
  'Palhetas do limpador de para-brisa',
  'Luz de seta (dianteira e traseira)',
  'Luz de ré',
  'Luz de freio e brake light',
  'Faróis dianteiros (baixo e alto)',
  'Faróis de milha / auxiliares',
  'Pneus (pressão e desgaste)',
  'Estepe',
  'Macaco hidráulico',
  'Haste para descer o estepe',
  'Chave de roda',
  'Triângulo de sinalização',
  'Nível do óleo do motor',
  'Nível de água do radiador / arrefecimento',
  'Nível do fluido de freio',
  'Nível de água do lavador de para-brisa',
  'Freio de mão / estacionamento',
  'Freio de serviço (pedal)',
  'Buzina',
  'Sirene e Giroflex',
  'Extintor de incêndio (pressão e validade)',
  'Documento da viatura (CRLV)',
  'Cartão de abastecimento / combustível',
  'Chave reserva',
  'Cinta de reboque com manilhas',
  'Engate da tração 4x4 e reduzida',
  'Estado geral da lataria e pintura',
  'Vidros, travas e retrovisores'
];

const BASES_PANTANAL = [
  'Campo Grande (Comando)',
  'Corumbá',
  'Aquidauana',
  'Miranda',
  'Porto Murtinho',
  'Coxim',
  'Bonito',
  'Sonora',
  'Rio Verde de MT',
  'Bela Vista',
  'Outra'
];

interface CautionFormProps {
  existingCaution?: Caution;
  existingItems?: CautionItem[];
  onSaved?: (id: string) => void;
}

export function CautionForm({ existingCaution, existingItems = [], onSaved }: CautionFormProps) {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const initialType = (queryParams.get('type') as Caution['type']) || 'MATERIAL_PADRONIZADO';
  const { userProfile, currentUser } = useAuth();
  
  const [formData, setFormData] = useState<Partial<Caution>>(existingCaution || {
    type: initialType,
    status: 'RASCUNHO',
    unitGcif: '',
    base: BASES_PANTANAL[0],
    commanderName: userProfile?.nomeCompleto || '',
    commanderEmail: userProfile?.email || '',
    localEmpenhado: '',
    vehiclePrefixo: '',
    vehiclePlaca: '',
    driverName: userProfile?.nomeGuerra || '',
    kmCurrent: 0,
    kmNextOilChange: 0,
  });

  const [items, setItems] = useState<Partial<CautionItem>[]>(existingItems.length > 0 ? existingItems : []);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cycles, setCycles] = useState<Cycle[]>([]);
  
  const [isCustomBase, setIsCustomBase] = useState(() => {
    if (!existingCaution) return false;
    if (existingCaution.base === 'Outra' || !BASES_PANTANAL.includes(existingCaution.base || '')) return true;
    return false;
  });

  // Estado para inserção rápida de novo material
  const [newMaterialDesc, setNewMaterialDesc] = useState('');
  const [newMaterialId, setNewMaterialId] = useState('');
  const [newMaterialQty, setNewMaterialQty] = useState<number | ''>(1);
  const [newMaterialCond, setNewMaterialCond] = useState('Sem Alteração');
  const [newMaterialObs, setNewMaterialObs] = useState('');

  // Sincroniza dados quando o perfil do usuário carregar
  useEffect(() => {
    if (userProfile && !existingCaution) {
      setFormData(prev => ({
        ...prev,
        commanderName: prev.commanderName || userProfile.nomeCompleto || '',
        commanderEmail: prev.commanderEmail || userProfile.email || '',
        driverName: prev.driverName || userProfile.nomeGuerra || '',
      }));
    }
  }, [userProfile, existingCaution]);

  // Sincroniza quando existingCaution mudar
  useEffect(() => {
    if (existingCaution) {
      setFormData(existingCaution);
    }
  }, [existingCaution]);

  // Carrega ciclos disponíveis e restringe estritamente aos que possuem status 'ABERTO'
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        const snap = await getDocs(collection(db, 'cycles'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Cycle));
        setCycles(list);

        const openList = list.filter(c => c.status === 'ABERTO');
        if (openList.length > 0 && !formData.cycleId) {
          setFormData(prev => ({ 
            ...prev, 
            cycleId: openList[0].id,
            unitGcif: prev.unitGcif || openList[0].name
          }));
        }
      } catch (e) {
        console.warn('Could not fetch cycles:', e);
      }
    };
    fetchCycles();
  }, []);

  // Filtra exclusivamente os ciclos abertos para seleção do militar
  const openCycles = useMemo(() => {
    return cycles.filter(c => c.status === 'ABERTO');
  }, [cycles]);

  // Preenche a lista inicial com todos os itens constantes dos padrões do CBMMS
  useEffect(() => {
    if (existingItems.length > 0) {
      setItems(existingItems);
      return;
    }

    if (!existingCaution) {
      if (formData.type === 'VIATURA') {
        setItems(DEFAULT_VIATURA_CHECKLIST.map(desc => ({
          description: desc,
          identification: 'N/A',
          quantity: 1,
          conditionWithdrawal: 'Sem Alteração',
          observationWithdrawal: ''
        })));
      } else if (formData.type === 'MATERIAL_PADRONIZADO') {
        const initialList: Partial<CautionItem>[] = DEFAULT_MATERIAIS_PADRONIZADOS.map(desc => ({
          description: desc,
          identification: '',
          quantity: 0,
          conditionWithdrawal: 'Sem Alteração',
          observationWithdrawal: ''
        }));

        // Busca também itens adicionais cadastrados no catálogo pelo Administrador
        getDocs(query(collection(db, 'materialCatalog'), where('ativo', '==', true), where('tipo', '==', 'PADRONIZADO')))
          .then(catalogSnap => {
            const extraFromCatalog: Partial<CautionItem>[] = [];
            catalogSnap.forEach(docSnap => {
              const data = docSnap.data() as MaterialCatalog;
              if (!initialList.some(it => it.description?.toLowerCase() === data.nome.toLowerCase())) {
                extraFromCatalog.push({
                  description: data.nome,
                  identification: '',
                  quantity: 0,
                  conditionWithdrawal: 'Sem Alteração',
                  observationWithdrawal: ''
                });
              }
            });
            if (extraFromCatalog.length > 0) {
              setItems([...initialList, ...extraFromCatalog]);
            } else {
              setItems(initialList);
            }
          })
          .catch(() => {
            setItems(initialList);
          });
      } else if (formData.type === 'ESPECIFICA') {
        // Para cautela específica, começa com itens vazios ou catálogo específico
        setItems([
          { description: '', identification: '', quantity: 1, conditionWithdrawal: 'Sem Alteração', observationWithdrawal: '', isCustom: true }
        ]);
      }
    }
  }, [formData.type, existingCaution]);

  const handleInputChange = (field: keyof Caution, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const inputElement = e.target;
    if (!inputElement.files || inputElement.files.length === 0) return;
    const file = inputElement.files[0];
    
    setUploadingImage(index);
    try {
      const url = await uploadAvariaImage(file, 'avaria_' + Date.now());
      const newItems = [...items];
      const existingPhotos = newItems[index].photosWithdrawal || [];
      newItems[index] = { ...newItems[index], photosWithdrawal: [...existingPhotos, url] };
      setItems(newItems);
    } catch (err) {
      console.error("Erro ao processar a imagem da avaria:", err);
      alert("Não foi possível carregar a fotografia. Tente novamente.");
    } finally {
      setUploadingImage(null);
      // Limpa o valor do input para permitir selecionar novamente o mesmo arquivo se necessário
      inputElement.value = '';
    }
  };

  const handleRemovePhoto = (itemIndex: number, photoIndex: number) => {
    const newItems = [...items];
    const existing = [...(newItems[itemIndex].photosWithdrawal || [])];
    existing.splice(photoIndex, 1);
    newItems[itemIndex] = { ...newItems[itemIndex], photosWithdrawal: existing };
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof CautionItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Adiciona nova linha em branco na tabela
  const addBlankItem = () => {
    setItems([
      ...items,
      {
        description: '',
        identification: '',
        quantity: 1,
        conditionWithdrawal: 'Sem Alteração',
        observationWithdrawal: '',
        isCustom: true
      }
    ]);
  };

  // Insere novo material a partir do painel de adição rápida
  const handleAddNewMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialDesc.trim()) return;

    const newItem: Partial<CautionItem> = {
      description: newMaterialDesc.trim(),
      identification: newMaterialId.trim(),
      quantity: Number(newMaterialQty) > 0 ? Number(newMaterialQty) : 1,
      conditionWithdrawal: newMaterialCond || 'Sem Alteração',
      observationWithdrawal: newMaterialObs.trim(),
      isCustom: true
    };

    // Insere no início dos materiais adicionados para visibilidade imediata
    setItems([newItem, ...items]);

    // Limpa os campos
    setNewMaterialDesc('');
    setNewMaterialId('');
    setNewMaterialQty(1);
    setNewMaterialCond('Sem Alteração');
    setNewMaterialObs('');
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSaveDraft = async () => {
    if (!userProfile) return;
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      // Validação estrita: somente ciclos com status 'ABERTO' podem ser selecionados
      const availableOpenCycles = cycles.filter(c => c.status === 'ABERTO');
      if (availableOpenCycles.length === 0 && !existingCaution) {
        setError('Não é possível confeccionar cautela pois não há nenhum ciclo com status "ABERTO" disponível. Solicite a abertura de um ciclo operacional ao Administrador.');
        setSaving(false);
        return;
      }

      const activeCycle = availableOpenCycles.find(c => c.id === formData.cycleId) || availableOpenCycles[0];
      const activeCycleId = activeCycle ? activeCycle.id : (formData.cycleId || 'ciclo-padrao');
      const activeCycleName = activeCycle ? activeCycle.name : (formData.unitGcif || 'Ciclo Operacional');
      const baseValue = formData.base || BASES_PANTANAL[0];

      const cautionData: any = {
        ...formData,
        cycleId: activeCycleId,
        unitGcif: activeCycleName,
        base: baseValue,
        responsibleUserId: existingCaution?.responsibleUserId || userProfile.id || currentUser?.uid || '',
        updatedAt: serverTimestamp(),
      };

      let cautionId = existingCaution?.id;

      if (!cautionId) {
        cautionData.createdAt = new Date().toISOString();
        cautionData.version = 1;
        const docRef = await addDoc(collection(db, 'cautions'), cautionData);
        cautionId = docRef.id;
      } else {
        await updateDoc(doc(db, 'cautions', cautionId), cautionData);
      }

      // Salva itens
      for (const item of items) {
        if (!item.description || !item.description.trim()) continue;

        const qty = Number(item.quantity);
        // Na cautela de materiais, salva itens que têm quantidade > 0 ou identificação/numeração preenchida
        if (formData.type === 'MATERIAL_PADRONIZADO' || formData.type === 'ESPECIFICA') {
          if (qty <= 0 && (!item.identification || !item.identification.trim())) {
            // Se já existia no banco e foi zerado, remove
            if (item.id) {
              await deleteDoc(doc(db, 'cautions', cautionId, 'items', item.id));
            }
            continue;
          }
        }

        const itemData: any = {
          description: item.description.trim(),
          quantity: qty > 0 ? qty : 1,
          identification: item.identification?.trim() || 'S/N',
          conditionWithdrawal: item.conditionWithdrawal || 'Sem Alteração',
          observationWithdrawal: item.observationWithdrawal || '',
          photosWithdrawal: item.photosWithdrawal || [],
        };

        if (item.isCustom) {
          itemData.isCustom = true;
        }

        if (item.id) {
          await updateDoc(doc(db, 'cautions', cautionId, 'items', item.id), itemData);
        } else {
          await addDoc(collection(db, 'cautions', cautionId, 'items'), itemData);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);

      if (onSaved) onSaved(cautionId);
    } catch (err: any) {
      console.error('Erro ao salvar rascunho:', err);
      setError('Erro ao salvar rascunho: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly = Boolean(
    existingCaution && 
    existingCaution.status !== 'RASCUNHO' && 
    existingCaution.status !== 'COM_DIVERGENCIA' &&
    existingCaution.status !== 'AGUARDANDO_ASSINATURA_MILITAR'
  );

  return (
    <div className="space-y-8">
      {/* Seletor de Tipo de Cautela (se for criação nova) */}
      {!existingCaution && (
        <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleInputChange('type', 'MATERIAL_PADRONIZADO')}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all text-center ${
              formData.type === 'MATERIAL_PADRONIZADO'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Materiais Padronizados
          </button>
          <button
            type="button"
            onClick={() => handleInputChange('type', 'VIATURA')}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all text-center ${
              formData.type === 'VIATURA'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Checklist de Viatura
          </button>
          <button
            type="button"
            onClick={() => handleInputChange('type', 'ESPECIFICA')}
            className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-md transition-all text-center ${
              formData.type === 'ESPECIFICA'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cautela Específica
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
          <span className="font-medium">Rascunho da cautela salvo com sucesso!</span>
        </div>
      )}

      {/* DADOS GERAIS DO RESPONSÁVEL E OPERAÇÃO */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-red-800" />
          Dados da Operação e Responsável
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Comandante da GU / Responsável
            </label>
            <input
              type="text"
              readOnly={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
              value={formData.commanderName || ''}
              onChange={e => handleInputChange('commanderName', e.target.value)}
              placeholder="Nome completo e posto/graduação"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              E-mail do Responsável
            </label>
            <input
              type="text"
              readOnly={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:ring-red-500 focus:border-red-500"
              value={formData.commanderEmail || ''}
              onChange={e => handleInputChange('commanderEmail', e.target.value)}
              placeholder="email@cbmms.internal"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Ciclo Operacional (Status: Aberto) *
            </label>
            {isReadOnly ? (
              <input
                type="text"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-700 font-medium"
                value={formData.unitGcif || 'Ciclo Operacional'}
              />
            ) : openCycles.length > 0 ? (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500 bg-white font-medium"
                value={formData.cycleId || (openCycles.find(c => c.name === formData.unitGcif)?.id || openCycles[0]?.id)}
                onChange={e => {
                  const selected = openCycles.find(c => c.id === e.target.value);
                  if (selected) {
                    setFormData(prev => ({
                      ...prev,
                      cycleId: selected.id,
                      unitGcif: selected.name
                    }));
                  }
                }}
              >
                {openCycles.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Ciclo Aberto)
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-900 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Nenhum ciclo com status "ABERTO"</strong>
                  <span>Somente ciclos com status "ABERTO" podem ser selecionados. Solicite a abertura ao Administrador.</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Base Operacional
            </label>
            <select
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500 bg-white"
              value={isCustomBase ? 'Outra' : (formData.base || BASES_PANTANAL[0])}
              onChange={e => {
                const val = e.target.value;
                if (val === 'Outra') {
                  setIsCustomBase(true);
                  handleInputChange('base', '');
                } else {
                  setIsCustomBase(false);
                  handleInputChange('base', val);
                }
              }}
            >
              {BASES_PANTANAL.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {isCustomBase && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Especifique a Base Operacional
                </label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  required
                  placeholder="Digite o nome da base operacional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500 bg-white"
                  value={formData.base === 'Outra' ? '' : (formData.base || '')}
                  onChange={e => handleInputChange('base', e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Prefixo da Viatura (se aplicável)
            </label>
            <input
              type="text"
              readOnly={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
              value={formData.vehiclePrefixo || ''}
              onChange={e => handleInputChange('vehiclePrefixo', e.target.value)}
              placeholder="Ex: ABT-34, AR-12"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Placa do Veículo
            </label>
            <input
              type="text"
              readOnly={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
              value={formData.vehiclePlaca || ''}
              onChange={e => handleInputChange('vehiclePlaca', e.target.value)}
              placeholder="Ex: QAA-1234"
            />
          </div>

          {formData.type === 'VIATURA' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  KM Atual
                </label>
                <input
                  type="number"
                  readOnly={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                  value={formData.kmCurrent || ''}
                  onChange={e => handleInputChange('kmCurrent', Number(e.target.value))}
                  placeholder="Ex: 85400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  KM para Próxima Troca de Óleo
                </label>
                <input
                  type="number"
                  readOnly={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                  value={formData.kmNextOilChange || ''}
                  onChange={e => handleInputChange('kmNextOilChange', Number(e.target.value))}
                  placeholder="Ex: 90000"
                />
              </div>
            </>
          )}

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Local Empenhado / Região de Atuação
            </label>
            <input
              type="text"
              readOnly={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
              value={formData.localEmpenhado || ''}
              onChange={e => handleInputChange('localEmpenhado', e.target.value)}
              placeholder="Ex: Fazenda São Bento - Pantanal da Nhecolândia / Parque Estadual do Pantanal do Rio Negro"
            />
          </div>
        </div>
      </div>

      {/* PAINEL DE INSERÇÃO DE NOVOS MATERIAIS */}
      {!isReadOnly && (
        <div className="bg-red-50/60 p-5 rounded-lg border border-red-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-red-900 flex items-center">
              <PackagePlus className="w-5 h-5 mr-2 text-red-800" />
              Inserir Novo Material na Cautela
            </h4>
            <span className="text-xs text-red-700">Adiciona itens avulsos ou extras à lista</span>
          </div>

          <form onSubmit={handleAddNewMaterial} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição do Material *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Ex: Motobomba Flutuante, Mangote 2 1/2, Fita Zebrada..."
                value={newMaterialDesc}
                onChange={e => setNewMaterialDesc(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nº do Material / Patrimônio</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                placeholder="Ex: PAT-4081, Série..."
                value={newMaterialId}
                onChange={e => setNewMaterialId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                value={newMaterialQty}
                onChange={e => setNewMaterialQty(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-red-800 hover:bg-red-900 text-white text-sm font-semibold rounded-md shadow flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5 shrink-0" />
                Inserir Material
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABELA DE MATERIAIS / CHECKLIST */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <Wrench className="w-5 h-5 mr-2 text-red-800" />
              {formData.type === 'VIATURA' ? 'Checklist da Viatura' : 'Relação de Materiais Cautelados'}
            </h3>
            <p className="text-xs text-gray-500">
              {formData.type === 'MATERIAL_PADRONIZADO'
                ? 'Informe a quantidade e a numeração/patrimônio dos materiais a serem cautelados.'
                : formData.type === 'VIATURA'
                ? 'Verifique o estado de conservação de cada componente da viatura.'
                : 'Relação personalizada de materiais.'}
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={addBlankItem}
                className="inline-flex items-center px-3 py-1.5 border border-red-800 text-xs font-semibold rounded text-red-800 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Linha
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs font-semibold tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 min-w-[220px]">
                  {formData.type === 'VIATURA' ? 'Item Verificado' : 'Descrição do Material'}
                </th>
                
                {/* Coluna de Numeração do Material (explicitamente solicitada para materiais padronizados) */}
                {formData.type !== 'VIATURA' && (
                  <th className="px-4 py-3 min-w-[180px]">
                    Nº do Material / Patrimônio
                  </th>
                )}

                {formData.type !== 'VIATURA' && (
                  <th className="px-4 py-3 w-28 text-center">Qtd Cautelada</th>
                )}

                <th className="px-4 py-3 min-w-[170px]">
                  Condição (Retirada)
                </th>

                <th className="px-4 py-3 min-w-[180px]">
                  Observações
                </th>

                {!isReadOnly && (
                  <th className="px-3 py-3 w-16 text-center">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, idx) => {
                const isItemEditable = !isReadOnly && (formData.type === 'ESPECIFICA' || item.isCustom);
                const hasQty = Number(item.quantity) > 0;
                
                return (
                  <tr 
                    key={idx} 
                    className={`transition-colors ${
                      hasQty && formData.type !== 'VIATURA' ? 'bg-red-50/30' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Descrição */}
                    <td className="px-4 py-2.5">
                      {isItemEditable ? (
                        <input
                          type="text"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-red-500 focus:border-red-500 font-medium text-gray-900"
                          value={item.description || ''}
                          onChange={e => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Descrição do material..."
                        />
                      ) : (
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{item.description}</span>
                          {item.isCustom && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded font-semibold">
                              Avulso
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Numeração do Material / Patrimônio */}
                    {formData.type !== 'VIATURA' && (
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          readOnly={isReadOnly}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-red-500 focus:border-red-500 bg-white"
                          value={item.identification || ''}
                          onChange={e => handleItemChange(idx, 'identification', e.target.value)}
                          placeholder="Ex: Nº série, plaqueta, chassi..."
                        />
                      </td>
                    )}

                    {/* Quantidade */}
                    {formData.type !== 'VIATURA' && (
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          readOnly={isReadOnly}
                          className="w-20 mx-auto px-2.5 py-1.5 border border-gray-300 rounded text-sm text-center font-semibold focus:ring-red-500 focus:border-red-500 bg-white"
                          value={item.quantity === undefined ? '' : item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0"
                        />
                      </td>
                    )}

                    {/* Condição */}
                    <td className="px-4 py-2.5">
                      <select
                        disabled={isReadOnly}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:ring-red-500 focus:border-red-500 bg-white"
                        value={item.conditionWithdrawal || 'Sem Alteração'}
                        onChange={e => handleItemChange(idx, 'conditionWithdrawal', e.target.value)}
                      >
                        <option value="Sem Alteração">Sem Alteração (Em condições)</option>
                        <option value="Bom">Bom estado de conservação</option>
                        <option value="Regular">Regular com desgaste de uso</option>
                        <option value="Com Avaria">Com avaria / Manutenção requerida</option>
                        <option value="Não se Aplica">Não se Aplica</option>
                      </select>
                    </td>

                    {/* Observações */}
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
                          {!isReadOnly && (item.conditionWithdrawal === 'Com Avaria' || item.conditionWithdrawal === 'Regular') && (
                            <label 
                              className="cursor-pointer text-gray-600 hover:text-red-700 transition px-2 py-1.5 border border-gray-300 rounded bg-gray-50 hover:bg-red-50 flex items-center gap-1.5 shrink-0 shadow-xs"
                              title="Fotografar ou anexar imagem da avaria"
                            >
                              {uploadingImage === idx ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                              ) : (
                                <Camera className="w-4 h-4 text-red-600" />
                              )}
                              <span className="text-xs font-semibold text-gray-700 hidden sm:inline">
                                {uploadingImage === idx ? 'Salvando...' : 'Foto'}
                              </span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(idx, e)} 
                              />
                            </label>
                          )}
                        </div>
                        {item.photosWithdrawal && item.photosWithdrawal.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.photosWithdrawal.map((url, pIdx) => (
                              <div key={pIdx} className="relative group inline-block">
                                <img 
                                  src={url} 
                                  alt="Avaria" 
                                  onClick={() => setPreviewImage(url)}
                                  className="w-12 h-12 object-cover rounded border border-gray-300 cursor-pointer hover:opacity-85 transition shadow-xs" 
                                  title="Clique para ampliar"
                                />
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(idx, pIdx)}
                                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow transition"
                                    title="Remover foto"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    {!isReadOnly && (
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remover linha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nenhum material listado. Clique no botão &quot;Inserir Material&quot; acima para adicionar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTÃO DE SALVAR */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            * Assegure-se de salvar os dados antes de proceder para a assinatura eletrônica da cautela.
          </p>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || (!existingCaution && openCycles.length === 0)}
            className="px-6 py-2.5 bg-red-800 hover:bg-red-900 text-white rounded-md font-semibold text-sm flex items-center shadow transition-colors disabled:opacity-50"
            title={!existingCaution && openCycles.length === 0 ? "Requer ciclo operacional aberto" : "Salvar informações"}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : ((existingCaution?.status === 'COM_DIVERGENCIA' || existingCaution?.status === 'AGUARDANDO_ASSINATURA_MILITAR') ? 'Salvar Correção' : 'Salvar Rascunho')}
          </button>
        </div>
      )}
      {/* Modal para Visualizar a Foto em Tamanho Real */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Camera className="w-4 h-4 text-red-600" />
                Fotografia da Avaria / Material
              </span>
              <button 
                type="button"
                onClick={() => setPreviewImage(null)} 
                className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-gray-100 transition"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-900 overflow-auto">
              <img 
                src={previewImage} 
                alt="Foto da avaria em alta resolução" 
                className="max-h-[75vh] w-auto max-w-full object-contain rounded shadow"
              />
            </div>
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-right">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
