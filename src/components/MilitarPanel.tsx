import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { Caution, CautionItem, Signature, User, Cycle } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { generateCautionPDF, generateDescautelaPDF } from '../lib/pdfGenerator';
import { 
  PlusCircle, 
  FileCheck2, 
  Download, 
  Clock, 
  Filter, 
  CheckCircle, 
  Package, 
  Truck, 
  Boxes, 
  Calendar, 
  Send,
  Info,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';

export function MilitarPanel() {
  const { userProfile } = useAuth();
  const [cautions, setCautions] = useState<Caution[]>([]);
  const [cyclesList, setCyclesList] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state: 'CONFECCAO' | 'ATIVAS' | 'SOLICITACOES' | 'HISTORICO'
  const [activeTab, setActiveTab] = useState<'CONFECCAO' | 'ATIVAS' | 'SOLICITACOES' | 'HISTORICO'>('ATIVAS');
  
  // Selected cycle filter: 'TODOS' or specific cycle string
  const [selectedCycle, setSelectedCycle] = useState<string>('TODOS');
  
  // Action states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // UI States para substituição de alert() e confirm()
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ caution: Caution } | null>(null);

  const navigate = useNavigate();

  // Listen to cycles
  useEffect(() => {
    const qCycles = query(collection(db, 'cycles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qCycles, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cycle));
      setCyclesList(data);
    }, (err) => {
      console.warn('Erro ao carregar ciclos:', err);
    });
    return unsub;
  }, []);

  // Listen to user's cautions
  useEffect(() => {
    if (!userProfile) return;
    const q = query(
      collection(db, 'cautions'),
      where('responsibleUserId', '==', userProfile.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caution));
      setCautions(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
    return unsub;
  }, [userProfile]);

  // Current active operational cycle from system
  const activeCycleObj = useMemo(() => {
    return cyclesList.find(c => c.status === 'ABERTO');
  }, [cyclesList]);

  // Extract all distinct cycles present in user's cautions + system cycles
  const availableCycles = useMemo(() => {
    const cycleSet = new Set<string>();
    cyclesList.forEach(c => {
      if (c.name && c.name.trim()) cycleSet.add(c.name.trim());
    });
    cautions.forEach(c => {
      if (c.unitGcif && c.unitGcif.trim()) {
        cycleSet.add(c.unitGcif.trim());
      }
    });
    return Array.from(cycleSet);
  }, [cautions, cyclesList]);

  // Filter cautions based on selected cycle
  const filteredByCycle = useMemo(() => {
    if (selectedCycle === 'TODOS') return cautions;
    return cautions.filter(c => c.unitGcif?.trim() === selectedCycle.trim());
  }, [cautions, selectedCycle]);

  // Partition cautions by status
  // Include DEVOLUCAO_INICIADA in ativas so militar sees the icon turn green immediately!
  const ativasCautions = useMemo(() => {
    return filteredByCycle.filter(c => ['RASCUNHO', 'AGUARDANDO_ASSINATURA_MILITAR', 'CAUTELADA', 'DEVOLUCAO_INICIADA'].includes(c.status));
  }, [filteredByCycle]);

  const solicitacoesDescautela = useMemo(() => {
    return filteredByCycle.filter(c => ['DEVOLUCAO_INICIADA', 'COM_DIVERGENCIA'].includes(c.status));
  }, [filteredByCycle]);

  const historicoCautions = useMemo(() => {
    return filteredByCycle.filter(c => ['DESCAUTELADA', 'CANCELADA'].includes(c.status));
  }, [filteredByCycle]);

  // Metrics for the selected cycle
  const cycleMetrics = useMemo(() => {
    const total = filteredByCycle.length;
    const emOperacao = filteredByCycle.filter(c => ['CAUTELADA', 'RASCUNHO', 'AGUARDANDO_ASSINATURA_MILITAR'].includes(c.status)).length;
    const pendentes = filteredByCycle.filter(c => c.status === 'DEVOLUCAO_INICIADA').length;
    const descauteladas = historicoCautions.filter(c => c.status === 'DESCAUTELADA').length;
    return { total, ativas: emOperacao, pendentes, descauteladas };
  }, [filteredByCycle, historicoCautions]);

  // Solicitar descautela aos Administradores
  const handleRequestDescautela = (caution: Caution) => {
    setActionConfirm({ caution });
  };

  const executeRequestDescautela = async () => {
    if (!actionConfirm) return;
    const caution = actionConfirm.caution;
    
    try {
      setRequestingId(caution.id);
      await updateDoc(doc(db, 'cautions', caution.id), {
        status: 'DEVOLUCAO_INICIADA',
        returnRequestedAt: new Date().toISOString(),
        returnRequestedBy: userProfile?.id,
        returnRequestedByName: `${userProfile?.postoGraduacao} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto}`
      });
      setNotification({
        type: 'success',
        message: 'Solicitação de descautela enviada com sucesso! Apresente o material/viatura para a equipe de logística.'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Erro ao solicitar descautela:', err);
      setNotification({
        type: 'error',
        message: 'Erro ao enviar solicitação de descautela. Tente novamente.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setRequestingId(null);
      setActionConfirm(null);
    }
  };

  // Baixar Termo de Descautela e Baixa Patrimonial (PDF) assinado pelo Administrador
  const handleDownloadDescautelaPDF = async (caution: Caution) => {
    try {
      setDownloadingId(caution.id);
      const itemsSnap = await getDocs(collection(db, 'cautions', caution.id, 'items'));
      const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CautionItem));

      const sigsQuery = query(collection(db, 'cautions', caution.id, 'signatures'), orderBy('signedAtUtc', 'asc'));
      const sigsSnap = await getDocs(sigsQuery);
      const sigs = sigsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Signature));

      let owner: User | null = null;
      if (caution.responsibleUserId) {
        const userDoc = await getDoc(doc(db, 'users', caution.responsibleUserId));
        if (userDoc.exists()) {
          owner = { id: userDoc.id, ...userDoc.data() } as User;
        }
      }

      let receiver: User | null = null;
      if (caution.receiverMilitaryId) {
        const recDoc = await getDoc(doc(db, 'users', caution.receiverMilitaryId));
        if (recDoc.exists()) {
          receiver = { id: recDoc.id, ...recDoc.data() } as User;
        }
      }

      generateDescautelaPDF(caution, items, sigs, owner || (userProfile as User), receiver || undefined);
    } catch (err) {
      console.error('Erro ao gerar Termo de Descautela:', err);
      setNotification({ type: 'error', message: 'Não foi possível gerar o Termo de Descautela em PDF.' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setDownloadingId(null);
    }
  };

  // Baixar Cautela Inicial em PDF
  const handleDownloadDirectPDF = async (caution: Caution) => {
    try {
      setDownloadingId(caution.id);
      const itemsSnap = await getDocs(collection(db, 'cautions', caution.id, 'items'));
      const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CautionItem));

      const sigsQuery = query(collection(db, 'cautions', caution.id, 'signatures'), orderBy('signedAtUtc', 'asc'));
      const sigsSnap = await getDocs(sigsQuery);
      const sigs = sigsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Signature));

      let owner: User | null = null;
      if (caution.responsibleUserId) {
        const userDoc = await getDoc(doc(db, 'users', caution.responsibleUserId));
        if (userDoc.exists()) {
          owner = { id: userDoc.id, ...userDoc.data() } as User;
        }
      }

      generateCautionPDF(caution, items, sigs, owner || (userProfile as User));
    } catch (err) {
      console.error('Erro ao gerar PDF da Cautela:', err);
      setNotification({ type: 'error', message: 'Não foi possível gerar o PDF. Verifique a conexão com a internet.' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; class: string; icon?: React.ReactNode }> = {
      RASCUNHO: { label: 'Rascunho', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      AGUARDANDO_ASSINATURA_MILITAR: { label: 'Aguardando Assinatura', class: 'bg-blue-100 text-blue-800 border-blue-200' },
      CAUTELADA: { label: 'Cautelada / Em Operação', class: 'bg-blue-100 text-blue-800 border-blue-200 font-semibold' },
      DEVOLUCAO_INICIADA: { 
        label: 'Descautela Solicitada', 
        class: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        icon: <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 inline" />
      },
      AGUARDANDO_RECEBIMENTO_LOGISTICA: { label: 'Aguardando Logística', class: 'bg-orange-100 text-orange-800 border-orange-200' },
      DESCAUTELADA: { label: 'Descautelada / Concluída', class: 'bg-green-100 text-green-800 border-green-300 font-bold' },
      COM_DIVERGENCIA: { label: 'Com Divergência', class: 'bg-red-100 text-red-800 border-red-200' },
      CANCELADA: { label: 'Cancelada', class: 'bg-red-50 text-red-600 border-red-100' }
    };

    const item = config[status] || { label: status.replace(/_/g, ' '), class: 'bg-gray-100 text-gray-700 border-gray-200' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${item.class}`}>
        {item.icon}
        <span>{item.label}</span>
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIATURA':
        return <Truck className="w-4 h-4 text-red-800" />;
      case 'MATERIAL_PADRONIZADO':
        return <Boxes className="w-4 h-4 text-red-800" />;
      default:
        return <Package className="w-4 h-4 text-red-800" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification em UI */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center space-x-2.5">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <Package className="w-5 h-5 text-red-600 shrink-0" />
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

      {/* Modal de Confirmação em UI para Solicitar Descautela */}
      {actionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-3 rounded-xl shrink-0 bg-amber-100 text-amber-700">
                <Send className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 leading-snug">
                  Solicitar Descautela à Logística
                </h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Deseja solicitar a descautela desta carga aos Administradores/Logística ao final do ciclo?
                  <br/><br/>
                  Ao confirmar, a equipe de Administradores será notificada e você deverá apresentar o material/viatura para <strong>conferência física e assinatura da baixa.</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActionConfirm(null)}
                disabled={requestingId === actionConfirm.caution.id}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeRequestDescautela}
                disabled={requestingId === actionConfirm.caution.id}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center shadow-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
              >
                {requestingId === actionConfirm.caution.id ? 'Enviando...' : 'Confirmar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Painel do Militar do Ciclo</h1>
          <p className="text-xs text-gray-500 mt-1">
            Confecção de Cautelas, Solicitação de Descautela aos Administradores e Termos em PDF • CBMMS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('CONFECCAO')}
            className="inline-flex items-center justify-center bg-red-800 text-white px-4 py-2.5 rounded-lg hover:bg-red-900 text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Nova Cautela
          </button>
        </div>
      </div>

      {/* BLOCO: ORGANIZAÇÃO DO FLUXO DENTRO DO CICLO */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-4 h-4 text-red-800" />
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Ciclo Operacional em Andamento
            </h3>
            {activeCycleObj && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                {activeCycleObj.name}
              </span>
            )}
            {/* DESTAQUE DE DESCAUTELAS SOLICITADAS COM ÍCONE VERDE */}
            <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center border transition-all ${
              cycleMetrics.pendentes > 0 
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20' 
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              <CheckCircle className={`w-3.5 h-3.5 mr-1.5 ${cycleMetrics.pendentes > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
              Descautelas Solicitadas: <strong className="ml-1 text-sm">{cycleMetrics.pendentes}</strong>
            </span>
          </div>

          {/* Seletor de Ciclo Informado */}
          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500 font-medium">Ciclo / TIF:</span>
            <select
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800 focus:ring-red-500 focus:border-red-500"
              value={selectedCycle}
              onChange={e => setSelectedCycle(e.target.value)}
            >
              <option value="TODOS">Todos os Ciclos</option>
              {availableCycles.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mini métricas do ciclo selecionado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="bg-gray-50 p-2.5 rounded-lg text-center border border-gray-100">
            <span className="text-gray-500 block">Total de Cautelas</span>
            <span className="text-base font-black text-gray-900">{cycleMetrics.total}</span>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-lg text-center border border-blue-100">
            <span className="text-blue-700 block font-medium">Cauteladas / Operação</span>
            <span className="text-base font-black text-blue-900">{cycleMetrics.ativas}</span>
          </div>
          <div className={`p-2.5 rounded-lg text-center border transition-all ${
            cycleMetrics.pendentes > 0 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20' 
              : 'bg-emerald-50/50 border-emerald-200'
          }`}>
            <span className="text-emerald-700 block font-bold flex items-center justify-center text-xs">
              <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>Descautela Solicitada</span>
            </span>
            <span className="text-base font-black text-emerald-900">{cycleMetrics.pendentes}</span>
          </div>
          <div className="bg-green-50 p-2.5 rounded-lg text-center border border-green-100">
            <span className="text-green-700 block font-medium">Descauteladas (Concluídas)</span>
            <span className="text-base font-black text-green-900">{cycleMetrics.descauteladas}</span>
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO POR ABAS PARA O MILITAR DO CICLO */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-4 min-w-max">
          {/* 1. ABA DE CONFECÇÃO DE CAUTELAS */}
          <button
            onClick={() => setActiveTab('CONFECCAO')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center ${
              activeTab === 'CONFECCAO'
                ? 'border-red-800 text-red-900 bg-red-50/40 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PlusCircle className="w-4 h-4 mr-2 text-red-800" />
            Confecção de Cautelas
          </button>

          {/* 2. ABA DE CAUTELAS ATIVAS */}
          <button
            onClick={() => setActiveTab('ATIVAS')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center ${
              activeTab === 'ATIVAS'
                ? 'border-red-800 text-red-900 bg-red-50/40 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Cautelas Ativas & Em Operação
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full text-gray-700">
              {ativasCautions.length}
            </span>
          </button>

          {/* 3. ABA DE SOLICITAÇÃO DE DESCAUTELA */}
          <button
            onClick={() => setActiveTab('SOLICITACOES')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center relative ${
              activeTab === 'SOLICITACOES'
                ? 'border-emerald-600 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
            Solicitações de Descautela
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${
              solicitacoesDescautela.length > 0 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {solicitacoesDescautela.length}
            </span>
          </button>

          {/* 4. ABA DE DESCAUTELADAS / CONCLUÍDAS */}
          <button
            onClick={() => setActiveTab('HISTORICO')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center ${
              activeTab === 'HISTORICO'
                ? 'border-green-700 text-green-900 bg-green-50/40 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckCircle className="w-4 h-4 mr-2 text-green-700" />
            Descauteladas / Concluídas
            <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 rounded-full text-gray-700">
              {historicoCautions.length}
            </span>
          </button>
        </nav>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}
      <div className="space-y-4">
        {/* ABA 1: CONFECÇÃO DE CAUTELAS */}
        {activeTab === 'CONFECCAO' && (
          <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 space-y-4">
            <div className="flex items-start space-x-3 text-xs text-gray-600 pb-2 border-b">
              <Info className="w-5 h-5 text-red-800 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-gray-900">
                  Selecione a Modalidade para Confeccionar Nova Cautela
                </strong>
                <p>
                  Cadastre a retirada de materiais ou viatura vinculada ao ciclo atual. Ao finalizar o preenchimento, assine digitalmente para emitir o termo e disponibilizar o download do PDF.
                </p>
              </div>
            </div>

            {cyclesList.filter(c => c.status === 'ABERTO').length === 0 ? (
              <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm font-bold text-amber-950 mb-0.5">
                    Nenhum Ciclo Operacional com Status "ABERTO"
                  </strong>
                  <p>
                    Para confeccionar uma nova cautela, é obrigatório vincular a um ciclo operacional com status <strong>"ABERTO"</strong>. Solicite a abertura do ciclo à equipe de Administradores / Logística.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center space-x-2 text-xs text-emerald-900 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Ciclo(s) Aberto(s) Autorizado(s) para Cautela:</strong> {cyclesList.filter(c => c.status === 'ABERTO').map(c => c.name).join(', ')}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <button 
                onClick={() => navigate('/cautions/new?type=MATERIAL_PADRONIZADO')}
                className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-red-600 hover:bg-red-50/50 transition-all text-left group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <Boxes className="w-5 h-5 text-red-800" />
                  </div>
                  <span className="block font-bold text-gray-900 group-hover:text-red-900">Materiais Padronizados</span>
                </div>
                <span className="block text-xs text-gray-500 leading-relaxed">
                  Sopradores, motosserras, pinga-fogo, mochilas costais, abafadores, machados Pulaski e ferramentas florestais com numeração.
                </span>
              </button>

              <button 
                onClick={() => navigate('/cautions/new?type=VIATURA')}
                className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-red-600 hover:bg-red-50/50 transition-all text-left group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <Truck className="w-5 h-5 text-red-800" />
                  </div>
                  <span className="block font-bold text-gray-900 group-hover:text-red-900">Viatura Operacional</span>
                </div>
                <span className="block text-xs text-gray-500 leading-relaxed">
                  Checklist veicular completo, pneus, estepe, ferramentas de bordo, níveis de fluidos e registro obrigatório de KM de saída e retorno.
                </span>
              </button>

              <button 
                onClick={() => navigate('/cautions/new?type=ESPECIFICA')}
                className="border-2 border-dashed border-gray-200 rounded-xl p-5 hover:border-red-600 hover:bg-red-50/50 transition-all text-left group"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <Package className="w-5 h-5 text-red-800" />
                  </div>
                  <span className="block font-bold text-gray-900 group-hover:text-red-900">Cautela Específica</span>
                </div>
                <span className="block text-xs text-gray-500 leading-relaxed">
                  Inclusão livre de equipamentos avulsos, rádios HT suplementares ou materiais de apoio logístico sob demanda.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ABA 2: CAUTELAS ATIVAS & EM OPERAÇÃO */}
        {activeTab === 'ATIVAS' && (
          <div className="bg-white shadow-xs rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-500">Carregando cautelas ativas...</div>
            ) : ativasCautions.length === 0 ? (
              <div className="p-12 text-center text-gray-500 space-y-3">
                <p className="text-base font-semibold text-gray-700">Nenhuma cautela ativa encontrada no ciclo selecionado.</p>
                <button
                  onClick={() => setActiveTab('CONFECCAO')}
                  className="inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg text-white bg-red-800 hover:bg-red-900 shadow-xs"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" /> Confeccionar Cautela
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {ativasCautions.map(caution => {
                  const typeLabel = 
                    caution.type === 'MATERIAL_PADRONIZADO' ? 'Materiais Padronizados' :
                    caution.type === 'VIATURA' ? 'Checklist de Viatura' : 'Cautela Específica';

                  return (
                    <li key={caution.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2.5">
                            {getTypeIcon(caution.type)}
                            <span className="font-bold text-gray-900 text-sm">{typeLabel}</span>
                            {getStatusBadge(caution.status)}
                          </div>
                          <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                            {caution.unitGcif && <span><strong>Ciclo / TIF:</strong> {caution.unitGcif}</span>}
                            {caution.base && <span><strong>Base:</strong> {caution.base}</span>}
                            {caution.vehiclePrefixo && <span><strong>Vtr:</strong> {caution.vehiclePrefixo}</span>}
                            <span><strong>Data:</strong> {caution.createdAt ? new Date(caution.createdAt).toLocaleDateString('pt-BR') : '-'}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* ÍCONE EXCLUSIVO PARA SOLICITAR DESCAUTELA AOS ADMINISTRADORES AO FINAL DO CICLO */}
                          {caution.status === 'CAUTELADA' && (
                            <button
                              type="button"
                              onClick={() => handleRequestDescautela(caution)}
                              disabled={requestingId === caution.id}
                              title="Clique ao final do ciclo para solicitar a descautela aos Administradores"
                              className="inline-flex items-center px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5 mr-1.5" />
                              <span>{requestingId === caution.id ? 'Enviando...' : 'Solicitar Descautela'}</span>
                            </button>
                          )}

                          {caution.status === 'DEVOLUCAO_INICIADA' && (
                            <span
                              className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                              title="Descautela solicitada! Apresente o material para a Logística/Administrador."
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-white" />
                              <span>Descautela Solicitada</span>
                            </span>
                          )}

                          {/* BAIXAR CAUTELA EM PDF */}
                          {caution.status !== 'RASCUNHO' && (
                            <button
                              type="button"
                              onClick={() => handleDownloadDirectPDF(caution)}
                              disabled={downloadingId === caution.id}
                              className="inline-flex items-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                              title="Baixar Cautela em PDF"
                            >
                              {downloadingId === caution.id ? (
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Baixar PDF
                            </button>
                          )}

                          <button 
                            onClick={() => navigate(`/cautions/${caution.id}`)}
                            className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            title="Ver detalhes da cautela"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ABA 3: SOLICITAÇÕES DE DESCAUTELA (AGUARDANDO ADMINISTRADOR) */}
        {activeTab === 'SOLICITACOES' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start space-x-3 text-xs text-emerald-900">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-emerald-950 mb-0.5">
                  Solicitações de Descautela Enviadas
                </strong>
                <p>
                  As cautelas abaixo foram solicitadas para descautela ao final do ciclo. Apresente os materiais e a viatura à equipe de <strong>Administradores / Logística</strong> para conferência física dos itens e assinatura oficial da baixa.
                </p>
              </div>
            </div>

            <div className="bg-white shadow-xs rounded-xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm text-gray-500">Carregando solicitações...</div>
              ) : solicitacoesDescautela.length === 0 ? (
                <div className="p-12 text-center text-gray-500 space-y-2">
                  <FileCheck2 className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-sm font-bold text-gray-700">Nenhuma solicitação de descautela pendente no momento.</p>
                  <p className="text-xs text-gray-400">
                    Quando estiver encerrando o ciclo, vá até "Cautelas Ativas" e clique no ícone "Solicitar Descautela".
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {solicitacoesDescautela.map(caution => {
                    const typeLabel = 
                      caution.type === 'MATERIAL_PADRONIZADO' ? 'Materiais Padronizados' :
                      caution.type === 'VIATURA' ? 'Checklist de Viatura' : 'Cautela Específica';

                    return (
                      <li key={caution.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-2.5">
                              {getTypeIcon(caution.type)}
                              <span className="font-bold text-gray-900 text-sm">{typeLabel}</span>
                              {getStatusBadge(caution.status)}
                            </div>
                            <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              {caution.unitGcif && <span><strong>Ciclo / TIF:</strong> {caution.unitGcif}</span>}
                              {caution.base && <span><strong>Base:</strong> {caution.base}</span>}
                              {caution.vehiclePrefixo && <span><strong>Vtr:</strong> {caution.vehiclePrefixo}</span>}
                              {caution.returnRequestedAt && (
                                <span><strong>Solicitado em:</strong> {new Date(caution.returnRequestedAt).toLocaleString('pt-BR')}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs"
                              title="Solicitação de descautela enviada"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-white" />
                              <span>Descautela Solicitada</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDownloadDirectPDF(caution)}
                              disabled={downloadingId === caution.id}
                              className="inline-flex items-center px-3 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                              title="Baixar Cautela em PDF"
                            >
                              {downloadingId === caution.id ? (
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Baixar Cautela (PDF)
                            </button>

                            <button 
                              onClick={() => navigate(`/cautions/${caution.id}`)}
                              className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              title="Ver detalhes da cautela"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ABA 4: DESCAUTELADAS / CONCLUÍDAS (COM DOWNLOAD DO TERMO DE DESCAUTELA ASSINADO PELO ADMINISTRADOR) */}
        {activeTab === 'HISTORICO' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start space-x-3 text-xs text-emerald-900">
              <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-emerald-950 mb-0.5">
                  Descautelas Realizadas e Assinadas pelos Administradores
                </strong>
                <p>
                  As cautelas abaixo foram baixadas e assinadas digitalmente pela equipe de Administradores/Logística. Você pode baixar o <strong>Termo Oficial de Descautela e Baixa Patrimonial em PDF</strong> contendo o hash criptográfico e a conferência de todos os materiais.
                </p>
              </div>
            </div>

            <div className="bg-white shadow-xs rounded-xl border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm text-gray-500">Carregando histórico de descautelas...</div>
              ) : historicoCautions.length === 0 ? (
                <div className="p-12 text-center text-gray-500 space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Nenhuma cautela arquivada ou descautelada neste ciclo.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {historicoCautions.map(caution => {
                    const typeLabel = 
                      caution.type === 'MATERIAL_PADRONIZADO' ? 'Materiais Padronizados' :
                      caution.type === 'VIATURA' ? 'Checklist de Viatura' : 'Cautela Específica';

                    return (
                      <li key={caution.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-2.5">
                              {getTypeIcon(caution.type)}
                              <span className="font-bold text-gray-900 text-sm">{typeLabel}</span>
                              {getStatusBadge(caution.status)}
                            </div>
                            <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                              {caution.unitGcif && <span><strong>Ciclo / TIF:</strong> {caution.unitGcif}</span>}
                              {caution.receiverMilitaryName && (
                                <span><strong>Descautelado por (Admin):</strong> {caution.receiverMilitaryName}</span>
                              )}
                              {caution.returnedAt && (
                                <span><strong>Data Baixa:</strong> {new Date(caution.returnedAt).toLocaleString('pt-BR')}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* OPÇÃO DE BAIXAR O TERMO DE DESCAUTELA EM PDF APÓS A ASSINATURA DO ADMINISTRADOR */}
                            {caution.status === 'DESCAUTELADA' && (
                              <button
                                type="button"
                                onClick={() => handleDownloadDescautelaPDF(caution)}
                                disabled={downloadingId === caution.id}
                                className="inline-flex items-center px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                                title="Baixar Termo Oficial de Descautela e Baixa assinado pelo Administrador"
                              >
                                {downloadingId === caution.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                )}
                                Baixar Termo Descautela (PDF)
                              </button>
                            )}

                            {/* BAIXAR CAUTELA INICIAL EM PDF */}
                            <button
                              type="button"
                              onClick={() => handleDownloadDirectPDF(caution)}
                              disabled={downloadingId === caution.id}
                              className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                              title="Baixar Cautela Inicial em PDF"
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                              Cautela Inicial (PDF)
                            </button>

                            <button 
                              onClick={() => navigate(`/cautions/${caution.id}`)}
                              className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              title="Ver detalhes da cautela"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
