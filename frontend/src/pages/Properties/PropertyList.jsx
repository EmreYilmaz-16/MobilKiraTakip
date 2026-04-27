import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [siteName, setSiteName] = useState(searchParams.get('site_name') || '');
  const [type, setType] = useState(searchParams.get('type') || '');

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setStatus(searchParams.get('status') || '');
    setSiteName(searchParams.get('site_name') || '');
    setType(searchParams.get('type') || '');
  }, [searchParams]);

  useEffect(() => {
    const nextParams = {};
    if (search) nextParams.search = search;
    if (status) nextParams.status = status;
    if (siteName) nextParams.site_name = siteName;
    if (type) nextParams.type = type;
    setSearchParams(nextParams, { replace: true });
  }, [search, status, siteName, type, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['properties', search, status, siteName, type],
    queryFn: () => api.get('/properties', {
      params: {
        search: search || undefined,
        status: status || undefined,
        site_name: siteName || undefined,
        type: type || undefined,
        limit: 50
      }
    }).then((r) => r.data)
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mülkler</h1>
        <button onClick={() => navigate('/properties/new')} className="btn-primary py-2 px-3 text-sm">
          <Plus size={16} /> Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_160px_180px]">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Mülk ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          className="input"
          placeholder="Site filtrele..."
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
        />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tüm türler</option>
          <option value="residential">Konut</option>
          <option value="commercial">Ticari</option>
          <option value="parking">Otopark</option>
          <option value="other">Diğer</option>
        </select>
        <select className="input w-32" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tümü</option>
          <option value="available">Boş</option>
          <option value="rented">Kiralık</option>
          <option value="maintenance">Bakımda</option>
          <option value="for_sale">Satılık</option>
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
                  {(p.site_name || p.city_name || p.district_name || p.building_name) && (
                    <div className="text-xs text-gray-500">
                      {[p.site_name, p.city_name, p.district_name, p.building_name].filter(Boolean).join(' / ')}
                    </div>
                  )}
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
