import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  Building2, AlertTriangle, TrendingUp, Wrench, FileText
} from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

const monthName = new Date().toLocaleDateString('tr-TR', { month: 'long' });

const propertyTypeConfig = [
  { key: 'residential', label: 'Konut', color: '#1f2937' },
  { key: 'commercial', label: 'Ticari', color: '#0f766e' },
  { key: 'parking', label: 'Otopark', color: '#d97706' },
  { key: 'other', label: 'Diğer', color: '#7c3aed' }
];

const propertyStatusConfig = [
  { key: 'rented', label: 'Kiralık', color: '#16a34a' },
  { key: 'available', label: 'Boş', color: '#2563eb' },
  { key: 'for_sale', label: 'Satılık', color: '#9333ea' },
  { key: 'maintenance', label: 'Bakımda', color: '#ea580c' }
];

const buildPieSegments = (data, config) => {
  const total = config.reduce((sum, item) => sum + Number(data?.[item.key] ?? 0), 0);

  if (!total) {
    return [];
  }

  let cumulative = 0;
  return config.map((item) => {
    const value = Number(data?.[item.key] ?? 0);
    const fraction = value / total;
    const start = cumulative;
    cumulative += fraction;

    return {
      ...item,
      value,
      dashArray: `${fraction * 100} ${100 - fraction * 100}`,
      dashOffset: -start * 100
    };
  }).filter((item) => item.value > 0);
};

export default function Dashboard() {
  const navigate = useNavigate();
  const goToPaymentFilter = (params) => {
    const query = new URLSearchParams(params).toString();
    navigate(`/payments${query ? `?${query}` : ''}`);
  };
  const goToPropertyFilter = (params) => {
    const query = new URLSearchParams(params).toString();
    navigate(`/properties${query ? `?${query}` : ''}`);
  };
  const goToContractFilter = (params) => {
    const query = new URLSearchParams(params).toString();
    navigate(`/contracts${query ? `?${query}` : ''}`);
  };
  const badgeClassName = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-95';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data),
    refetchInterval: 60000
  });

  if (isLoading) return <div className="flex items-center justify-center h-48 text-gray-400">Yükleniyor...</div>;

  const { properties, payments, contracts, open_maintenance } = data || {};
  const pieSegments = buildPieSegments(properties, propertyStatusConfig);

  return (
    <div className="space-y-3">
      {/* Ana istatistikler */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card cursor-pointer active:bg-gray-50 space-y-2" onClick={() => navigate('/properties')}>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-primary-600" />
            <span className="text-xs text-gray-500">Mülkler</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ status: 'rented' }); }} className={`${badgeClassName} justify-start bg-green-100 text-green-700`}>
              {properties?.rented ?? 0} kiralık
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ status: 'available' }); }} className={`${badgeClassName} justify-start bg-blue-100 text-blue-700`}>
              {properties?.available ?? 0} boş
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ status: 'for_sale' }); }} className={`${badgeClassName} justify-start bg-purple-100 text-purple-700`}>
              {properties?.for_sale ?? 0} satılık
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ status: 'maintenance' }); }} className={`${badgeClassName} justify-start bg-orange-100 text-orange-700`}>
              {properties?.maintenance ?? 0} bakımda
            </button>
          </div>
        </div>

        <div className="card cursor-pointer active:bg-gray-50 space-y-2" onClick={() => navigate('/contracts')}>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-indigo-600" />
            <span className="text-xs text-gray-500">Sözleşmeler</span>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); goToContractFilter({ expiry_filter: 'expired' }); }} className={`${badgeClassName} justify-start bg-red-100 text-red-700`}>
              {contracts?.expired ?? 0} bitenler
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToContractFilter({ status: 'active' }); }} className={`${badgeClassName} justify-start bg-green-100 text-green-700`}>
              {contracts?.active ?? 0} aktif
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToContractFilter({ expiry_filter: 'expiring_3_months' }); }} className={`${badgeClassName} justify-start bg-yellow-100 text-yellow-700`}>
              {contracts?.expiring_3_months ?? 0} yaklaşan
            </button>
          </div>
        </div>

        <div className="card col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-green-600" />
            <span className="text-sm font-semibold text-gray-800">Güncel Ay Tahsilat Durumu</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/payments')}
            className="w-full flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-left active:brightness-95"
          >
            <span className="text-sm text-blue-700">Bu Ay Tahakkuk</span>
            <span className="text-base font-semibold text-blue-700">₺{fmt(payments?.due_this_month)}</span>
          </button>

          <button
            type="button"
            onClick={() => goToPaymentFilter({ status: 'paid' })}
            className="w-full flex items-center justify-between rounded-xl bg-green-50 px-3 py-2 text-left active:brightness-95"
          >
            <span className="text-sm text-green-700">Tahsil Edilen</span>
            <span className="text-base font-semibold text-green-700">₺{fmt(payments?.collected_this_month)}</span>
          </button>

          <button
            type="button"
            onClick={() => goToPaymentFilter({ overdue: 'true' })}
            className="w-full flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-left active:brightness-95"
          >
            <span className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle size={15} className="text-red-500" />
              Gecikmiş
            </span>
            <span className="text-base font-semibold text-red-700">₺{fmt(payments?.overdue_total)}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-800">Mülk Durumları</div>
            <div className="text-xs text-gray-500 mt-1">Durum dağılımı</div>
          </div>
          <div className="relative h-28 w-28 shrink-0">
            {pieSegments.length > 0 ? (
              <svg viewBox="0 0 42 42" className="h-28 w-28 -rotate-90">
                <circle cx="21" cy="21" r="15.915" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                {pieSegments.map((segment) => (
                  <circle
                    key={segment.key}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="6"
                    strokeDasharray={segment.dashArray}
                    strokeDashoffset={segment.dashOffset}
                  />
                ))}
              </svg>
            ) : (
              <div className="h-28 w-28 rounded-full border-8 border-gray-200 flex items-center justify-center text-xs text-gray-400">
                Veri yok
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          {propertyStatusConfig.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => goToPropertyFilter({ status: item.key })}
              className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-left active:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="text-sm font-semibold text-gray-900">{properties?.[item.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {open_maintenance > 0 && (
        <button
          type="button"
          onClick={() => navigate('/maintenance')}
          className="card w-full flex items-center justify-between text-left active:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-orange-500" />
            <span className="text-sm text-gray-700">Açık Bakım</span>
          </div>
          <span className="text-sm font-semibold text-orange-600">{open_maintenance}</span>
        </button>
      )}
    </div>
  );
}

