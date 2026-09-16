import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Flame, Share2, ShieldCheck, UserCheck, KeyRound, Info, Wrench, Eye, EyeOff } from 'lucide-react';
import { ShareInstallModal } from '../components/ShareInstallModal';

export function Login() {
  const [perfilAcesso, setPerfilAcesso] = useState<'MILITAR' | 'ADMINISTRADOR'>('MILITAR');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const navigate = useNavigate();

  // Senha padrão institucional exibida exclusivamente para Militares do Ciclo
  const SENHA_PADRAO_MILITAR = 'militar193';
  // Senha padrão institucional obrigatória para primeiro acesso de Administradores
  const SENHA_PADRAO_ADMIN = 'dpa_admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanMatricula = matricula.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanMatricula) {
      setError('Por favor, informe uma matrícula funcional válida.');
      return;
    }

    if (!senha || senha.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const internalEmail = `${cleanMatricula}@dpa.internal`;
      
      // 1. Tentar login direto no Firebase Auth
      try {
        const userCredential = await signInWithEmailAndPassword(auth, internalEmail, senha);
        const loggedUser = userCredential.user;

        // Se o usuário fez login com credenciais válidas:
        if (loggedUser) {
          const userDocRef = doc(db, 'users', loggedUser.uid);
          let uSnap = await getDoc(userDocRef);
          let userData = uSnap.exists() ? uSnap.data() : null;

          // Se não encontrou pelo UID, busca pelo campo de matrícula
          if (!userData) {
            const qMat = query(collection(db, 'users'), where('matricula', '==', cleanMatricula));
            const snapMat = await getDocs(qMat);
            if (!snapMat.empty) {
              userData = snapMat.docs[0].data();
            }
          }

          const isMaster = cleanMatricula === '123456' || cleanMatricula === 'admin' || cleanMatricula === 'paulorenato252012';

          // Se o militar tentou logar selecionando a aba de ADMINISTRADOR:
          // Se ele estiver cadastrado como MILITAR (por exemplo, foi retirado da condição de administrador),
          // barramos o acesso com mensagem explicativa e encerramos a sessão.
          if (perfilAcesso === 'ADMINISTRADOR') {
            if (userData && userData.perfil !== 'ADMINISTRADOR' && userData.perfil !== 'LOGISTICA' && !isMaster) {
              await signOut(auth);
              setError(`A matrícula ${cleanMatricula} está cadastrada com perfil de Militar do Ciclo e não tem permissão de Administrador. Para acessar, selecione a aba "Militar do Ciclo" acima.`);
              setLoading(false);
              return;
            }
          }
        }

        navigate('/');
        return;
      } catch (authErr: any) {
        // Se as credenciais falharem, verifica se é um primeiro acesso para registrar a conta
        if (
          authErr.code === 'auth/invalid-credential' || 
          authErr.code === 'auth/user-not-found' || 
          authErr.code === 'auth/wrong-password'
        ) {
          const isDefaultMilitarPass = senha === SENHA_PADRAO_MILITAR || senha === 'dpa193';

          // Validações de primeiro acesso
          if (perfilAcesso === 'ADMINISTRADOR') {
            // O primeiro acesso para novos administradores deve ser realizado SOMENTE com a senha padrão dpa_admin
            if (senha !== SENHA_PADRAO_ADMIN) {
              setError('O primeiro acesso para novos administradores deve ser realizado somente com a senha padrão: dpa_admin');
              return;
            }
          } else {
            if (!isDefaultMilitarPass && senha.length < 6) {
              setError(`Para o primeiro acesso como militar do ciclo, use a senha padrão: ${SENHA_PADRAO_MILITAR}`);
              return;
            }
          }

          // 2. Tentar registrar como primeiro acesso com a senha informada
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, senha);
            const user = userCredential.user;

            // Verifica se já existia pré-cadastro criado no AdminPanel para esta matrícula
            const preDocRef = doc(db, 'users', user.uid);
            let existingData = null;
            const preSnap = await getDoc(preDocRef);
            if (preSnap.exists()) {
              existingData = preSnap.data();
            } else {
              const qPre = query(collection(db, 'users'), where('matricula', '==', cleanMatricula));
              const snapPre = await getDocs(qPre);
              if (!snapPre.empty) {
                existingData = snapPre.docs[0].data();
              }
            }

            const isRoleAdmin = existingData 
              ? existingData.perfil === 'ADMINISTRADOR' 
              : (perfilAcesso === 'ADMINISTRADOR' || cleanMatricula === '123456' || cleanMatricula === 'admin' || cleanMatricula === 'paulorenato252012');
            const isPrincipalAdmin = cleanMatricula === '123456' || cleanMatricula === 'admin' || cleanMatricula === 'paulorenato252012';
            const finalPerfil = isRoleAdmin ? 'ADMINISTRADOR' : 'MILITAR';

            // Registra o perfil do usuário no Firestore
            await setDoc(doc(db, 'users', user.uid), {
              matricula: cleanMatricula,
              nomeCompleto: existingData?.nomeCompleto || (isPrincipalAdmin 
                ? 'ADMINISTRADOR PRINCIPAL (LOGÍSTICA)' 
                : isRoleAdmin 
                ? `ADMINISTRADOR LOGÍSTICA (${cleanMatricula.toUpperCase()})` 
                : `Militar ${cleanMatricula}`),
              nomeGuerra: existingData?.nomeGuerra || (isPrincipalAdmin 
                ? 'ADMIN PRINCIPAL' 
                : cleanMatricula.toUpperCase()),
              postoGraduacao: existingData?.postoGraduacao || (isRoleAdmin ? '1º TEN BM' : 'SD BM'),
              perfil: finalPerfil,
              unidade: existingData?.unidade || (isRoleAdmin ? 'DPA' : 'QCG'),
              ativo: true,
              passwordChangeRequired: true, // Redireciona para personalizar dados e senha
              termsAccepted: false,
              termsVersion: 'v1.0',
              termsAcceptedAt: null,
              signatureHash: null,
              createdAt: new Date().toISOString(),
            });

            navigate('/');
            return;
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              // A conta já existe no Firebase Auth, ou seja, a senha digitada está incorreta para este usuário
              setError(`Senha incorreta para a matrícula ${cleanMatricula}. Digite sua senha pessoal cadastrada.`);
              return;
            } else if (createErr.code === 'auth/weak-password') {
              setError('A senha deve ter no mínimo 6 caracteres.');
              return;
            } else {
              setError('Não foi possível autenticar. Verifique sua matrícula e senha.');
              return;
            }
          }
        } else if (authErr.code === 'auth/too-many-requests') {
          setError('Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.');
          return;
        } else {
          setError('Erro de conexão ao autenticar. Verifique sua rede.');
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center mb-6 text-red-800">
          <div className="p-3 bg-red-100 rounded-2xl mb-2 shadow-2xs">
            <Flame size={38} className="text-red-800" />
          </div>
          <h1 className="text-2xl font-black text-center text-gray-900 tracking-tight">Cautelas DPA</h1>
          <p className="text-xs text-gray-500 text-center mt-0.5">
            Corpo de Bombeiros Militar de Mato Grosso do Sul • TIF
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium mb-4 border border-red-200 flex items-start space-x-2 animate-in fade-in duration-150">
            <span className="font-bold shrink-0">Atenção:</span>
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-xs font-medium mb-4 border border-blue-200">
            {infoMessage}
          </div>
        )}

        {/* IDENTIFICAÇÃO DO USUÁRIO NO PRIMEIRO ACESSO */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-2 text-center">
            Identifique seu Perfil de Acesso
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Opção 1: Militar do Ciclo */}
            <button
              type="button"
              onClick={() => {
                setPerfilAcesso('MILITAR');
                setError('');
              }}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                perfilAcesso === 'MILITAR'
                  ? 'border-red-800 bg-red-50/70 shadow-2xs ring-2 ring-red-800/20'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <UserCheck className={`w-4 h-4 ${perfilAcesso === 'MILITAR' ? 'text-red-800' : 'text-gray-500'}`} />
                <span className={`text-xs font-bold ${perfilAcesso === 'MILITAR' ? 'text-red-950' : 'text-gray-800'}`}>
                  Militar do Ciclo
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Militar operacional que realiza cautelas e uso em campo.
              </p>
            </button>

            {/* Opção 2: Administrador / Equipe de Logística */}
            <button
              type="button"
              onClick={() => {
                setPerfilAcesso('ADMINISTRADOR');
                setError('');
              }}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                perfilAcesso === 'ADMINISTRADOR'
                  ? 'border-red-800 bg-red-50/70 shadow-2xs ring-2 ring-red-800/20'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <ShieldCheck className={`w-4 h-4 ${perfilAcesso === 'ADMINISTRADOR' ? 'text-red-800' : 'text-gray-500'}`} />
                <span className={`text-xs font-bold ${perfilAcesso === 'ADMINISTRADOR' ? 'text-red-950' : 'text-gray-800'}`}>
                  Administrador
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-tight">
                Gestores & equipe de logística (descautelas e ciclos).
              </p>
            </button>
          </div>

          {/* Aviso de primeiro acesso exibido exclusivamente para Militares do Ciclo */}
          {perfilAcesso === 'MILITAR' && (
            <div className="mt-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px] text-gray-600">
              <div className="flex items-center space-x-1.5 text-gray-700">
                <KeyRound className="w-3.5 h-3.5 text-red-800 shrink-0" />
                <span>
                  Senha padrão de primeiro acesso para militares do ciclo: <strong className="font-mono text-red-900 bg-red-100/70 px-1.5 py-0.5 rounded">{SENHA_PADRAO_MILITAR}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {perfilAcesso === 'ADMINISTRADOR' ? 'Matrícula do Administrador' : 'Matrícula Funcional'}
            </label>
            <input
              type="text"
              required
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder={
                perfilAcesso === 'ADMINISTRADOR'
                  ? 'Ex: 123456 (Principal) ou sua matrícula'
                  : 'Digite sua matrícula funcional'
              }
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={
                  perfilAcesso === 'MILITAR'
                    ? 'Digite sua senha'
                    : 'Digite sua senha'
                }
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
            <p className="text-[11px] text-gray-400 mt-1">
              {perfilAcesso === 'MILITAR'
                ? `No primeiro acesso, use a senha padrão ${SENHA_PADRAO_MILITAR} ou sua senha cadastrada.`
                : 'Insira sua senha de administrador cadastrada ou a senha institucional fornecida.'
              }
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-xs text-sm"
            >
              {loading 
                ? 'Autenticando...' 
                : perfilAcesso === 'ADMINISTRADOR'
                ? 'Acessar como Administrador / Logística'
                : 'Acessar como Militar do Ciclo'
              }
            </button>
          </div>
        </form>

        {/* Rodapé e Link de Compartilhamento / Instalação */}
        <div className="mt-6 pt-5 border-t border-gray-200 text-center">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center text-xs font-bold text-red-800 hover:text-red-950 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-lg transition-colors border border-red-200 shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Compartilhar ou Instalar Aplicativo (PWA / QR Code)
          </button>
        </div>

        <ShareInstallModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      </div>
    </div>
  );
}
