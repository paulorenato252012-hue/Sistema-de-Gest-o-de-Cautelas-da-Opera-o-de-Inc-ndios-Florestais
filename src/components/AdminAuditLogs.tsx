import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  userName?: string;
  userMatricula?: string;
  userPosto?: string;
  details: string;
  timestamp: string;
}

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100));
        const snap = await getDocs(q);
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <div className="p-8 text-center">Carregando logs de auditoria...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <ShieldCheck className="w-6 h-6 text-gray-700 mr-2" />
          <h2 className="text-xl font-bold text-gray-800">Histórico de Auditoria (Logs)</h2>
        </div>
        <span className="text-sm text-gray-500">Últimos 100 registros</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Nenhum log registrado.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      {log.timestamp ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      {log.userName ? `${log.userName} (Mat: ${log.userMatricula || 'N/A'})` : log.userEmail}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{log.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
