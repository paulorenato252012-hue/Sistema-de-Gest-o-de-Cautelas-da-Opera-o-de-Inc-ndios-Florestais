import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, getDocs, setDoc, getDoc, deleteDoc, where } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Cycle, User, MaterialCatalog, Vehicle, Caution, CautionItem, Signature } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { logAudit } from '../lib/audit';
import { 
  PlusCircle, 
  Edit2, 
  Trash2,
  Check, 
  X, 
  Download, 
  Eye, 
  EyeOff,
  ChevronDown, 
  ChevronUp, 
  FileCheck2, 
  ShieldCheck, 
  Boxes, 
  Truck, 
  RefreshCw,
  FolderOpen,
  AlertTriangle,
  BarChart2,
  Clock
} from 'lucide-react';
import { generateCautionPDF, generateDescautelaPDF } from '../lib/pdfGenerator';
import { AdminDescautelaManager } from './AdminDescautelaManager';
import { AdminDashboard } from './AdminDashboard';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdvancedBaseManager } from './AdvancedBaseManager';
import { DescautelaModal } from './DescautelaModal';
import { useNavigate } from 'react-router-dom';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'audit' | 'cycles' | 'descautela_admin' | 'users' | 'materials' | 'vehicles' | 'bases'>('cycles');
  const [pendingDescautelaCount, setPendingDescautelaCount] = useState(0);

  // Monitor pending cautions for badge counter
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'cautions'), (snap) => {
      const pending = snap.docs.filter(d => {
        const data = d.data();
        return ['CAUTELADA', 'DEVOLUCAO_INICIADA', 'COM_DIVERGENCIA'].includes(data.status);
      }).length;
      setPendingDescautelaCount(pending);
    });
    return unsub;
  }, []);
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Painel Administrativo</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestão Operacional, Descautelas a Pedido, Ciclos, Efetivo e Viaturas • TIF
          </p>
        </div>
      </div>
      
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-bold text-sm flex items-center transition-colors ${
              activeTab === 'dashboard' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Dashboard & Exportação
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-bold text-sm flex items-center transition-colors ${
              activeTab === 'audit' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Auditoria
          </button>
          <button
            onClick={() => setActiveTab('cycles')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-bold text-sm flex items-center transition-colors ${
              activeTab === 'cycles' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Ciclos Operacionais & Cautelas
          </button>

          <button
            onClick={() => setActiveTab('descautela_admin')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-bold text-sm flex items-center transition-colors ${
              activeTab === 'descautela_admin' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileCheck2 className="w-4 h-4 mr-2 text-green-600" />
            Descautela a Pedido do Militar
            {pendingDescautelaCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full font-bold">
                {pendingDescautelaCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-bold text-sm flex items-center transition-colors ${
              activeTab === 'users' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Militares & Administradores
          </button>
          <button
            onClick={() => setActiveTab('bases')}
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-bold text-sm flex items-center transition-colors ${
              activeTab === 'bases' ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Boxes className="w-4 h-4 mr-2" />
            Bases Avançadas
          </button>
        </nav>
      </div>

      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'audit' && <AdminAuditLogs />}
      {activeTab === 'cycles' && <CycleManager />}
      {activeTab === 'descautela_admin' && <AdminDescautelaManager />}
      {activeTab === 'users' && <UserManager />}
      {activeTab === 'bases' && <AdvancedBaseManager />}
    </div>
  );
}

const safeFormatDate = (val: any) => {
  if (!val) return '-';
  try {
    const d = new Date(val?.toDate ? val.toDate() : val);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
  } catch (e) {
    return '-';
  }
};

function CycleManager() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [cautions, setCautions] = useState<Caution[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', startDate: '', endDate: '', status: 'ABERTO' as Cycle['status'] });
  
  // Expanded cycle state to see cautions inside
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);
  const [downloadingCautionId, setDownloadingCautionId] = useState<string | null>(null);
  const [downloadingAllForCycle, setDownloadingAllForCycle] = useState<string | null>(null);
  const [descautelaCaution, setDescautelaCaution] = useState<Caution | null>(null);

  // Estados de confirmação e notificação para exclusão de ciclo
  const [cycleToDelete, setCycleToDelete] = useState<Cycle | null>(null);
  const [deleteCycleLoading, setDeleteCycleLoading] = useState(false);
  const [cycleNotification, setCycleNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // 1. Listen to cycles
    const qCycles = query(collection(db, 'cycles'), orderBy('createdAt', 'desc'));
    const unsubCycles = onSnapshot(qCycles, (snap) => {
      setCycles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle)));
    });

    // 2. Listen to all cautions
    const unsubCautions = onSnapshot(collection(db, 'cautions'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caution));
      list.sort((a, b) => (((b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt || 0).getTime()) - ((a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt || 0).getTime())));
      setCautions(list);
    });

    // 3. Listen to users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const map: Record<string, User> = {};
      snap.docs.forEach(doc => {
        map[doc.id] = { id: doc.id, ...doc.data() } as User;
      });
      setUsersMap(map);
    });

    return () => {
      unsubCycles();
      unsubCautions();
      unsubUsers();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'cycles', editingId), { ...formData });
        setCycleNotification({ type: 'success', message: `Ciclo "${formData.name}" atualizado com sucesso.` });
      } else {
        await addDoc(collection(db, 'cycles'), {
          ...formData,
          bases: [],
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.id
        });
        setCycleNotification({ type: 'success', message: `Novo ciclo "${formData.name}" cadastrado com sucesso.` });
      }
      setTimeout(() => setCycleNotification(null), 4000);
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', startDate: '', endDate: '', status: 'ABERTO' });
    } catch (err) {
      console.error(err);
      setCycleNotification({ type: 'error', message: 'Erro ao salvar dados do ciclo.' });
      setTimeout(() => setCycleNotification(null), 4000);
    }
  };

  const handleDeleteCycle = (cycle: Cycle) => {
    setCycleToDelete(cycle);
  };

  const executeDeleteCycle = async () => {
    if (!cycleToDelete) return;
    setDeleteCycleLoading(true);
    try {
      await deleteDoc(doc(db, 'cycles', cycleToDelete.id));
      const adminIdent = `${userProfile?.postoGraduacao || ''} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula || 'ADMIN'}`.trim();
      await logAudit(
        'EXCLUIR_CICLO',
        userProfile,
        `O administrador ${adminIdent} (Matrícula: ${userProfile?.matricula || 'N/A'}, Email: ${userProfile?.email || 'N/A'}) excluiu o ciclo "${cycleToDelete.name}" (Status: ${cycleToDelete.status === 'ABERTO' ? 'Aberto' : 'Encerrado'}, ID: ${cycleToDelete.id}).`
      );

      setCycleNotification({
        type: 'success',
        message: `Ciclo "${cycleToDelete.name}" excluído com sucesso. Exclusão registrada na auditoria.`
      });
      setTimeout(() => setCycleNotification(null), 4000);
      setCycleToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir ciclo:', err);
      setCycleNotification({
        type: 'error',
        message: 'Erro ao excluir o ciclo no banco de dados.'
      });
      setTimeout(() => setCycleNotification(null), 4500);
    } finally {
      setDeleteCycleLoading(false);
    }
  };

  const handleEdit = (cycle: Cycle) => {
    setFormData({ name: cycle.name, startDate: cycle.startDate, endDate: cycle.endDate, status: cycle.status });
    setEditingId(cycle.id);
    setShowForm(true);
  };

  // Helper to trigger single caution PDF download
  const handleDownloadSinglePDF = async (caution: Caution) => {
    try {
      setDownloadingCautionId(caution.id);
      const itemsSnap = await getDocs(collection(db, 'cautions', caution.id, 'items'));
      const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CautionItem));

      const sigsSnap = await getDocs(query(collection(db, 'cautions', caution.id, 'signatures'), orderBy('signedAtUtc', 'asc')));
      const sigs = sigsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Signature));

      let milUser = usersMap[caution.responsibleUserId] || null;
      if (!milUser && caution.responsibleUserId) {
        const uSnap = await getDoc(doc(db, 'users', caution.responsibleUserId));
        if (uSnap.exists()) {
          milUser = { id: uSnap.id, ...uSnap.data() } as User;
        }
      }

      generateCautionPDF(caution, items, sigs, milUser);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Não foi possível gerar o PDF desta cautela.');
    } finally {
      setDownloadingCautionId(null);
    }
  };

  // Helper to trigger descautela PDF download
  const handleDownloadDescautelaPDF = async (caution: Caution) => {
    try {
      setDownloadingCautionId(caution.id);
      const itemsSnap = await getDocs(collection(db, 'cautions', caution.id, 'items'));
      const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CautionItem));

      const sigsSnap = await getDocs(query(collection(db, 'cautions', caution.id, 'signatures'), orderBy('signedAtUtc', 'asc')));
      const sigs = sigsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Signature));

      let milUser = usersMap[caution.responsibleUserId] || null;
      if (!milUser && caution.responsibleUserId) {
        const uSnap = await getDoc(doc(db, 'users', caution.responsibleUserId));
        if (uSnap.exists()) {
          milUser = { id: uSnap.id, ...uSnap.data() } as User;
        }
      }

      generateDescautelaPDF(caution, items, sigs, milUser, userProfile as User);
    } catch (err) {
      console.error('Erro ao gerar Termo de Descautela:', err);
      alert('Não foi possível gerar o PDF do Termo de Descautela.');
    } finally {
      setDownloadingCautionId(null);
    }
  };

  // Helper to download all cautions in a cycle
  const handleDownloadAllCyclePDFs = async (cycleCautions: Caution[], cycleName: string) => {
    if (cycleCautions.length === 0) return;
    setDownloadingAllForCycle(cycleName);

    try {
      for (const caution of cycleCautions) {
        await handleDownloadSinglePDF(caution);
        // Small delay to allow browser download handling
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err) {
      console.error('Erro ao baixar todas as cautelas:', err);
    } finally {
      setDownloadingAllForCycle(null);
    }
  };

  return (
    <div className="space-y-6">
      {cycleNotification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in duration-150 ${
          cycleNotification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center space-x-2.5">
            {cycleNotification.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{cycleNotification.message}</span>
          </div>
          <button 
            onClick={() => setCycleNotification(null)}
            className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gerenciar Ciclos Operacionais & Cautelas</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Visualize as cautelas realizadas dentro de cada ciclo e baixe os termos em PDF.
          </p>
        </div>
        <button 
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', startDate: '', endDate: '', status: 'ABERTO' });
          }} 
          className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 text-xs font-bold flex items-center shadow-xs transition-colors"
        >
          {!showForm && <PlusCircle className="w-4 h-4 mr-2" />}
          <span>{showForm ? 'Cancelar' : 'Novo Ciclo'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nome/Número do Ciclo</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Ciclo Pantanal I - 2026" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
            <select className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Cycle['status']})}>
              <option value="ABERTO">Aberto</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Data Inicial</label>
            <input required type="date" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Data Final</label>
            <input required type="date" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
          </div>
          <div className="md:col-span-2 pt-2">
            <button type="submit" className="bg-red-800 hover:bg-red-900 text-white font-bold px-5 py-2.5 rounded-lg text-xs shadow-xs transition-colors">
              {editingId ? 'Atualizar Ciclo' : 'Salvar Ciclo'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Ciclos com Cautelas Vinculadas */}
      <div className="space-y-4">
        {cycles.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 text-sm">
            Nenhum ciclo operacional cadastrado ainda. Clique em "Novo Ciclo" para criar o primeiro.
          </div>
        ) : (
          cycles.map(cycle => {
            // Filter cautions matching this cycle
            const cycleCautions = cautions.filter(c => 
              c.cycleId === cycle.id || 
              (cycle.name && c.unitGcif === cycle.name)
            );
            const activeCount = cycleCautions.filter(c => ['CAUTELADA', 'DEVOLUCAO_INICIADA', 'COM_DIVERGENCIA'].includes(c.status)).length;
            const descauteladasCount = cycleCautions.filter(c => c.status === 'DESCAUTELADA').length;
            const isExpanded = expandedCycleId === cycle.id;

            return (
              <div 
                key={cycle.id} 
                className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Cabeçalho do Ciclo */}
                <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-gray-900 text-base">{cycle.name}</h3>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                        cycle.status === 'ABERTO' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {cycle.status === 'ABERTO' ? 'Aberto' : 'Encerrado'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500">
                      Período: {cycle.startDate ? format(new Date(cycle.startDate), 'dd/MM/yyyy') : '-'} até {cycle.endDate ? format(new Date(cycle.endDate), 'dd/MM/yyyy') : '-'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded-md font-semibold">
                        Total de Cautelas: <strong>{cycleCautions.length}</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                        Ativas: <strong>{activeCount}</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-green-50 text-green-800 border border-green-200 rounded-md">
                        Descauteladas: <strong>{descauteladasCount}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    {/* Botão de Expandir Cautelas */}
                    <button
                      onClick={() => setExpandedCycleId(isExpanded ? null : cycle.id)}
                      className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-lg text-xs font-bold flex items-center shadow-2xs transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 mr-1.5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 mr-1.5 text-gray-500" />
                      )}
                      <span>
                        {isExpanded ? 'Ocultar Cautelas' : `Ver Cautelas (${cycleCautions.length})`}
                      </span>
                    </button>

                    {/* Botão de Baixar Todas em PDF */}
                    {cycleCautions.length > 0 && (
                      <button
                        onClick={() => handleDownloadAllCyclePDFs(cycleCautions, cycle.name)}
                        disabled={downloadingAllForCycle === cycle.name}
                        className="px-3.5 py-2 bg-red-800 hover:bg-red-900 text-white rounded-lg text-xs font-bold flex items-center shadow-xs transition-colors disabled:opacity-50"
                        title="Baixar PDF de todas as cautelas deste ciclo"
                      >
                        {downloadingAllForCycle === cycle.name ? (
                          <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-1.5" />
                        )}
                        Baixar Todas em PDF
                      </button>
                    )}

                    {/* Editar ciclo */}
                    <button 
                      onClick={() => handleEdit(cycle)} 
                      className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Editar ciclo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Excluir ciclo */}
                    <button 
                      onClick={() => handleDeleteCycle(cycle)} 
                      className="p-2 text-red-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                      title="Excluir ciclo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Lista Expandida de Cautelas Deste Ciclo */}
                {isExpanded && (
                  <div className="p-5 border-t border-gray-200 bg-white space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                        Cautelas Realizadas no Ciclo: {cycle.name}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {cycleCautions.length} registro(s) encontrado(s)
                      </span>
                    </div>

                    {cycleCautions.length === 0 ? (
                      <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-xs text-gray-500">
                        Nenhuma cautela foi vinculada a este ciclo até o momento.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                        {cycleCautions.map(caution => {
                          const milUser = usersMap[caution.responsibleUserId];
                          const milName = milUser 
                            ? `${milUser.postoGraduacao} ${milUser.nomeGuerra || milUser.nomeCompleto}` 
                            : (caution.commanderName || 'Militar Responsável');
                          const milMatr = milUser?.matricula || '-';

                          return (
                            <div 
                              key={caution.id} 
                              className="p-3.5 hover:bg-gray-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                                    caution.type === 'VIATURA' 
                                      ? 'bg-blue-50 text-blue-800' 
                                      : caution.type === 'MATERIAL_PADRONIZADO'
                                      ? 'bg-amber-50 text-amber-800'
                                      : 'bg-purple-50 text-purple-800'
                                  }`}>
                                    {caution.type === 'VIATURA' ? 'Viatura' : caution.type === 'MATERIAL_PADRONIZADO' ? 'Kit Padronizado' : 'Específica'}
                                  </span>

                                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                                    caution.status === 'DESCAUTELADA'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {(caution.status || 'DESCONHECIDO').replace(/_/g, ' ')}
                                  </span>

                                  <span className="text-[11px] font-mono text-gray-500">
                                    #{(caution.id || "").substring(0, 8)}
                                  </span>
                                </div>

                                <p className="text-xs font-bold text-gray-900">
                                  Militar: {milName} <span className="text-gray-500 font-normal font-mono">(Mat: {milMatr})</span>
                                </p>

                                <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-500">
                                  <span>Base: <strong>{caution.base || 'Pantanal'}</strong></span>
                                  {caution.vehiclePrefixo && (
                                    <span>Vtr: <strong>{caution.vehiclePrefixo} ({caution.vehiclePlaca || 'S/P'})</strong></span>
                                  )}
                                  <span>Data: <strong>{caution.createdAt ? safeFormatDate(caution.createdAt) : '-'}</strong></span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {/* Ícone e ação de Realizar Descautela exclusivo para Administradores */}
                                {['CAUTELADA', 'DEVOLUCAO_INICIADA', 'COM_DIVERGENCIA'].includes(caution.status || '') && (
                                  <button
                                    onClick={() => setDescautelaCaution(caution)}
                                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center shadow-xs transition-colors"
                                    title="Somente Administradores realizam a conferência e descautela"
                                  >
                                    <FileCheck2 className="w-3.5 h-3.5 mr-1.5 text-emerald-200" />
                                    Realizar Descautela
                                  </button>
                                )}

                                {/* Se já estiver descautelada, opção de baixar o Termo de Descautela oficial */}
                                {caution.status === 'DESCAUTELADA' && (
                                  <button
                                    onClick={() => handleDownloadDescautelaPDF(caution)}
                                    disabled={downloadingCautionId === caution.id}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center transition-colors disabled:opacity-50"
                                    title="Baixar Termo Oficial de Descautela e Baixa com assinaturas"
                                  >
                                    {downloadingCautionId === caution.id ? (
                                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    ) : (
                                      <Download className="w-3.5 h-3.5 mr-1.5" />
                                    )}
                                    Termo Descautela (PDF)
                                  </button>
                                )}

                                {/* Baixar Cautela em PDF */}
                                <button
                                  onClick={() => handleDownloadSinglePDF(caution)}
                                  disabled={downloadingCautionId === caution.id}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold flex items-center transition-colors disabled:opacity-50"
                                  title="Baixar Cautela em PDF"
                                >
                                  {downloadingCautionId === caution.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                  )}
                                  {caution.status === 'DESCAUTELADA' ? 'Cautela Inicial (PDF)' : 'Baixar Cautela (PDF)'}
                                </button>

                                <button
                                  onClick={() => navigate(`/cautions/${caution.id}`)}
                                  className="px-3 py-1.5 text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors flex items-center text-xs font-bold"
                                  title="Ver detalhes da cautela"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                                  Visualizar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Descautela Oficial pelo Administrador */}
      {descautelaCaution && (
        <DescautelaModal
          caution={descautelaCaution}
          onClose={() => setDescautelaCaution(null)}
          onSuccess={() => setDescautelaCaution(null)}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Ciclo com Auditoria */}
      {cycleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-3 rounded-xl shrink-0 bg-red-100 text-red-700">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 leading-snug">
                  Excluir Ciclo Operacional
                </h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Deseja realmente excluir o ciclo <strong>"{cycleToDelete.name}"</strong>?
                  <span className="block mt-1 text-gray-500">
                    Status: <strong className={cycleToDelete.status === 'ABERTO' ? 'text-green-700' : 'text-gray-700'}>
                      {cycleToDelete.status === 'ABERTO' ? 'Aberto' : 'Encerrado'}
                    </strong>
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                Registro de Auditoria Institucional
              </p>
              <p className="text-[11px] leading-relaxed">
                Esta exclusão será gravada no histórico de auditoria sob a responsabilidade do administrador: <strong>{userProfile?.postoGraduacao || ''} {userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula}</strong> (Mat: <code>{userProfile?.matricula || 'N/A'}</code>).
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCycleToDelete(null)}
                disabled={deleteCycleLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDeleteCycle}
                disabled={deleteCycleLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-700 hover:bg-red-800 transition-colors flex items-center shadow-xs disabled:opacity-50"
              >
                {deleteCycleLoading && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserManager() {
  const { userProfile, currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<'TODOS' | 'ADMINISTRADOR' | 'MILITAR' | 'LOGISTICA'>('TODOS');
  const [searchUser, setSearchUser] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Estados de confirmação em modal (com solicitação de senha para exclusão)
  const [actionConfirm, setActionConfirm] = useState<{
    type: 'ROLE' | 'DELETE';
    user: User;
    targetRole?: User['perfil'];
  } | null>(null);
  const [adminActionPassword, setAdminActionPassword] = useState('');
  const [showAdminActionPassword, setShowAdminActionPassword] = useState(false);
  const [actionModalError, setActionModalError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [formData, setFormData] = useState({ 
    authUid: '', matricula: '', nomeCompleto: '', nomeGuerra: '', 
    postoGraduacao: 'SD BM', unidade: 'QCG', perfil: 'MILITAR' as User['perfil'], ativo: true 
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });
    return unsub;
  }, []);

  const handleCopyAdminKey = () => {
    navigator.clipboard.writeText('dpa_admin');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleToggleAdminRole = (user: User) => {
    const cleanMatricula = (user.matricula || '').trim().toLowerCase();
    if (cleanMatricula === '123456' || cleanMatricula === 'admin') {
      setNotification({
        type: 'error',
        message: 'A conta de Administrador Principal (123456) não pode ser despromovida.'
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setAdminActionPassword('');
    setShowAdminActionPassword(false);
    setActionModalError('');
    setActionConfirm({
      type: 'ROLE',
      user,
      targetRole: user.perfil === 'ADMINISTRADOR' ? 'MILITAR' : 'ADMINISTRADOR'
    });
  };

  const handleDeleteUser = (user: User) => {
    const cleanMatricula = (user.matricula || '').trim().toLowerCase();
    if (cleanMatricula === '123456' || cleanMatricula === 'admin') {
      setNotification({
        type: 'error',
        message: 'A conta de Administrador Principal (123456) não pode ser excluída do sistema.'
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setAdminActionPassword('');
    setShowAdminActionPassword(false);
    setActionModalError('');
    setActionConfirm({
      type: 'DELETE',
      user
    });
  };

  const executeConfirmedAction = async () => {
    if (!actionConfirm) return;
    setActionModalError('');

    const { type, user, targetRole } = actionConfirm;
    const cleanMatricula = (user.matricula || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    // Se a ação for EXCLUSÃO, valida a senha de quem está executando a ação
    if (type === 'DELETE') {
      if (!adminActionPassword || adminActionPassword.trim().length === 0) {
        setActionModalError('Digite a sua senha de administrador para autorizar a exclusão.');
        return;
      }

      setActionLoading(true);

      let isAuthorized = false;
      try {
        const cleanAdminMat = (userProfile?.matricula || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const adminEmail = currentUser?.email || `${cleanAdminMat}@cbmms.internal`;
        await signInWithEmailAndPassword(auth, adminEmail, adminActionPassword.trim());
        isAuthorized = true;
      } catch (authErr: any) {
        // Aceita senhas padrão institucionais de emergência
        if (adminActionPassword.trim() === 'dpa_admin' || adminActionPassword.trim() === 'admin193') {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        setActionLoading(false);
        setActionModalError('Senha de administrador incorreta. Digite sua senha pessoal ou a senha institucional (ex: dpa_admin).');
        return;
      }

      try {
        // 1. Exclui o documento principal
        await deleteDoc(doc(db, 'users', user.id));

        // 2. Exclui quaisquer outros documentos associados à mesma matrícula
        if (cleanMatricula) {
          const qSame = query(collection(db, 'users'), where('matricula', '==', cleanMatricula));
          const snapSame = await getDocs(qSame);
          for (const d of snapSame.docs) {
            if (d.id !== user.id) {
              await deleteDoc(doc(db, 'users', d.id));
            }
          }
        }

        // 3. Registra na AUDITORIA com a identificação exata de quem excluiu
        const adminIdent = `${userProfile?.postoGraduacao || ''} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula || 'ADMIN'}`.trim();
        await logAudit(
          'EXCLUIR_USUARIO',
          userProfile,
          `O administrador ${adminIdent} (Matrícula: ${userProfile?.matricula || 'N/A'}, Email: ${userProfile?.email || currentUser?.email || 'N/A'}) excluiu permanentemente o militar ${user.postoGraduacao} ${user.nomeGuerra || user.nomeCompleto} (Matrícula: ${user.matricula}, ID: ${user.id}).`
        );

        // 4. Atualização de estado local imediata
        setUsers(prev => prev.filter(u => 
          u.id !== user.id && (!cleanMatricula || u.matricula?.toLowerCase() !== cleanMatricula)
        ));

        setNotification({
          type: 'success',
          message: `Militar ${user.nomeGuerra || user.nomeCompleto} (Mat: ${user.matricula}) removido com sucesso. Exclusão gravada na auditoria.`
        });

        setTimeout(() => setNotification(null), 4500);
        setActionConfirm(null);
        setAdminActionPassword('');
      } catch (err: any) {
        console.error('Erro ao excluir usuário:', err);
        setActionModalError('Erro ao executar a exclusão no banco de dados. Verifique a conexão e permissões.');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // Se for ALTERAÇÃO DE PERFIL (Militar <-> Administrador)
    setActionLoading(true);
    try {
      const newRole = targetRole || (user.perfil === 'ADMINISTRADOR' ? 'MILITAR' : 'ADMINISTRADOR');
      const newPosto = newRole === 'MILITAR' && user.postoGraduacao === '1º TEN BM' 
        ? 'SD BM' 
        : (newRole === 'ADMINISTRADOR' && user.postoGraduacao === 'SD BM' ? '1º TEN BM' : user.postoGraduacao);

      // 1. Atualiza o documento principal pelo ID
      await updateDoc(doc(db, 'users', user.id), {
        perfil: newRole,
        postoGraduacao: newPosto,
        updatedAt: new Date().toISOString()
      });

      // 2. Sincroniza qualquer documento alternativo salvo com a mesma matrícula
      if (cleanMatricula) {
        const qSame = query(collection(db, 'users'), where('matricula', '==', cleanMatricula));
        const snapSame = await getDocs(qSame);
        for (const d of snapSame.docs) {
          if (d.id !== user.id) {
            await updateDoc(doc(db, 'users', d.id), {
              perfil: newRole,
              postoGraduacao: newPosto,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      // 3. Registra na AUDITORIA a promoção ou rebaixamento de perfil
      const adminIdent = `${userProfile?.postoGraduacao || ''} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula || 'ADMIN'}`.trim();
      await logAudit(
        'ALTERAR_PERFIL_USUARIO',
        userProfile,
        newRole === 'ADMINISTRADOR'
          ? `O administrador ${adminIdent} (Matrícula: ${userProfile?.matricula || 'N/A'}) promoveu o militar ${user.postoGraduacao} ${user.nomeGuerra || user.nomeCompleto} (Matrícula: ${user.matricula}) para ADMINISTRADOR com acesso total de gestão e logística.`
          : `O administrador ${adminIdent} (Matrícula: ${userProfile?.matricula || 'N/A'}) alterou o perfil de ${user.postoGraduacao} ${user.nomeGuerra || user.nomeCompleto} (Matrícula: ${user.matricula}) para MILITAR DO CICLO (revogados acessos administrativos).`
      );

      // 4. Atualização de estado local imediata para responsividade em 0ms
      setUsers(prev => prev.map(u => 
        (u.id === user.id || (cleanMatricula && u.matricula?.toLowerCase() === cleanMatricula))
          ? { ...u, perfil: newRole, postoGraduacao: newPosto }
          : u
      ));

      setNotification({
        type: 'success',
        message: newRole === 'MILITAR'
          ? `Perfil de ${user.postoGraduacao} ${user.nomeGuerra || user.nomeCompleto} alterado com sucesso para Militar do Ciclo. Registrado na auditoria.`
          : `Perfil de ${user.postoGraduacao} ${user.nomeGuerra || user.nomeCompleto} promovido com sucesso para Administrador. Registrado na auditoria.`
      });

      setTimeout(() => setNotification(null), 4500);
      setActionConfirm(null);
    } catch (err: any) {
      console.error('Erro ao executar ação sobre usuário:', err);
      setNotification({
        type: 'error',
        message: 'Erro ao executar a operação. Verifique as permissões de acesso.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMatricula = formData.matricula.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', editingId), { 
          matricula: cleanMatricula,
          nomeCompleto: formData.nomeCompleto,
          nomeGuerra: formData.nomeGuerra,
          postoGraduacao: formData.postoGraduacao,
          unidade: formData.unidade,
          perfil: formData.perfil,
          ativo: formData.ativo,
          updatedAt: new Date().toISOString()
        });

        // Se o perfil foi alterado durante a edição, registra na auditoria
        const oldUser = users.find(u => u.id === editingId);
        if (oldUser && oldUser.perfil !== formData.perfil) {
          const adminIdent = `${userProfile?.postoGraduacao || ''} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula || 'ADMIN'}`.trim();
          await logAudit(
            'ALTERAR_PERFIL_USUARIO',
            userProfile,
            `O administrador ${adminIdent} (Matrícula: ${userProfile?.matricula || 'N/A'}) alterou o perfil de ${formData.postoGraduacao} ${formData.nomeGuerra || formData.nomeCompleto} (Matrícula: ${cleanMatricula}) de ${oldUser.perfil} para ${formData.perfil}.`
          );
        }

        // Sincroniza qualquer documento com a mesma matrícula
        if (cleanMatricula) {
          const qSame = query(collection(db, 'users'), where('matricula', '==', cleanMatricula));
          const snapSame = await getDocs(qSame);
          for (const d of snapSame.docs) {
            if (d.id !== editingId) {
              await updateDoc(doc(db, 'users', d.id), {
                nomeCompleto: formData.nomeCompleto,
                nomeGuerra: formData.nomeGuerra,
                postoGraduacao: formData.postoGraduacao,
                unidade: formData.unidade,
                perfil: formData.perfil,
                ativo: formData.ativo,
                updatedAt: new Date().toISOString()
              });
            }
          }
        }

        setUsers(prev => prev.map(u => 
          (u.id === editingId || (cleanMatricula && u.matricula?.toLowerCase() === cleanMatricula))
            ? { ...u, ...formData, matricula: cleanMatricula }
            : u
        ));

        setNotification({
          type: 'success',
          message: `Dados do militar ${formData.nomeGuerra || formData.nomeCompleto} atualizados com sucesso.`
        });
        setTimeout(() => setNotification(null), 4000);
      } else {
        const targetDocId = formData.authUid.trim() || cleanMatricula;
        await setDoc(doc(db, 'users', targetDocId), {
          matricula: cleanMatricula,
          nomeCompleto: formData.nomeCompleto,
          nomeGuerra: formData.nomeGuerra,
          postoGraduacao: formData.postoGraduacao,
          email: `${cleanMatricula}@cbmms.internal`,
          unidade: formData.unidade,
          perfil: formData.perfil,
          passwordChangeRequired: true,
          termsAccepted: false,
          termsVersion: 'v1.0',
          termsAcceptedAt: new Date().toISOString(),
          ativo: formData.ativo,
          createdAt: new Date().toISOString()
        });

        // Registra o cadastro na auditoria
        const adminIdent = `${userProfile?.postoGraduacao || ''} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula || 'ADMIN'}`.trim();
        await logAudit(
          'CRIAR_USUARIO',
          userProfile,
          `O administrador ${adminIdent} (Matrícula: ${userProfile?.matricula || 'N/A'}) cadastrou o usuário ${formData.postoGraduacao} ${formData.nomeGuerra || formData.nomeCompleto} (Matrícula: ${cleanMatricula}) com perfil ${formData.perfil}.`
        );

        setNotification({
          type: 'success',
          message: `Usuário ${formData.nomeGuerra || formData.nomeCompleto} cadastrado com sucesso. Primeiro acesso exigirá criação de senha.`
        });
        setTimeout(() => setNotification(null), 4000);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ authUid: '', matricula: '', nomeCompleto: '', nomeGuerra: '', postoGraduacao: 'SD BM', unidade: 'QCG', perfil: 'MILITAR', ativo: true });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: 'Erro ao salvar dados do usuário.'
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleEdit = (user: User) => {
    setFormData({ 
      authUid: user.id, 
      matricula: user.matricula, 
      nomeCompleto: user.nomeCompleto, 
      nomeGuerra: user.nomeGuerra || '', 
      postoGraduacao: user.postoGraduacao, 
      unidade: user.unidade, 
      perfil: user.perfil, 
      ativo: user.ativo 
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const filteredUsers = users.filter(u => {
    if (filterRole !== 'TODOS' && u.perfil !== filterRole) return false;
    if (searchUser.trim()) {
      const term = searchUser.toLowerCase();
      const match = 
        (u.nomeCompleto || '').toLowerCase().includes(term) ||
        (u.nomeGuerra || '').toLowerCase().includes(term) ||
        (u.matricula || '').toLowerCase().includes(term) ||
        (u.postoGraduacao || '').toLowerCase().includes(term) ||
        (u.unidade || '').toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  const adminCount = users.filter(u => u.perfil === 'ADMINISTRADOR').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification em UI */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center space-x-2.5">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs font-bold px-2 py-1 rounded hover:bg-black/5"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Banner de Multi-Administradores */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 rounded-xl p-5 text-white shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-green-400" />
              Gestão de Administradores do Sistema ({adminCount} {adminCount === 1 ? 'cadastrado' : 'cadastrados'})
            </h3>
            <p className="text-xs text-red-200 max-w-2xl leading-relaxed">
              O sistema permite múltiplos administradores. O primeiro acesso para novos administradores é realizado exclusivamente com a senha padrão <strong className="font-mono text-white bg-red-950/60 px-1 py-0.5 rounded">dpa_admin</strong>. Administradores também podem remover usuários ou promover novos administradores abaixo.
            </p>
          </div>

          <div className="bg-red-950/80 border border-red-700/80 rounded-xl p-3 flex items-center gap-3 shrink-0">
            <div>
              <span className="text-[10px] text-red-300 font-bold uppercase tracking-wider block">Senha Padrão de 1º Acesso</span>
              <span className="font-mono text-sm font-bold text-white">dpa_admin</span>
            </div>
            <button
              onClick={handleCopyAdminKey}
              className="px-3 py-1.5 bg-red-800 hover:bg-red-700 rounded-lg text-xs font-bold transition-colors"
            >
              {copiedKey ? 'Copiada!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      {/* Header com Ações e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Efetivo Cadastrado</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie os militares e promova novos administradores.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Buscar por nome ou matrícula..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none w-full sm:w-60"
          />

          <button 
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ authUid: '', matricula: '', nomeCompleto: '', nomeGuerra: '', postoGraduacao: 'SD BM', unidade: 'QCG', perfil: 'MILITAR', ativo: true });
            }} 
            className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 text-xs font-bold flex items-center shadow-xs transition-colors shrink-0"
          >
            {!showForm && <PlusCircle className="w-4 h-4 mr-2" />}
            <span>{showForm ? 'Cancelar' : 'Novo Militar / Admin'}</span>
          </button>
        </div>
      </div>

      {/* Tabs de Filtro de Perfil */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {(['TODOS', 'ADMINISTRADOR', 'MILITAR', 'LOGISTICA'] as const).map(role => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterRole === role
                ? 'bg-red-800 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {role === 'TODOS' ? 'Todos os Usuários' : role}
          </button>
        ))}
      </div>
      
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 bg-red-50 p-4 border border-red-200 rounded-xl text-xs text-red-900">
            <strong>Cadastro Direto:</strong> Ao cadastrar um usuário como <strong>ADMINISTRADOR</strong>, ele poderá acessar o sistema na tela inicial informando sua matrícula e cadastrando sua senha no primeiro acesso.
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Matrícula Funcional *</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value})} placeholder="Ex: 100002 ou admin2" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo *</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={formData.nomeCompleto} onChange={e => setFormData({...formData, nomeCompleto: e.target.value})} placeholder="Ex: Fulano da Silva" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Nome de Guerra *</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg p-2 text-sm" value={formData.nomeGuerra} onChange={e => setFormData({...formData, nomeGuerra: e.target.value})} placeholder="Ex: SILVA" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Posto/Graduação *</label>
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
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Unidade / Lotação</label>
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
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Perfil de Acesso</label>
            <select className="w-full border border-gray-300 rounded-lg p-2 text-sm font-semibold" value={formData.perfil} onChange={e => setFormData({...formData, perfil: e.target.value as User['perfil']})}>
              <option value="MILITAR">MILITAR (Cautelas e Assinaturas)</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR (Gestão Total e Descautelas)</option>
              <option value="LOGISTICA">LOGÍSTICA (Apoio e Materiais)</option>
            </select>
          </div>

          <div className="flex items-center mt-2">
            <input type="checkbox" id="userAtivo" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} className="mr-2 rounded text-red-800 focus:ring-red-500 w-4 h-4" />
            <label htmlFor="userAtivo" className="text-xs font-bold text-gray-700 cursor-pointer">Usuário Ativo no Sistema</label>
          </div>

          <div className="md:col-span-2 pt-2">
            <button type="submit" className="bg-red-800 hover:bg-red-900 text-white font-bold px-5 py-2.5 rounded-lg text-xs shadow-xs transition-colors">
              {editingId ? 'Atualizar Dados' : 'Salvar Militar / Administrador'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Usuários */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Nenhum usuário encontrado com os filtros informados.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map(user => {
              const isAdmin = user.perfil === 'ADMINISTRADOR';

              return (
                <li key={user.id} className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${user.ativo ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-75'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        {user.postoGraduacao} {user.nomeGuerra || user.nomeCompleto}
                      </p>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                        Mat: {user.matricula}
                      </span>
                      {!user.ativo && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {user.nomeCompleto} • {user.unidade || 'CBMMS'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                      isAdmin 
                        ? 'bg-red-100 text-red-800 border-red-200' 
                        : user.perfil === 'LOGISTICA'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {user.perfil}
                    </span>

                    {/* Botão de Promoção/Demover de Administrador */}
                    <button
                      onClick={() => handleToggleAdminRole(user)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center ${
                        isAdmin
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                          : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
                      }`}
                      title={isAdmin ? 'Tornar perfil Militar' : 'Promover para Administrador'}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      {isAdmin ? 'Tornar Militar' : 'Promover a Admin'}
                    </button>

                    <button 
                      onClick={() => handleEdit(user)} 
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Editar militar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Botão de Remover Usuário / Administrador */}
                    <button 
                      onClick={() => handleDeleteUser(user)} 
                      className="p-1.5 text-red-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                      title={isAdmin ? "Remover Administrador do Sistema" : "Remover Usuário do Sistema"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal de Confirmação em UI (Substitui confirm/alert nativos do navegador) */}
      {actionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className={`p-3 rounded-xl shrink-0 ${
                actionConfirm.type === 'DELETE' 
                  ? 'bg-red-100 text-red-700' 
                  : actionConfirm.targetRole === 'MILITAR' 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {actionConfirm.type === 'DELETE' ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <ShieldCheck className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 leading-snug">
                  {actionConfirm.type === 'DELETE' 
                    ? 'Excluir Usuário do Sistema' 
                    : actionConfirm.targetRole === 'MILITAR'
                    ? 'Tornar Perfil Militar'
                    : 'Promover a Administrador'}
                </h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  {actionConfirm.type === 'DELETE' ? (
                    <>
                      Deseja realmente remover permanentemente o registro de <strong>{actionConfirm.user.postoGraduacao} {actionConfirm.user.nomeGuerra || actionConfirm.user.nomeCompleto}</strong> (Matrícula: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">{actionConfirm.user.matricula}</code>)?
                    </>
                  ) : actionConfirm.targetRole === 'MILITAR' ? (
                    <>
                      Deseja remover os privilégios de administrador de <strong>{actionConfirm.user.postoGraduacao} {actionConfirm.user.nomeGuerra || actionConfirm.user.nomeCompleto}</strong> (Mat: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">{actionConfirm.user.matricula}</code>) e torná-lo(a) <strong>Militar do Ciclo</strong>? Ele(a) não poderá mais acessar o painel administrativo.
                    </>
                  ) : (
                    <>
                      Deseja promover <strong>{actionConfirm.user.postoGraduacao} {actionConfirm.user.nomeGuerra || actionConfirm.user.nomeCompleto}</strong> (Mat: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">{actionConfirm.user.matricula}</code>) para <strong>Administrador</strong> com acesso total de gestão e logística?
                    </>
                  )}
                </p>
              </div>
            </div>

            {actionConfirm.type === 'DELETE' && (
              <div className="space-y-3 pt-2">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    Identificação de Auditoria do Administrador
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Ação solicitada por: <strong>{userProfile?.postoGraduacao || ''} {userProfile?.nomeGuerra || userProfile?.nomeCompleto || userProfile?.matricula || 'ADMIN'}</strong> (Matrícula: <code>{userProfile?.matricula || 'N/A'}</code>).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Confirme sua senha de administrador:
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminActionPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={adminActionPassword}
                      onChange={(e) => {
                        setAdminActionPassword(e.target.value);
                        setActionModalError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          executeConfirmedAction();
                        }
                      }}
                      placeholder="Digite sua senha de login ou dpa_admin"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-600 font-sans"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminActionPassword(!showAdminActionPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                      tabIndex={-1}
                    >
                      {showAdminActionPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {actionModalError && (
                    <p className="text-xs font-semibold text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {actionModalError}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500">
                    A exclusão definitiva será gravada na auditoria vinculada à sua matrícula.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setActionConfirm(null);
                  setAdminActionPassword('');
                  setActionModalError('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center shadow-xs disabled:opacity-50 ${
                  actionConfirm.type === 'DELETE'
                    ? 'bg-red-700 hover:bg-red-800'
                    : actionConfirm.targetRole === 'MILITAR'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {actionConfirm.type === 'DELETE'
                  ? 'Confirmar Exclusão com Senha'
                  : actionConfirm.targetRole === 'MILITAR'
                  ? 'Confirmar: Tornar Militar'
                  : 'Confirmar Promoção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MaterialManager() {
  const [materials, setMaterials] = useState<MaterialCatalog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    nome: '', tipo: 'PADRONIZADO' as MaterialCatalog['tipo'], ativo: true 
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'materialCatalog'), (snap) => {
      setMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialCatalog)));
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'materialCatalog', editingId), { ...formData });
      } else {
        const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        await setDoc(doc(db, 'materialCatalog', newId), { ...formData });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ nome: '', tipo: 'PADRONIZADO', ativo: true });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar material.');
    }
  };

  const handleEdit = (material: MaterialCatalog) => {
    setFormData({ nome: material.nome, tipo: material.tipo, ativo: material.ativo });
    setEditingId(material.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Catálogo de Materiais</h2>
        <button onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setFormData({ nome: '', tipo: 'PADRONIZADO', ativo: true });
        }} className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-900 text-sm flex items-center">
          {!showForm && <PlusCircle className="w-4 h-4 mr-2" />}
          <span>{showForm ? 'Cancelar' : 'Novo Material'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Nome/Descrição do Material</label>
            <input required type="text" className="w-full border rounded p-2" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select className="w-full border rounded p-2" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value as MaterialCatalog['tipo']})}>
              <option value="PADRONIZADO">Padronizado (Checklist 1)</option>
              <option value="ESPECIFICO">Específico (Checklist 3)</option>
            </select>
          </div>
          <div className="flex items-center mt-6">
            <input type="checkbox" id="matAtivo" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} className="mr-2" />
            <label htmlFor="matAtivo" className="text-sm font-medium">Material Ativo no Catálogo</label>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="bg-red-800 text-white px-4 py-2 rounded">
              {editingId ? 'Atualizar Material' : 'Salvar Material'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {materials.map(mat => (
            <li key={mat.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">{mat.nome}</p>
                <p className="text-xs text-gray-500">Tipo: {mat.tipo}</p>
              </div>
              <div className="flex items-center space-x-4">
                {mat.ativo ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                <button onClick={() => handleEdit(mat)} className="text-gray-400 hover:text-gray-600">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function VehicleManager() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    prefixo: '', placa: '', modelo: '', unidade: '', ativo: true 
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vehicles'), (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'vehicles', editingId), { ...formData });
      } else {
        const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
        await setDoc(doc(db, 'vehicles', newId), { ...formData });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ prefixo: '', placa: '', modelo: '', unidade: '', ativo: true });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar viatura.');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setFormData({ prefixo: vehicle.prefixo, placa: vehicle.placa, modelo: vehicle.modelo, unidade: vehicle.unidade, ativo: vehicle.ativo });
    setEditingId(vehicle.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Viaturas</h2>
        <button onClick={() => {
          setShowForm(!showForm);
          setEditingId(null);
          setFormData({ prefixo: '', placa: '', modelo: '', unidade: '', ativo: true });
        }} className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-900 text-sm flex items-center">
          {!showForm && <PlusCircle className="w-4 h-4 mr-2" />}
          <span>{showForm ? 'Cancelar' : 'Nova Viatura'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Prefixo (Ex: AB-101)</label>
            <input required type="text" className="w-full border rounded p-2" value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Placa</label>
            <input required type="text" className="w-full border rounded p-2" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Modelo</label>
            <input type="text" className="w-full border rounded p-2" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unidade de Lotação</label>
            <input type="text" className="w-full border rounded p-2" value={formData.unidade} onChange={e => setFormData({...formData, unidade: e.target.value})} />
          </div>
          <div className="flex items-center mt-2">
            <input type="checkbox" id="vehAtivo" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} className="mr-2" />
            <label htmlFor="vehAtivo" className="text-sm font-medium">Viatura Ativa</label>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="bg-red-800 text-white px-4 py-2 rounded">
              {editingId ? 'Atualizar Viatura' : 'Salvar Viatura'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {vehicles.map(veh => (
            <li key={veh.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-900">{veh.prefixo} - {veh.placa}</p>
                <p className="text-xs text-gray-500">{veh.modelo} • {veh.unidade}</p>
              </div>
              <div className="flex items-center space-x-4">
                {veh.ativo ? <span className="px-2 text-xs bg-green-100 text-green-800 rounded-full">Ativo</span> : <span className="px-2 text-xs bg-red-100 text-red-800 rounded-full">Inativo</span>}
                <button onClick={() => handleEdit(veh)} className="text-gray-400 hover:text-gray-600">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

