import React, { useState, useEffect } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, UserCheck, Wrench, Shield, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export function FirstAccess() {
  const { currentUser, userProfile } = useAuth();
  
  // Profile fields
  const [perfil, setPerfil] = useState<'MILITAR' | 'ADMINISTRADOR'>('MILITAR');
  const [isLogistica, setIsLogistica] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomeGuerra, setNomeGuerra] = useState('');
  const [postoGraduacao, setPostoGraduacao] = useState('SD BM');
  const [unidade, setUnidade] = useState('');
  
  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      const isAdm = userProfile.perfil === 'ADMINISTRADOR';
      setPerfil(isAdm ? 'ADMINISTRADOR' : 'MILITAR');
      setIsLogistica(userProfile.unidade?.toUpperCase().includes('LOGÍSTICA') || isAdm);
      setNomeCompleto(userProfile.nomeCompleto?.startsWith('Militar ') || userProfile.nomeCompleto?.startsWith('Administrador ') ? '' : userProfile.nomeCompleto);
      setNomeGuerra(userProfile.nomeGuerra?.startsWith('MILITAR ') ? '' : userProfile.nomeGuerra);
      setPostoGraduacao(userProfile.postoGraduacao || (isAdm ? 'OFICIAL BM' : 'SD BM'));
      setUnidade(userProfile.unidade || (isAdm ? 'LOGÍSTICA / GCIF' : ''));
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('A nova senha pessoal deve conter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    if (!nomeCompleto.trim() || !nomeGuerra.trim() || !postoGraduacao || !unidade.trim()) {
      setError('Por favor, preencha todos os dados de identificação funcional.');
      return;
    }

    if (!termsAccepted) {
      setError('Você deve aceitar o termo de responsabilidade para prosseguir.');
      return;
    }

    setLoading(true);

    try {
      if (currentUser && newPassword) {
        await updatePassword(currentUser, newPassword);
      }
      
      if (currentUser) {
        const updatePayload = {
          nomeCompleto: nomeCompleto.trim().toUpperCase(),
          nomeGuerra: nomeGuerra.trim().toUpperCase(),
          postoGraduacao,
          unidade: unidade.trim().toUpperCase(),
          perfil,
          ativo: true,
          passwordChangeRequired: false,
          termsAccepted: true,
          termsVersion: 'v1.0',
          termsAcceptedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'users', currentUser.uid), updatePayload);
        if (userProfile?.id && userProfile.id !== currentUser.uid) {
          try {
            await updateDoc(doc(db, 'users', userProfile.id), updatePayload);
          } catch (ignore) {
            // ignore if secondary doc ID is not found
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Sua sessão expirou para troca de senha. Saia e entre novamente com sua senha.');
      } else {
        setError('Erro ao salvar os dados. ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const postosGraduacoes = [
    'CEL BM', 'TC CEL BM', 'MAJ BM', 'CAP BM', '1º TEN BM', '2º TEN BM', 'ASP OF BM',
    'ST BM', '1º SGT BM', '2º SGT BM', '3º SGT BM', 'CB BM', 'SD BM', 'AL CB BM', 'AL SD BM'
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 py-8">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200 animate-in fade-in duration-200">
        <div className="flex flex-col items-center mb-6 text-red-800">
          <div className="p-3 bg-red-100 rounded-2xl mb-2 shadow-2xs">
            <ShieldCheck size={42} className="text-red-800" />
          </div>
          <h1 className="text-2xl font-black text-center text-gray-900 tracking-tight">Primeiro Acesso ao Sistema</h1>
          <p className="text-xs text-gray-500 text-center mt-1 max-w-md">
            Confirme sua identificação funcional, cadastre sua nova senha pessoal de segurança e aceite os termos do CBMMS.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-xs font-semibold mb-5 border border-red-200 flex items-center">
            <span className="w-2 h-2 rounded-full bg-red-600 mr-2 shrink-0"></span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SELEÇÃO E CONFIRMAÇÃO DO PAPEL NO PRIMEIRO ACESSO */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Papel no Sistema CBMMS
            </label>
            
            {/* Exibição clara do Perfil Atribuído pelo Sistema / Administrador */}
            <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
              perfil === 'ADMINISTRADOR' 
                ? 'bg-red-50/70 border-red-200 text-red-950' 
                : 'bg-blue-50/70 border-blue-200 text-blue-950'
            }`}>
              <div className={`p-2.5 rounded-xl shrink-0 ${
                perfil === 'ADMINISTRADOR' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {perfil === 'ADMINISTRADOR' ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75 block">
                  Perfil Institucional Atribuído
                </span>
                <p className="text-sm font-bold">
                  {perfil === 'ADMINISTRADOR' ? 'Administrador do Sistema / Logística' : 'Militar do Ciclo'}
                </p>
                <p className="text-xs opacity-80 leading-relaxed">
                  {perfil === 'ADMINISTRADOR' 
                    ? 'Acesso administrativo completo: controle de ciclos operacionais, descautelas a pedido, gestão de viaturas e administração de usuários.' 
                    : 'Acesso operacional: confecção de cautelas, assinatura digital biométrica e conferência de materiais para ciclos abertos.'}
                </p>
              </div>
            </div>
          </div>

          {/* DADOS PROFISSIONAIS */}
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider">
              2. Identificação Profissional
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 uppercase text-sm"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value.toUpperCase())}
                placeholder="Ex: JOSÉ DA SILVA SANTOS"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome de Guerra
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 uppercase text-sm"
                  value={nomeGuerra}
                  onChange={(e) => setNomeGuerra(e.target.value.toUpperCase())}
                  placeholder="EX: SILVA"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Posto / Graduação
                </label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-white"
                  value={postoGraduacao}
                  onChange={(e) => setPostoGraduacao(e.target.value)}
                >
                  <option value="" disabled>Selecione...</option>
                  {postosGraduacoes.map(pg => (
                    <option key={pg} value={pg}>{pg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Unidade / Lotação
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 uppercase text-sm"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value.toUpperCase())}
                placeholder="EX: LOGÍSTICA / GCIF / 1º SGBM / QCG"
              />
            </div>
          </div>

          {/* NOVA SENHA PESSOAL */}
          <div className="space-y-4 pt-2">
            <h2 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider">
              3. Cadastrar Nova Senha Pessoal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nova Senha Pessoal
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              Esta nova senha pessoal substituirá a senha padrão (militar193 / cbmms_admin) e será necessária para seus próximos acessos e para validar suas assinaturas digitais de cautela.
            </p>
          </div>

          {/* TERMO DE RESPONSABILIDADE */}
          <div className="space-y-3 pt-2">
            <h2 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider">
              4. Termo de Responsabilidade
            </h2>
            <div className="bg-gray-50 p-3.5 rounded-xl text-xs text-gray-700 h-28 overflow-y-auto border border-gray-200 font-sans space-y-1.5">
              <p className="font-bold text-gray-900">TERMO DE RESPONSABILIDADE OPERACIONAL - CBMMS</p>
              <p>Ao acessar e operar este sistema institucional, declaro expressamente ciência de que:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                <li>O uso do sistema destina-se exclusivamente ao controle patrimonial e cautelas do GCIF.</li>
                <li>Minha senha funcional autentica assinaturas digitais com validade administrativa e hash SHA-256.</li>
                <li>Sou responsável pela guarda e veracidade da conferência dos materiais e viaturas sob minha custódia.</li>
              </ul>
            </div>
            <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
              <input
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-red-800 focus:ring-red-500 border-gray-300 rounded"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span className="text-xs font-bold text-gray-800">
                Li e concordo com os termos de responsabilidade institucional do CBMMS.
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !termsAccepted || !newPassword || !confirmPassword || newPassword.length < 6}
              className="w-full bg-red-800 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-md text-sm flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Salvando dados...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Concluir Primeiro Acesso e Entrar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
