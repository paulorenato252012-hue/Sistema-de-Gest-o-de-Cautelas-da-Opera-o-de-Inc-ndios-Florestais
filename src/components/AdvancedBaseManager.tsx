import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AdvancedBase, Cycle, User } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { logAudit } from '../lib/audit';
import { DeleteBaseModal } from './DeleteBaseModal';
import { Send, PlusCircle, Save, X, Edit, Trash2, MapPin, Package, CheckCircle2 } from 'lucide-react';

export function AdvancedBaseManager() {
  const { userProfile } = useAuth();
  const [bases, setBases] = useState<AdvancedBase[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBase, setEditingBase] = useState<AdvancedBase | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState<{description: string, quantity: number, unit: string}[]>([]);

  const [active, setActive] = useState(true);

  const [showSendModal, setShowSendModal] = useState<AdvancedBase | null>(null);
  const [baseToDelete, setBaseToDelete] = useState<AdvancedBase | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubCycles = onSnapshot(collection(db, 'cycles'), snap => {
      setCycles(snap.docs.map(d => ({id: d.id, ...d.data()} as Cycle)).filter(c => c.status === 'ABERTO'));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({id: d.id, ...d.data()} as User)).filter(u => u.ativo && u.perfil === 'MILITAR'));
    });
    return () => {
      unsubCycles();
      unsubUsers();
    };
  }, []);

  const handleSendCaution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSendModal || !selectedCycle || !selectedUser) return;
    setSending(true);
    try {
      // 1. Create Caution
      const cautionRef = await addDoc(collection(db, 'cautions'), {
        cycleId: selectedCycle,
        type: 'MATERIAL_PADRONIZADO',
        status: 'AGUARDANDO_ASSINATURA_MILITAR',
        responsibleUserId: selectedUser,
        unitGcif: 'Definido pela Base Avançada',
        base: showSendModal.name,
        createdAt: new Date().toISOString(),
        version: 1
      });

      // 2. Add Items
      for (const matStr of showSendModal.defaultMaterials || []) {
        try {
          const mat = JSON.parse(matStr);
          await addDoc(collection(db, 'cautions', cautionRef.id, 'items'), {
            description: mat.description,
            quantity: mat.quantity,
            unit: mat.unit,
            identification: '',
            conditionWithdrawal: 'SEM_ALTERACAO',
            observationWithdrawal: 'Item de Base Avançada'
          });
        } catch (e) {
          await addDoc(collection(db, 'cautions', cautionRef.id, 'items'), {
            description: matStr,
            quantity: 1,
            unit: 'UN',
            identification: '',
            conditionWithdrawal: 'SEM_ALTERACAO',
            observationWithdrawal: 'Item de Base Avançada'
          });
        }
      }
      setShowSendModal(null);
      setSelectedCycle('');
      setSelectedUser('');
      alert('Cautela enviada com sucesso para o militar!');
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar cautela.');
    } finally {
      setSending(false);
    }
  };


  useEffect(() => {
    const q = query(collection(db, 'advancedBases'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setBases(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdvancedBase)));
    });
    return unsub;
  }, []);

  const handleOpenForm = (base?: AdvancedBase) => {
    if (base) {
      setEditingBase(base);
      setName(base.name);
      setDescription(base.description || '');
      setMaterials(base.defaultMaterials ? base.defaultMaterials.map(m => {
        try {
          const parsed = JSON.parse(m);
          return parsed;
        } catch {
          return { description: m, quantity: 1, unit: 'UN' };
        }
      }) : []);
      setActive(base.active);
    } else {
      setEditingBase(null);
      setName('');
      setDescription('');
      setMaterials([{ description: '', quantity: 1, unit: 'UN' }]);
      setActive(true);
    }
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    // Filter valid materials and serialize as JSON strings to fit the schema (array of strings)
    const validMaterials = materials
      .filter(m => m.description.trim())
      .map(m => JSON.stringify({
        description: m.description.trim(),
        quantity: Number(m.quantity) || 1,
        unit: m.unit || 'UN'
      }));

    try {
      const data = {
        name,
        description,
        defaultMaterials: validMaterials,
        active
      };

      if (editingBase) {
        await updateDoc(doc(db, 'advancedBases', editingBase.id), data);

        // Registrar auditoria da atualização de base ou alteração/remoção de seus materiais
        const adminIdent = `${userProfile?.postoGraduacao || ''} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula || 'ADMIN'}`.trim();
        const matSummary = validMaterials.length > 0 
          ? validMaterials.map((m: string) => {
              try {
                const parsed = JSON.parse(m);
                return `${parsed.quantity} ${parsed.unit} ${parsed.description}`;
              } catch {
                return m;
              }
            }).join('; ')
          : 'Nenhum material';

        await logAudit(
          'EDITAR_BASE_AVANCADA',
          userProfile,
          `O administrador ${adminIdent} (Matrícula: ${userProfile?.matricula || 'N/A'}) alterou a Base Avançada "${name}" (ID: ${editingBase.id}, Status: ${active ? 'Ativa' : 'Inativa'}). Materiais configurados (${validMaterials.length} itens): [${matSummary}].`
        );

        setNotification({
          type: 'success',
          message: `Base Avançada "${name}" atualizada com sucesso.`
        });
      } else {
        const newDoc = await addDoc(collection(db, 'advancedBases'), data);

        const adminIdent = `${userProfile?.postoGraduacao || ''} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula || 'ADMIN'}`.trim();
        const matSummary = validMaterials.length > 0 
          ? validMaterials.map((m: string) => {
              try {
                const parsed = JSON.parse(m);
                return `${parsed.quantity} ${parsed.unit} ${parsed.description}`;
              } catch {
                return m;
              }
            }).join('; ')
          : 'Nenhum material';

        await logAudit(
          'CRIAR_BASE_AVANCADA',
          userProfile,
          `O administrador ${adminIdent} (Matrícula: ${userProfile?.matricula || 'N/A'}) cadastrou a Base Avançada "${name}" (ID: ${newDoc.id}). Materiais vinculados (${validMaterials.length} itens): [${matSummary}].`
        );

        setNotification({
          type: 'success',
          message: `Base Avançada "${name}" cadastrada com sucesso.`
        });
      }
      setTimeout(() => setNotification(null), 5000);
      setShowForm(false);
    } catch (err) {
      console.error('Error saving base:', err);
      setNotification({
        type: 'error',
        message: 'Erro ao salvar base avançada.'
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleDelete = (base: AdvancedBase) => {
    setBaseToDelete(base);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />}
            <span>{notification.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bases Avançadas</h2>
          <p className="text-xs text-gray-500 mt-1">Gerencie as bases e seus materiais padrão para facilitar a criação de cautelas.</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center px-4 py-2 bg-red-800 text-white rounded-lg text-sm font-bold hover:bg-red-900 transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Base
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="font-bold text-gray-900">{editingBase ? 'Editar Base Avançada' : 'Cadastrar Base Avançada'}</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Base</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500" placeholder="Ex: Base Pantanal Corumbá" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
              <select value={active ? 'true' : 'false'} onChange={e => setActive(e.target.value === 'true')} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Descrição / Observação</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-500" placeholder="Localização, responsável, etc." />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-bold text-gray-900 flex items-center">
                <Package className="w-4 h-4 mr-1.5 text-gray-500"/>
                Materiais Padrão (Template)
              </label>
              <button
                type="button"
                onClick={() => setMaterials([...materials, { description: '', quantity: 1, unit: 'UN' }])}
                className="text-xs font-bold text-red-700 hover:text-red-800"
              >
                + Adicionar Item
              </button>
            </div>
            
            <div className="space-y-3">
              {materials.map((mat, index) => (
                <div key={index} className="flex items-start gap-2 bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <input type="text" value={mat.description} onChange={e => {
                      const newMats = [...materials];
                      newMats[index].description = e.target.value;
                      setMaterials(newMats);
                    }} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mb-2" placeholder="Descrição do material..." />
                    <div className="flex gap-2">
                      <input type="number" min="1" value={mat.quantity} onChange={e => {
                        const newMats = [...materials];
                        newMats[index].quantity = Number(e.target.value);
                        setMaterials(newMats);
                      }} className="w-24 px-3 py-1.5 border border-gray-300 rounded text-sm" placeholder="Qtd" />
                      <input type="text" value={mat.unit} onChange={e => {
                        const newMats = [...materials];
                        newMats[index].unit = e.target.value;
                        setMaterials(newMats);
                      }} className="w-24 px-3 py-1.5 border border-gray-300 rounded text-sm uppercase" placeholder="UN, L, PC..." />
                    </div>
                  </div>
                  <button type="button" onClick={() => {
                    const newMats = materials.filter((_, i) => i !== index);
                    setMaterials(newMats.length ? newMats : [{ description: '', quantity: 1, unit: 'UN' }]);
                  }} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="flex items-center px-4 py-2 bg-red-800 text-white text-sm font-bold rounded-lg hover:bg-red-900 shadow-xs">
              <Save className="w-4 h-4 mr-2" /> Salvar Base
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
              <Send className="w-5 h-5 mr-2 text-red-700" />
              Enviar Cautela: {showSendModal.name}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Isto criará uma nova cautela com os materiais padrão desta base, já no status <strong>Aguardando Assinatura</strong>, para o militar selecionado.
            </p>
            <form onSubmit={handleSendCaution} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ciclo Aberto</label>
                <select required value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Selecione o Ciclo...</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Militar Responsável</label>
                <select required value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Selecione o Militar...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.postoGraduacao} {u.nomeGuerra} ({u.matricula})</option>)}
                </select>
              </div>
              <div className="flex justify-end pt-4 space-x-3">
                <button type="button" onClick={() => setShowSendModal(null)} className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={sending} className="px-4 py-2 bg-red-800 text-white font-bold rounded-lg hover:bg-red-900 disabled:opacity-50 flex items-center">
                  {sending ? 'Enviando...' : 'Enviar Cautela'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {bases.map(base => (
          <div key={base.id} className={`bg-white rounded-xl shadow-sm border p-4 ${!base.active && 'opacity-60'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${base.active ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{base.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${base.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                    {base.active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-1">
                <button onClick={() => setShowSendModal(base)} title="Enviar Cautela para Militar" className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded mr-2 flex items-center"><Send className="w-4 h-4 mr-1"/> Enviar Cautela</button>
                <button onClick={() => handleOpenForm(base)} className="p-1.5 text-gray-400 hover:text-gray-900 rounded"><Edit className="w-4 h-4"/></button>
                <button onClick={() => handleDelete(base)} title="Excluir Base Avançada (requer senha de administrador)" className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
            {base.description && <p className="text-xs text-gray-500 mb-3">{base.description}</p>}
            <div className="bg-gray-50 rounded-lg p-3 text-xs border border-gray-100">
              <strong className="block text-gray-700 mb-1">Materiais Padrão:</strong>
              <ul className="space-y-1 text-gray-600">
                {(base.defaultMaterials || []).slice(0, 3).map((m, i) => {
                  try {
                    const parsed = JSON.parse(m);
                    return <li key={i}>• {parsed.quantity} {parsed.unit} {parsed.description}</li>;
                  } catch {
                    return <li key={i}>• {m}</li>;
                  }
                })}
                {(base.defaultMaterials || []).length > 3 && (
                  <li className="text-gray-400 italic font-medium">+ {(base.defaultMaterials || []).length - 3} itens...</li>
                )}
                {(base.defaultMaterials || []).length === 0 && <li className="text-gray-400 italic">Nenhum material cadastrado</li>}
              </ul>
            </div>
          </div>
        ))}
        {bases.length === 0 && !showForm && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-500">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Nenhuma base avançada cadastrada.</p>
          </div>
        )}
      </div>

      {/* Modal de Exclusão de Base com Senha de Administrador e Auditoria */}
      {baseToDelete && (
        <DeleteBaseModal
          base={baseToDelete}
          isOpen={!!baseToDelete}
          onClose={() => setBaseToDelete(null)}
          onSuccess={() => {
            const deletedName = baseToDelete.name;
            setBaseToDelete(null);
            setNotification({
              type: 'success',
              message: `Base Avançada "${deletedName}" excluída com sucesso! Exclusão e lista de materiais registradas na auditoria institucional.`
            });
            setTimeout(() => setNotification(null), 6000);
          }}
        />
      )}
    </div>
  );
}
