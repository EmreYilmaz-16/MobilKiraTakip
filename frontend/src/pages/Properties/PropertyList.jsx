import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import api from '../../api/client';

const statusLabel = { available: 'Boş', rented: 'Kiralık', maintenance: 'Bakımda', for_sale: 'Satılık' };
const statusColor = {
  available: 'bg-green-100 text-green-700',
  rented: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  for_sale: 'bg-purple-100 text-purple-700'
};

export default function PropertyList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['properties', search, status],
    queryFn: () => api.get('/properties', { params: { search: search || undefined, status: status || undefined, limit: 50 } }).then((r) => r.data)
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mülkler</h1>
        <button onClick={() => navigate('/properties/new')} className="btn-primary py-2 px-3 text-sm">
          <Plus size={16} /> Ekle
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Mülk ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-32" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tümü</option>
          <option value="available">Boş</option>
          <option value="rented">Kiralık</option>
          <option value="maintenance">Bakımda</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="space-y-2">
          {data?.map((p) => (
            <div
              key={p.id}
              className="card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/properties/${p.id}/edit`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name}</div>
                  {p.building_name && <div className="text-xs text-gray-500">{p.building_name}</div>}
                  {p.tenant_name && (
                    <div className="text-xs text-primary-600 mt-0.5">{p.tenant_name}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`badge ${statusColor[p.status]}`}>{statusLabel[p.status]}</span>
                  {p.monthly_rent && (
                    <span className="text-xs font-medium text-gray-700">
                      ₺{Number(p.monthly_rent).toLocaleString('tr-TR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!data?.length && <div className="text-center py-8 text-gray-400">Mülk bulunamadı</div>}
        </div>
      )}
    </div>
  );
}
