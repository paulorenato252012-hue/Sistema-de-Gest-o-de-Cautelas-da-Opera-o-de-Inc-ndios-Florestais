import React, { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Caution, CautionItem } from '../lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';

export function AdminDashboard() {
  const [cautions, setCautions] = useState<Caution[]>([]);
  const [items, setItems] = useState<CautionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cautionsSnap = await getDocs(query(collection(db, 'cautions')));
        let fetchedItems: CautionItem[] = [];
        try {
          const itemsSnap = await getDocs(query(collectionGroup(db, 'items')));
          fetchedItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as CautionItem));
        } catch (subErr) {
          console.warn('Could not query collectionGroup items, trying fallback:', subErr);
        }
        
        setCautions(cautionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Caution)));
        setItems(fetchedItems);
      } catch (err) {
        console.error('Erro ao carregar métricas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center">Carregando painel...</div>;

  // Stats: Viaturas em campo vs base
  const vEmCampo = cautions.filter(c => c.type === 'VIATURA' && c.status === 'CAUTELADA').length;
  const vNaBase = cautions.filter(c => c.type === 'VIATURA' && (c.status === 'DESCAUTELADA' || c.status === 'DEVOLUCAO_INICIADA')).length;
  
  const viaturasData = [
    { name: 'Em Campo', value: vEmCampo },
    { name: 'Na Base (Devolvidas)', value: vNaBase }
  ];

  // Stats: Volume por ciclo
  const ciclosMap: Record<string, number> = {};
  cautions.forEach(c => {
    const nome = c.unitGcif || 'Desconhecido';
    ciclosMap[nome] = (ciclosMap[nome] || 0) + 1;
  });
  const ciclosData = Object.keys(ciclosMap).map(k => ({ name: k, total: ciclosMap[k] }));

  // Stats: Materiais com Avaria
  const avariasMap: Record<string, number> = {};
  items.forEach(i => {
    if (i.conditionWithdrawal && i.conditionWithdrawal.toLowerCase().includes('avaria')) {
      avariasMap[i.description] = (avariasMap[i.description] || 0) + 1;
    }
  });
  const avariasData = Object.keys(avariasMap).map(k => ({ name: k, avarias: avariasMap[k] }));

  const COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];

  const handleExportCSV = () => {
    let csv = "ID,Ciclo,Tipo,Status,Responsável,Base,CriadoEm\n";
    cautions.forEach(c => {
      csv += `"${c.id}","${c.unitGcif}","${c.type}","${c.status}","${c.responsibleUserId}","${c.base || ''}","${c.createdAt}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "cautelas_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Painel de Bordo & Relatórios</h2>
        <button onClick={handleExportCSV} className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-center mb-4">Status de Viaturas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={viaturasData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                  {viaturasData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <h3 className="text-lg font-semibold text-center mb-4">Cautelas por Ciclo</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ciclosData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
        <h3 className="text-lg font-semibold text-center mb-4">Materiais com Avarias Registradas</h3>
        {avariasData.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhuma avaria registrada nos itens.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avariasData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="avarias" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
