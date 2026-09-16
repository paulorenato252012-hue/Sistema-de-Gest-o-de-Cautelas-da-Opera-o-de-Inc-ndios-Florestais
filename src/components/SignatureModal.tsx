import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import CryptoJS from 'crypto-js';

interface SignatureModalProps {
  cautionId: string;
  cautionData: any; // The full canonical data
  type: 'RETIRADA' | 'DEVOLUCAO';
  onClose: () => void;
  onSuccess: () => void;
}

export function SignatureModal({ cautionId, cautionData, type, onClose, onSuccess }: SignatureModalProps) {
  const { userProfile, currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const declarationText = type === 'RETIRADA' 
    ? 'Declaro que conferi e assumo responsabilidade pelas informações e pelos itens constantes neste documento.'
    : 'Declaro que conferi e recebi os itens devolvidos, ressalvadas as divergências registradas neste documento.';

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !currentUser) return;
    setLoading(true);
    setError('');

    try {
      // 1. Verify password
      const cleanMatricula = (userProfile.matricula || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const internalEmail = `${cleanMatricula}@dpa.internal`;
      await signInWithEmailAndPassword(auth, internalEmail, password);

      // 2. Generate Hash
      const canonicalString = JSON.stringify(cautionData);
      const hashSha256 = CryptoJS.SHA256(canonicalString).toString();

      // 3. Create Signature record
      const sigId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      const signatureData = {
        userId: userProfile.id,
        maskedMatricula: `***${userProfile.matricula.slice(-3)}`,
        name: userProfile.nomeCompleto,
        postoGraduacao: userProfile.postoGraduacao,
        role: userProfile.perfil,
        signedAtUtc: new Date().toISOString(),
        signedAtLocal: new Date().toLocaleString('pt-BR'),
        sessionId: sigId,
        documentVersion: cautionData.version || 1,
        hashSha256,
        type
      };

      await setDoc(doc(db, `cautions/${cautionId}/signatures`, sigId), signatureData);

      // 4. Update Caution status
      const newStatus = type === 'RETIRADA' ? 'CAUTELADA' : 'DESCAUTELADA';
      await updateDoc(doc(db, 'cautions', cautionId), {
        status: newStatus,
        signedAt: serverTimestamp(),
        documentHash: hashSha256
      });

      onSuccess();
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Senha incorreta. Digite sua senha funcional para autenticar a assinatura digital.');
      } else {
        console.error('Erro na assinatura:', err);
        setError('Erro ao validar assinatura. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-bold mb-4 border-b pb-2">Assinatura Eletrônica Interna</h3>
        
        <div className="bg-gray-50 p-4 rounded text-sm text-gray-800 mb-6 border">
          <p className="font-semibold mb-2">Termo de Declaração:</p>
          <p>{declarationText}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSign}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirme sua senha para assinar
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full px-3 py-2 pr-10 border rounded focus:ring-red-500 focus:border-red-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="px-4 py-2 text-white bg-red-800 hover:bg-red-900 rounded font-medium text-sm disabled:opacity-50"
            >
              {loading ? 'Assinando...' : 'Assinar Documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
