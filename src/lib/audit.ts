import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function logAudit(action: string, userProfile: any, details: string) {
  try {
    if (!userProfile) return;
    await addDoc(collection(db, 'audit_logs'), {
      action,
      userId: userProfile.id,
      userEmail: userProfile.email || 'N/A',
      details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}
