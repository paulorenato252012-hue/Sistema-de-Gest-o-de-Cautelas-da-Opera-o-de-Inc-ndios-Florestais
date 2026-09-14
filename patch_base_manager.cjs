const fs = require('fs');
let code = fs.readFileSync('src/components/AdvancedBaseManager.tsx', 'utf8');

// Add imports
code = code.replace("import { AdvancedBase } from '../lib/types';", "import { AdvancedBase, Cycle, User } from '../lib/types';\nimport { Send } from 'lucide-react';");

// Add state for modal
const stateInsert = `
  const [active, setActive] = useState(true);

  const [showSendModal, setShowSendModal] = useState<AdvancedBase | null>(null);
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
`;

code = code.replace("  const [active, setActive] = useState(true);", stateInsert);

const modalRender = `
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
`;

code = code.replace("{bases.map(base => (", modalRender + "\n        {bases.map(base => (");

const sendButton = `
              <div className="flex space-x-1">
                <button onClick={() => setShowSendModal(base)} title="Enviar Cautela para Militar" className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded mr-2 flex items-center"><Send className="w-4 h-4 mr-1"/> Enviar Cautela</button>
                <button onClick={() => handleOpenForm(base)} className="p-1.5 text-gray-400 hover:text-gray-900 rounded"><Edit className="w-4 h-4"/></button>
`;

code = code.replace(/<div className="flex space-x-1">\s*<button onClick=\{\(\) => handleOpenForm\(base\)\}/, sendButton);

fs.writeFileSync('src/components/AdvancedBaseManager.tsx', code);
