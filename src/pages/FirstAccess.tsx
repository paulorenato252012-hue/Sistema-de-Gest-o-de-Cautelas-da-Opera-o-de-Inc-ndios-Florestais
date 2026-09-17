import React, { useState, useEffect } from 'react';
import { updatePassword, deleteUser } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, UserCheck, Wrench, Shield, CheckCircle2, Eye, EyeOff, Mail } from 'lucide-react';

export function FirstAccess() {
  const { currentUser, userProfile, signOut } = useAuth();
  
  // Profile fields
  const [perfil, setPerfil] = useState<'MILITAR' | 'ADMINISTRADOR'>('MILITAR');
  const [isLogistica, setIsLogistica] = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomeGuerra, setNomeGuerra] = useState('');
  const [postoGraduacao, setPostoGraduacao] = useState('SD BM');
  const [email, setEmail] = useState('');
  const [unidade, setUnidade] = useState('');
  const [customUnidade, setCustomUnidade] = useState('');
  
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
      setIsLogistica(userProfile.unidade?.toUpperCase().includes('LOGÍSTICA') || userProfile.unidade?.toUpperCase().includes('DPA') || isAdm);
      setNomeCompleto(userProfile.nomeCompleto?.startsWith('Militar ') || userProfile.nomeCompleto?.startsWith('Administrador ') ? '' : userProfile.nomeCompleto);
      setNomeGuerra(userProfile.nomeGuerra?.startsWith('MILITAR ') ? '' : userProfile.nomeGuerra);
      setPostoGraduacao(userProfile.postoGraduacao || (isAdm ? '1º TEN BM' : 'SD BM'));
      // Preenche o email se já tiver ou se for email real
      if (userProfile.email && !userProfile.email.endsWith('@cbmms.internal')) {
        setEmail(userProfile.email);
      }
      const existingUnidade = userProfile.unidade || (isAdm ? 'DPA' : '');
      const validOptions = ['QCG', 'DPA', 'ABM', 'AMAMBAI', 'APARECIDA DO TABOADO', 'AQUIDAUANA', 'BATAGUASSU', 'BELA VISTA', 'BONITO', 'CAARAPÓ', 'CAMPO GRANDE', 'CHAPADÃO DO SUL', 'CORUMBÁ', 'COSTA RICA', 'COXIM', 'DOURADOS', 'FÁTIMA DO SUL', 'IVINHEMA', 'JARDIM', 'MARACAJU', 'MIRANDA', 'MUNDO NOVO', 'NAVIRAÍ', 'NOVA ANDRADINA', 'PARANAÍBA', 'PONTA PORÃ', 'RIBAS DO RIO PARDO', 'SÃO GABRIEL DO OESTE', 'SIDROLÂNDIA', 'TRÊS LAGOAS'];
      
      if (existingUnidade && !validOptions.includes(existingUnidade)) {
        setUnidade('OUTRA');
        setCustomUnidade(existingUnidade);
      } else {
        setUnidade(existingUnidade);
      }
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

    const finalUnidade = unidade === 'OUTRA' ? customUnidade.trim().toUpperCase() : unidade.trim().toUpperCase();

    if (!nomeCompleto.trim() || !nomeGuerra.trim() || !postoGraduacao || !finalUnidade) {
      setError('Por favor, preencha todos os dados de identificação funcional.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Por favor, informe um endereço de e-mail válido para recuperação de senha e recebimento de PDFs.');
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
          email: cleanEmail,
          unidade: finalUnidade,
          perfil,
          ativo: true,
          passwordChangeRequired: false,
          firstAccessCompleted: true,
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
        setError('Sua sessão expirou por segurança. Clique no botão "Sair / Cancelar" abaixo e faça o login novamente.');
      } else {
        setError('Erro ao salvar os dados. ' + (err.message || 'Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelFirstAccess = async () => {
    try {
      setLoading(true);
      // Se o usuário está cancelando sem nunca ter concluído o primeiro acesso,
      // removemos o registro do Firestore e da autenticação para não deixar "usuário fantasma/incompleto"
      if (currentUser && (!userProfile?.termsAccepted || userProfile?.firstAccessCompleted === false || userProfile?.passwordChangeRequired)) {
        try {
          await deleteDoc(doc(db, 'users', currentUser.uid));
        } catch (e) {
          console.warn('Erro ao remover doc de usuário incompleto:', e);
        }
        if (userProfile?.id && userProfile.id !== currentUser.uid) {
          try {
            await deleteDoc(doc(db, 'users', userProfile.id));
          } catch (e) {
            console.warn('Erro ao remover doc secundário:', e);
          }
        }
        try {
          await deleteUser(currentUser);
          return;
        } catch (authDelErr) {
          console.warn('Não foi possível excluir conta auth no cancelamento:', authDelErr);
        }
      }
      await signOut();
    } catch (e) {
      console.error('Erro ao cancelar primeiro acesso:', e);
      await signOut();
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

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                E-mail Pessoal / Funcional (Para recuperação de senha e envio de Cautelas/Descautelas) <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm lowercase"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="exemplo@gmail.com ou militar@bombeiros.ms.gov.br"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Este e-mail será utilizado para recuperação de senha caso você a esqueça e para envio dos PDFs gerados de cautelas e descautelas.
              </p>
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
                )}{unidade === 'OUTRA' && (
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
              )}
              </div>
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
              Esta nova senha pessoal substituirá a senha padrão (militar193 / dpa_admin) e será necessária para seus próximos acessos e para validar suas assinaturas digitais de cautela.
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
                <li>O uso do sistema destina-se exclusivamente ao controle patrimonial e cautelas do TIF.</li>
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

          <div className="pt-2 space-y-3">
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

            <button
              type="button"
              onClick={handleCancelFirstAccess}
              disabled={loading}
              className="w-full bg-white text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors shadow-sm text-sm"
            >
              Sair / Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
