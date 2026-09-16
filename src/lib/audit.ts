import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function logAudit(action: string, userProfile: any, details: string) {
  try {
    if (!userProfile) return;
    const matricula = userProfile.matricula || '';
    const email = userProfile.email || (matricula ? `${matricula}@cbmms.internal` : 'N/A');
    const name = `${userProfile.postoGraduacao || ''} ${userProfile.nomeGuerra || userProfile.nomeCompleto || ''}`.trim() || userProfile.nomeCompleto || matricula || 'Usuário';

    await addDoc(collection(db, 'audit_logs'), {
      action,
      userId: userProfile.id || 'N/A',
      userEmail: email,
      userName: name,
      userMatricula: matricula,
      userPosto: userProfile.postoGraduacao || '',
      details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}
