import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Building2, Users, AlertTriangle, TrendingUp, Wrench, ChevronRight } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data)
  });

  if (isLoading) return <div className="flex items-center justify-center h-48 text-gray-400">Yükleniyor...</div>;

  const { properties, payments, expiring_contracts, open_maintenance } = data || {};

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Özet</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={18} className="text-primary-600" />
            <span className="text-xs text-gray-500">Mülkler</span>
          </div>
          <div className="text-2xl font-bold">{properties?.total ?? 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">{properties?.rented ?? 0} kiralık</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-600" />
            <span className="text-xs text-gray-500">Bu Ay Tahsilat</span>
          </div>
          <div className="text-2xl font-bold text-green-600">₺{fmt(payments?.collected_this_month)}</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-500" />
            <span className="text-xs text-gray-500">Gecikmiş</span>
          </div>
          <div className="text-2xl font-bold text-red-500">{payments?.overdue_count ?? 0}</div>
          <div className="text-xs text-gray-500 mt-0.5">₺{fmt(payments?.overdue_total)}</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={18} className="text-orange-500" />
            <span className="text-xs text-gray-500">Açık Bakım</span>
          </div>
          <div className="text-2xl font-bold text-orange-500">{open_maintenance ?? 0}</div>
        </div>
      </div>

      {/* Expiring contracts */}
      {expiring_contracts?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-amber-500" />
            Yaklaşan Sözleşme Bitişleri
          </h2>
          <div className="divide-y divide-gray-100">
            {expiring_contracts.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="py-2.5 flex items-center justify-between cursor-pointer"
                onClick={() => navigate('/contracts')}
              >
                <div>
                  <div className="text-sm font-medium">{c.property_name}</div>
                  <div className="text-xs text-gray-500">{c.tenant_name}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-amber-600 font-medium">
                    {new Date(c.end_date).toLocaleDateString('tr-TR')}
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
