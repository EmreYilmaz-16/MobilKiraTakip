import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../../api/client';

const statusLabel = { active: 'Aktif', expired: 'Bitti', terminated: 'Feshedildi' };
const statusColor = { active: 'bg-green-100 text-green-700', expired: 'bg-gray-100 text-gray-500', terminated: 'bg-red-100 text-red-600' };

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
            <div key={c.id} className="card space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm">{c.property_name}</div>
                  <div className="text-xs text-gray-600">{c.tenant_name}</div>
                </div>
                <span className={`badge ${statusColor[c.status]}`}>{statusLabel[c.status]}</span>
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
