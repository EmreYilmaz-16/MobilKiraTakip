import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle } from 'lucide-react';
import api from '../../api/client';

const statusLabel = { active: 'Aktif', expired: 'Bitti', terminated: 'Feshedildi' };
const statusColor = { active: 'bg-green-100 text-green-700', expired: 'bg-gray-100 text-gray-500', terminated: 'bg-red-100 text-red-600' };

/** Sözleşme bitiş tarihine göre renk sınıfı döner
 *  - yeşil: 3 aydan fazla kaldı
 *  - turuncu: 1-3 ay kaldı (uyarı)
 *  - kırmızı: 1 aydan az kaldı veya geçmiş
 */
function contractEndColor(endDateStr, status) {
  if (status !== 'active') return '';
  const today = new Date();
  const end = new Date(endDateStr);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays > 90)  return 'border-l-4 border-green-400';
  if (diffDays > 30)  return 'border-l-4 border-orange-400';
  return 'border-l-4 border-red-400';
}

function EndDateBadge({ endDateStr, status }) {
  if (status !== 'active') return null;
  const today = new Date();
  const end = new Date(endDateStr);
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays > 90) return null;
  if (diffDays > 30) return (
    <span className="flex items-center gap-0.5 text-xs text-orange-600 font-semibold">
      <AlertTriangle size={11} /> {diffDays} gün
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs text-red-600 font-semibold">
      <AlertTriangle size={11} /> {diffDays > 0 ? `${diffDays} gün` : 'SÜRESİ DOLDU'}
    </span>
  );
}

export default function ContractList() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.get('/contracts', { params: { limit: 50 } }).then((r) => r.data)
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sözleşmeler</h1>
        <button onClick={() => navigate('/contracts/new')} className="btn-primary py-2 px-3 text-sm">
          <Plus size={16} /> Ekle
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="space-y-2">
          {data?.map((c) => (
            <div key={c.id} className={`card space-y-1 ${contractEndColor(c.end_date, c.status)}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm">{c.property_name}</div>
                  <div className="text-xs text-gray-600">{c.tenant_name}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`badge ${statusColor[c.status]}`}>{statusLabel[c.status]}</span>
                  <EndDateBadge endDateStr={c.end_date} status={c.status} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(c.start_date).toLocaleDateString('tr-TR')} – {new Date(c.end_date).toLocaleDateString('tr-TR')}</span>
                <span className="font-semibold text-gray-700">₺{Number(c.monthly_rent).toLocaleString('tr-TR')}/ay</span>
              </div>
            </div>
          ))}
          {!data?.length && <div className="text-center py-8 text-gray-400">Sözleşme bulunamadı</div>}
        </div>
      )}
    </div>
  );
}
