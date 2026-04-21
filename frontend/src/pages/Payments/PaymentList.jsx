import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle, PlusCircle } from 'lucide-react';
import api from '../../api/client';

const statusColor = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  late: 'bg-red-100 text-red-700',
  partial: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-gray-100 text-gray-500'
};
const statusLabel = { paid: 'Ödendi', pending: 'Bekliyor', late: 'Gecikti', partial: 'Eksik', cancelled: 'İptal' };

export default function PaymentList() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', status],
    queryFn: () => api.get('/payments', { params: { status: status || undefined, limit: 50 } }).then((r) => r.data)
  });

  const markPaid = useMutation({
    mutationFn: (id) => api.put(`/payments/${id}/mark-paid`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] })
  });

  const generateMonthly = async () => {
    const now = new Date();
    setGenerating(true);
    try {
      await api.post('/payments/generate-monthly', { year: now.getFullYear(), month: now.getMonth() + 1 });
      qc.invalidateQueries({ queryKey: ['payments'] });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ödemeler</h1>
        <button onClick={generateMonthly} disabled={generating} className="btn-secondary py-2 px-3 text-sm">
          <PlusCircle size={15} /> {generating ? '...' : 'Ay Tahakkuku'}
        </button>
      </div>

      <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Tüm Durumlar</option>
        <option value="pending">Bekliyor</option>
        <option value="late">Gecikmiş</option>
        <option value="paid">Ödendi</option>
      </select>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="space-y-2">
          {data?.map((p) => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.property_name}</div>
                  <div className="text-xs text-gray-500">{p.tenant_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Vade: {new Date(p.due_date).toLocaleDateString('tr-TR')}
                    {p.payment_date && ` • Ödeme: ${new Date(p.payment_date).toLocaleDateString('tr-TR')}`}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-bold text-sm">₺{Number(p.amount).toLocaleString('tr-TR')}</span>
                  <span className={`badge ${statusColor[p.status]}`}>{statusLabel[p.status]}</span>
                  {p.status === 'pending' || p.status === 'late' ? (
                    <button
                      onClick={() => markPaid.mutate(p.id)}
                      disabled={markPaid.isPending}
                      className="text-xs text-green-600 flex items-center gap-0.5 hover:underline"
                    >
                      <CheckCircle size={12} /> Tahsil Et
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {!data?.length && <div className="text-center py-8 text-gray-400">Ödeme bulunamadı</div>}
        </div>
      )}
    </div>
  );
}
