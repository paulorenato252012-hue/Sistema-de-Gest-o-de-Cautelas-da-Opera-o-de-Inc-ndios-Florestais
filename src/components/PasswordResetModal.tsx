import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { sendEmailNotification } from '../lib/emailService';
import { User } from '../lib/types';
import { KeyRound, Mail, CheckCircle2, AlertTriangle, ArrowLeft, Send, ShieldAlert, X } from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMatricula?: string;
}

export function PasswordResetModal({ isOpen, onClose, defaultMatricula = '' }: PasswordResetModalProps) {
  const [identificador, setIdentificador] = useState(defaultMatricula);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    emailMascarado: string;
    instrucoes: string;
    nomeMilitar: string;
  } | null>(null);

  if (!isOpen) return null;

  const maskEmail = (emailStr: string) => {
    const parts = emailStr.split('@');
    if (parts.length !== 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    const visibleStart = name.slice(0, 2);
    const visibleEnd = name.length > 3 ? name.slice(-1) : '';
    return `${visibleStart}***${visibleEnd}@${domain}`;
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessInfo(null);

    const cleanId = identificador.trim().toLowerCase();
    if (!cleanId) {
      setError('Por favor, informe sua matrícula ou seu e-mail cadastrado.');
      return;
    }

    setLoading(true);

    try {
      let targetUser: User | null = null;

      // 1. Procura usuário pelo e-mail ou pela matrícula
      if (cleanId.includes('@')) {
        const qEmail = query(collection(db, 'users'), where('email', '==', cleanId));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          targetUser = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() } as User;
        }
      } else {
        const cleanMatricula = cleanId.replace(/[^a-z0-9]/g, '');
        const qMat = query(collection(db, 'users'), where('matricula', '==', cleanMatricula));
        const snapMat = await getDocs(qMat);
        if (!snapMat.empty) {
          targetUser = { id: snapMat.docs[0].id, ...snapMat.docs[0].data() } as User;
        }
      }

      if (!targetUser) {
        setError(`Não foi encontrado nenhum cadastro com a identificação informada ("${cleanId}"). Verifique sua matrícula funcional ou contate a administração.`);
        setLoading(false);
        return;
      }

      const emailCadastrado = targetUser.email ? targetUser.email.trim().toLowerCase() : '';

      // Verifica se o usuário possui e-mail cadastrado
      if (!emailCadastrado || emailCadastrado.endsWith('@cbmms.internal')) {
        setError(
          `O militar/administrador (${targetUser.postoGraduacao || ''} ${targetUser.nomeGuerra || targetUser.nomeCompleto || targetUser.matricula}) ainda não possui um e-mail pessoal registrado no primeiro acesso. Solicite a um Administrador da Logística para redefinir seu primeiro acesso.`
        );
        setLoading(false);
        return;
      }

      // 2. Gera código/token de recuperação seguro
      const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
      const resetToken = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

      // Salva solicitação no Firestore
      const resetDocId = `reset_${targetUser.matricula}_${Date.now()}`;
      await setDoc(doc(db, 'password_resets', resetDocId), {
        userId: targetUser.id,
        matricula: targetUser.matricula,
        nomeCompleto: targetUser.nomeCompleto,
        email: emailCadastrado,
        recoveryCode,
        token: resetToken,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hora de validade
      });

      // Marca usuário para exigir alteração de senha no próximo login
      try {
        await updateDoc(doc(db, 'users', targetUser.id), {
          passwordChangeRequired: true,
          tempRecoveryActive: true
        });
      } catch (errIgnore) {
        // ignora se update falhar
      }

      // 3. Dispara e-mail de recuperação para o e-mail cadastrado
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #991b1b; color: #ffffff; padding: 18px 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">CORPO DE BOMBEIROS MILITAR - MS</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Recuperação de Senha de Acesso ao Sistema de Cautelas DPA</p>
          </div>
          <div style="padding: 24px;">
            <h3 style="color: #991b1b; margin-top: 0;">Solicitação de Redefinição de Senha</h3>
            <p>Prezado(a) <strong>${targetUser.postoGraduacao || ''} ${targetUser.nomeGuerra || targetUser.nomeCompleto}</strong> (Matrícula: ${targetUser.matricula}),</p>
            <p>Recebemos uma solicitação para recuperação de senha da sua conta funcional no aplicativo de Cautelas do CBMMS.</p>
            
            <div style="background-color: #fef2f2; border: 1px dashed #ef4444; padding: 16px; margin: 20px 0; text-align: center; border-radius: 6px;">
              <span style="font-size: 12px; color: #7f1d1d; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Seu Código Temporário de Recuperação:</span>
              <strong style="font-size: 28px; letter-spacing: 6px; color: #991b1b; font-family: monospace;">${recoveryCode}</strong>
            </div>

            <p style="font-size: 13px; color: #374151;">
              Para restaurar seu acesso e definir uma nova senha pessoal:
            </p>
            <ol style="font-size: 13px; color: #374151; padding-left: 20px;">
              <li>Acesse o aplicativo de Cautelas DPA com sua matrícula (<strong>${targetUser.matricula}</strong>);</li>
              <li>Sua conta foi temporariamente liberada para criar uma nova senha pessoal segura;</li>
              <li>Se você não realizou esta solicitação, comunique imediatamente a equipe de Administração da Logística.</li>
            </ol>

            <p style="font-size: 11px; color: #6b7280; margin-top: 24px; border-top: 1px solid #e5e7eb; pt: 12px;">
              Corpo de Bombeiros Militar de Mato Grosso do Sul • Diretoria de Proteção Ambiental (DPA)
            </p>
          </div>
        </div>
      `;

      await sendEmailNotification({
        to: emailCadastrado,
        subject: `[CBMMS Cautelas] Código de Recuperação de Senha - Matrícula ${targetUser.matricula}`,
        html: emailHtml,
        metadata: {
          type: 'PASSWORD_RESET',
          matricula: targetUser.matricula,
          userId: targetUser.id
        }
      });

      // Tenta também enviar o reset oficial do Firebase Auth caso o email Auth corresponda
      try {
        await sendPasswordResetEmail(auth, emailCadastrado);
      } catch (authResetErr) {
        // Se a conta no Firebase Auth usar o email interno, a notificação já foi enfileirada no email real do usuário
      }

      setSuccessInfo({
        emailMascarado: maskEmail(emailCadastrado),
        nomeMilitar: `${targetUser.postoGraduacao || ''} ${targetUser.nomeGuerra || targetUser.nomeCompleto}`,
        instrucoes: `As instruções de redefinição e o código de recuperação foram enviados com sucesso para ${maskEmail(emailCadastrado)}.`
      });
    } catch (err: any) {
      console.error('Erro ao processar recuperação de senha:', err);
      setError('Erro ao processar o pedido de recuperação. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2 text-red-800">
            <KeyRound className="w-5 h-5" />
            <h3 className="text-base font-bold text-gray-900">Recuperação de Senha</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium border border-red-200 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successInfo ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Instruções Enviadas!</span>
              </div>
              <p className="leading-relaxed">
                Militar: <strong>{successInfo.nomeMilitar}</strong>
              </p>
              <p className="leading-relaxed">
                Enviamos o código e o link de redefinição para o endereço: <strong className="font-mono text-emerald-950">{successInfo.emailMascarado}</strong> (e-mail cadastrado no seu primeiro acesso).
              </p>
              <p className="text-[11px] text-emerald-700">
                Verifique sua caixa de entrada (e a pasta de spam) para seguir as instruções.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-red-800 hover:bg-red-900 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              Concluir e Voltar ao Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              Esqueceu sua senha? Digite sua <strong>matrícula funcional</strong> ou seu <strong>e-mail cadastrado</strong> no primeiro acesso. Enviaremos as instruções de recuperação para seu e-mail pessoal/funcional.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Matrícula Funcional ou E-mail
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ex: 100002 ou meuemail@gmail.com"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1 text-amber-950">
                <Mail className="w-3.5 h-3.5 text-amber-700" />
                Envio Seguro para o E-mail Cadastrado
              </p>
              <p className="text-[11px] mt-0.5 leading-relaxed text-amber-800">
                O envio do processo de recuperação será direcionado automaticamente ao e-mail informado no primeiro acesso do militar ou administrador.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {loading ? 'Consultando e Enviando...' : 'Enviar Recuperação por E-mail'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
