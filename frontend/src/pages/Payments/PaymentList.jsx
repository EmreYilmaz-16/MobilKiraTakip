import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  const now = new Date();
  const [genYear, setGenYear]   = useState(now.getFullYear());
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    setStatus(searchParams.get('status') || '');
    setOverdueOnly(searchParams.get('overdue') === 'true');
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (overdueOnly) {
      nextParams.set('overdue', 'true');
      nextParams.delete('status');
    } else {
      nextParams.delete('overdue');
      if (status) {
        nextParams.set('status', status);
      } else {
        nextParams.delete('status');
      }
    }

    setSearchParams(nextParams, { replace: true });
  }, [overdueOnly, searchParams, setSearchParams, status]);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', status, overdueOnly],
    queryFn: () => api.get('/payments', {
      params: {
        status: overdueOnly ? undefined : status || undefined,
        overdue: overdueOnly ? 'true' : undefined,
        limit: 100
      }
    }).then((r) => r.data)
  });

  const markPaid = useMutation({
    mutationFn: (id) => api.put(`/payments/${id}/mark-paid`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] })
  });

  const generateMonthly = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await api.post('/payments/generate-monthly', { year: genYear, month: genMonth });
      setGenResult(res.message || res.data?.message || `${genMonth}/${genYear} için tahakkuk oluşturuldu`);
      qc.invalidateQueries({ queryKey: ['payments'] });
    } catch (e) {
      setGenResult(e?.message || 'Hata oluştu');
    } finally {
      setGenerating(false);
    }
  };

  const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ödemeler</h1>
      </div>

      {/* Tahakkuk paneli */}
      <div className="card bg-blue-50 border border-blue-100 space-y-2">
        <p className="text-xs font-semibold text-blue-700">Aylık Tahakkuk Oluştur</p>
        <div className="flex gap-2">
          <select className="input text-sm flex-1" value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))}>
            {monthNames.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="input text-sm w-24" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={generateMonthly} disabled={generating} className="btn-primary py-2 px-3 text-sm whitespace-nowrap">
            <PlusCircle size={15} /> {generating ? '...' : 'Oluştur'}
          </button>
        </div>
        {genResult && <p className="text-xs text-blue-700 font-medium">{genResult}</p>}
      </div>

      <select className="input" value={overdueOnly ? 'overdue' : status} onChange={(e) => {
        const value = e.target.value;
        if (value === 'overdue') {
          setOverdueOnly(true);
          setStatus('');
          return;
        }

        setOverdueOnly(false);
        setStatus(value);
      }}>
        <option value="">Tüm Durumlar</option>
        <option value="overdue">Gecikmiş</option>
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
