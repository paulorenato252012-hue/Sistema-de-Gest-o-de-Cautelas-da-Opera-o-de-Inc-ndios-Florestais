import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, collection, query, orderBy, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Caution, CautionItem, Signature, User } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, FileSignature, Download, FileCheck2, ShieldCheck, Send, CheckCircle2, Clock, CheckCircle, Package, Trash2, RefreshCcw } from 'lucide-react';
import { SignatureModal } from '../components/SignatureModal';
import { DescautelaModal } from '../components/DescautelaModal';
import { CautionForm } from '../components/CautionForm';
import { generateCautionPDF, generateDescautelaPDF } from '../lib/pdfGenerator';

export function CautionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const [caution, setCaution] = useState<Caution | null>(null);
  const [items, setItems] = useState<CautionItem[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [militaryUser, setMilitaryUser] = useState<User | null>(null);
  const [receiverUser, setReceiverUser] = useState<User | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [showDescautela, setShowDescautela] = useState(false);
  const [requestingDescautela, setRequestingDescautela] = useState(false);
  const [downloadingDescautela, setDownloadingDescautela] = useState(false);

  // UI States para substituição de alert() e confirm()
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionConfirm, setActionConfirm] = useState<boolean>(false);

  const fetchCautionData = async () => {
    if (!id || id === 'new' || id === 'nova') return;
    try {
      // Fetch caution
      const docRef = doc(db, 'cautions', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const cautionData = { id: docSnap.id, ...docSnap.data() } as Caution;
        setCaution(cautionData);
        
        // Fetch responsible user if needed
        if (cautionData.responsibleUserId) {
          const userSnap = await getDoc(doc(db, 'users', cautionData.responsibleUserId));
          if (userSnap.exists()) {
            setMilitaryUser({ id: userSnap.id, ...userSnap.data() } as User);
          }
        }

        // Fetch receiver user if already returned
        if (cautionData.receiverMilitaryId) {
          const recSnap = await getDoc(doc(db, 'users', cautionData.receiverMilitaryId));
          if (recSnap.exists()) {
            setReceiverUser({ id: recSnap.id, ...recSnap.data() } as User);
          }
        }
        
        // Fetch items
        const itemsSnap = await getDocs(collection(db, 'cautions', id, 'items'));
        setItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CautionItem)));
        
        // Fetch signatures
        const sigsQuery = query(collection(db, 'cautions', id, 'signatures'), orderBy('signedAtUtc', 'asc'));
        const sigsSnap = await getDocs(sigsQuery);
        setSignatures(sigsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Signature)));
      }
    } catch (err) {
      console.error("Error fetching caution data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id === 'new' || id === 'nova') {
      setLoading(false);
      return;
    }
    fetchCautionData();
  }, [id]);

  const handleDownloadPDF = () => {
    if (!caution) return;
    generateCautionPDF(caution, items, signatures, militaryUser);
  };

  const handleDownloadDescautelaPDF = () => {
    if (!caution) return;
    try {
      setDownloadingDescautela(true);
      generateDescautelaPDF(
        caution, 
        items, 
        signatures, 
        militaryUser || (userProfile as User), 
        receiverUser || (userProfile?.perfil === 'ADMINISTRADOR' ? userProfile as User : undefined)
      );
    } catch (err) {
      console.error('Erro ao baixar Termo de Descautela:', err);
      setNotification({ type: 'error', message: 'Não foi possível gerar o Termo de Descautela.' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setDownloadingDescautela(false);
    }
  };

  const handleRequestDescautela = () => {
    if (!caution) return;
    setActionConfirm(true);
  };

  const executeRequestDescautela = async () => {
    if (!caution) return;
    try {
      setRequestingDescautela(true);
      await updateDoc(doc(db, 'cautions', caution.id), {
        status: 'DEVOLUCAO_INICIADA',
        returnRequestedAt: new Date().toISOString(),
        returnRequestedBy: userProfile?.id,
        returnRequestedByName: `${userProfile?.postoGraduacao} ${userProfile?.nomeGuerra || userProfile?.nomeCompleto}`
      });
      await fetchCautionData();
      setNotification({
        type: 'success',
        message: 'Solicitação de descautela enviada com sucesso! Apresente o material para a equipe de logística.'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Erro ao solicitar descautela:', err);
      setNotification({ type: 'error', message: 'Erro ao enviar solicitação de descautela.' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setRequestingDescautela(false);
      setActionConfirm(false);
    }
  };

  const handleDeleteCaution = async () => {
    if (!caution || !id || !window.confirm('Tem certeza que deseja excluir esta cautela? Esta ação é irreversível.')) return;
    try {
      // Excluir assinaturas
      for (const sig of signatures) {
        await deleteDoc(doc(db, 'cautions', id, 'signatures', sig.id));
      }
      // Excluir itens
      for (const item of items) {
        await deleteDoc(doc(db, 'cautions', id, 'items', item.id));
      }
      // Excluir a cautela em si
      await deleteDoc(doc(db, 'cautions', id));
      navigate(-1);
    } catch (err) {
      console.error('Erro ao excluir cautela:', err);
      setNotification({ type: 'error', message: 'Erro ao excluir cautela.' });
    }
  };

  const handleReenviarAssinatura = async () => {
    if (!caution || !id || !window.confirm('Tem certeza que deseja retornar esta cautela para a fase de assinatura do militar?')) return;
    try {
      const newVersion = (caution.version || 1) + 1;
      
      // Clear previous signatures
      for (const sig of signatures) {
        await deleteDoc(doc(db, 'cautions', id, 'signatures', sig.id));
      }

      await updateDoc(doc(db, 'cautions', id), {
        status: 'AGUARDANDO_ASSINATURA_MILITAR',
        version: newVersion,
        signedAt: null
      });
      await fetchCautionData();
      setNotification({ type: 'success', message: 'Cautela reenviada para o militar assinar novamente.' });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Erro ao reenviar:', err);
      setNotification({ type: 'error', message: 'Erro ao reenviar para assinatura.' });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando dados da cautela...</div>;

  const isAdmin = userProfile?.perfil === 'ADMINISTRADOR';
  const isMilitar = userProfile?.perfil === 'MILITAR';
  const canAdminDescautelar = isAdmin && caution && ['CAUTELADA', 'DEVOLUCAO_INICIADA', 'COM_DIVERGENCIA'].includes(caution.status);
  const canMilitarRequestDescautela = isMilitar && caution && caution.status === 'CAUTELADA';

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Toast Notification em UI */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200 ${
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
      {actionConfirm && caution && (
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
                onClick={() => setActionConfirm(false)}
                disabled={requestingDescautela}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeRequestDescautela}
                disabled={requestingDescautela}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center shadow-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
              >
                {requestingDescautela ? 'Enviando...' : 'Confirmar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 mb-6 hover:text-gray-900 text-sm font-medium">
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao Painel
      </button>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pb-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {id === 'new' || id === 'nova' 
                ? 'Nova Cautela' 
                : `Cautela: ${caution?.type === 'MATERIAL_PADRONIZADO' ? 'Materiais Padronizados' : caution?.type === 'VIATURA' ? 'Viatura' : 'Específica'}`
              }
            </h2>
            {caution && (
              <p className="text-xs text-gray-500 mt-0.5">
                Ciclo / TIF: <strong>{caution.unitGcif || 'Não informado'}</strong> • Base: <strong>{caution.base || 'Não informada'}</strong>
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {caution && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                caution.status === 'DESCAUTELADA' ? 'bg-green-100 text-green-800 border-green-200' :
                caution.status === 'CAUTELADA' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                {caution.status.replace(/_/g, ' ')}
              </span>
            )}
            
            <div className="flex items-center gap-2">
              {isAdmin && caution && caution.status !== 'RASCUNHO' && caution.status !== 'AGUARDANDO_ASSINATURA_MILITAR' && (
                <button
                  onClick={handleReenviarAssinatura}
                  className="flex items-center px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-200 text-xs font-semibold transition-colors"
                  title="Corrigir e Reenviar para Assinatura do Militar"
                >
                  <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                  Corrigir / Reenviar
                </button>
              )}
              
              {caution && (isAdmin || (caution.status === 'RASCUNHO' && caution.responsibleUserId === userProfile?.id)) && (
                <button
                  onClick={handleDeleteCaution}
                  className="flex items-center px-3 py-1 bg-red-100 text-red-800 border border-red-200 rounded-lg hover:bg-red-200 text-xs font-semibold transition-colors"
                  title="Excluir Cautela"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <CautionForm 
            existingCaution={caution || undefined} 
            existingItems={items} 
            onSaved={(newId) => {
              if (id === 'new' || id === 'nova') {
                navigate(`/cautions/${newId}`, { replace: true });
              }
            }} 
          />
          
          {/* Informação sobre status de devolução iniciada */}
          {caution?.status === 'DEVOLUCAO_INICIADA' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start space-x-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Solicitação de Descautela Enviada</strong>
                <span>
                  {isAdmin 
                    ? 'O militar solicitou a descautela desta carga. Realize a conferência física dos materiais e viatura e assine o termo de baixa abaixo.'
                    : 'Sua solicitação de descautela foi enviada aos Administradores da Logística. Apresente os materiais e a viatura para conferência física e assinatura de baixa.'
                  }
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t mt-8">
            {/* Download do Termo de Descautela se já estiver descautelada */}
            {caution && caution.status === 'DESCAUTELADA' && (
              <button 
                onClick={handleDownloadDescautelaPDF}
                disabled={downloadingDescautela}
                className="px-4 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-md font-bold text-sm flex items-center shadow-xs transition-colors"
                title="Baixar Termo Oficial de Descautela e Baixa com as assinaturas digitais"
              >
                <Download className="w-4 h-4 mr-2" />
                {downloadingDescautela ? 'Gerando...' : 'Baixar Termo de Descautela (PDF)'}
              </button>
            )}

            {/* Download da Cautela inicial */}
            {caution && caution.status !== 'RASCUNHO' && (
              <button 
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md font-medium text-sm flex items-center shadow-xs transition-colors"
              >
                <Download className="w-4 h-4 mr-2" /> 
                {caution.status === 'DESCAUTELADA' ? 'Baixar Cautela Inicial (PDF)' : 'Baixar Cautela (PDF)'}
              </button>
            )}
            
            {/* Assinatura inicial de retirada ou correção de divergência */}
            {caution && (caution.status === 'RASCUNHO' || caution.status === 'COM_DIVERGENCIA' || caution.status === 'AGUARDANDO_ASSINATURA_MILITAR') && (
              <button 
                onClick={() => setShowSignature(true)}
                className="px-4 py-2 text-white bg-red-800 hover:bg-red-900 rounded-md font-medium text-sm flex items-center shadow-xs transition-colors"
              >
                <FileSignature className="w-4 h-4 mr-2" /> 
                {(caution.status === 'COM_DIVERGENCIA' || caution.status === 'AGUARDANDO_ASSINATURA_MILITAR') ? 'Assinar e Enviar Correção' : 'Assinar e Emitir Cautela'}
              </button>
            )}

            {/* Solicitar descautela pelo Militar do ciclo */}
            {canMilitarRequestDescautela && (
              <button 
                onClick={handleRequestDescautela}
                disabled={requestingDescautela}
                className="px-4 py-2 text-white bg-amber-600 hover:bg-amber-700 rounded-md font-bold text-sm flex items-center shadow-xs transition-colors disabled:opacity-50"
                title="Clique ao final do ciclo para solicitar a conferência e descautela aos Administradores"
              >
                <Send className="w-4 h-4 mr-2" />
                <span>{requestingDescautela ? 'Enviando...' : 'Solicitar Descautela ao Administrador'}</span>
              </button>
            )}

            {/* Realizar Descautela EXCLUSIVO para Administradores */}
            {canAdminDescautelar && (
              <button 
                onClick={() => setShowDescautela(true)}
                className="px-4 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-md font-bold text-sm flex items-center shadow-xs transition-colors"
                title="Ação exclusiva do perfil Administrador"
              >
                <FileCheck2 className="w-4 h-4 mr-2" />
                Realizar Descautela (Administrador)
              </button>
            )}
          </div>
        </div>
      </div>
      
      {showSignature && caution && (
        <SignatureModal
          cautionId={caution.id}
          cautionData={caution}
          type="RETIRADA"
          onClose={() => setShowSignature(false)}
          onSuccess={() => {
            setShowSignature(false);
            fetchCautionData();
          }}
        />
      )}

      {showDescautela && caution && (
        <DescautelaModal
          caution={caution}
          onClose={() => setShowDescautela(false)}
          onSuccess={() => {
            setShowDescautela(false);
            fetchCautionData();
          }}
        />
      )}
    </div>
  );
}
