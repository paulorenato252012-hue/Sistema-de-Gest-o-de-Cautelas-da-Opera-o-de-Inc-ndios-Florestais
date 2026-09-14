import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Caution } from '../lib/types';
import { useNavigate } from 'react-router-dom';

export function LogisticaPanel() {
  const navigate = useNavigate();
  const [cautions, setCautions] = useState<Caution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuta cautelas que precisam de atenção da logística
    const q = query(
      collection(db, 'cautions'),
      where('status', 'in', ['CAUTELADA', 'DEVOLUCAO_INICIADA', 'AGUARDANDO_RECEBIMENTO_LOGISTICA']),
      // orderBy('createdAt', 'desc') // Requires composite index if used with where in
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caution));
      setCautions(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Painel Logística</h1>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {cautions.length === 0 && !loading && (
            <li className="p-4 text-center text-gray-500">Nenhuma cautela pendente de ação.</li>
          )}
          {cautions.map(caution => (
            <li key={caution.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {caution.type.replace('_', ' ')} - {caution.unitGcif}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status: {caution.status.replace(/_/g, ' ')}
                  </p>
                </div>
                <button onClick={() => navigate(`/cautions/${caution.id}`)} className="bg-gray-100 text-gray-700 px-3 py-1 rounded border hover:bg-gray-200 text-sm">Visualizar</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
