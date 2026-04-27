import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  Building2, AlertTriangle, TrendingUp, Wrench, FileText
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

const buildPieData = (data, config) => config
  .map((item) => ({
    ...item,
    value: Number(data?.[item.key] ?? 0)
  }))
  .filter((item) => item.value > 0);

function PropertyStatusTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
      <div className="text-xs font-medium text-slate-500">Mülk Durumu</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
        {item.label}
      </div>
      <div className="mt-1 text-xs text-slate-600">{fmt(item.value)} adet</div>
    </div>
  );
}

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
  const pieData = buildPieData(properties, propertyStatusConfig);
  const totalProperties = propertyStatusConfig.reduce((sum, item) => sum + Number(properties?.[item.key] ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Ana istatistikler */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card cursor-pointer active:bg-gray-50 space-y-2" onClick={() => navigate('/properties')}>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-primary-600" />
            <span className="text-sm font-semibold text-gray-800">Mülkler</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ status: 'rented' }); }} className={`${badgeClassName} justify-start bg-green-100 text-green-700`}>
              {properties?.rented ?? 0} Kiralık
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ status: 'available' }); }} className={`${badgeClassName} justify-start bg-blue-100 text-blue-700`}>
              {properties?.available ?? 0} Boş
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ status: 'for_sale' }); }} className={`${badgeClassName} justify-start bg-purple-100 text-purple-700`}>
              {properties?.for_sale ?? 0} Satılık
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ status: 'maintenance' }); }} className={`${badgeClassName} justify-start bg-orange-100 text-orange-700`}>
              {properties?.maintenance ?? 0} Bakımda
            </button>
          </div>
        </div>

        <div className="card cursor-pointer active:bg-gray-50 space-y-2" onClick={() => navigate('/contracts')}>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-indigo-600" />
            <span className="text-sm font-semibold text-gray-800">Sözleşmeler</span>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-2">
            <button type="button" onClick={(e) => { e.stopPropagation(); goToContractFilter({ expiry_filter: 'expired' }); }} className={`${badgeClassName} justify-start bg-red-100 text-red-700`}>
              {contracts?.expired ?? 0} Bitenler
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToContractFilter({ status: 'active' }); }} className={`${badgeClassName} justify-start bg-green-100 text-green-700`}>
              {contracts?.active ?? 0} Aktif
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToContractFilter({ expiry_filter: 'expiring_3_months' }); }} className={`${badgeClassName} justify-start bg-yellow-100 text-yellow-700`}>
              {contracts?.expiring_3_months ?? 0} Yaklaşan
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

      <div className="card overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-800">Mülk Durumları</div>
            <div className="text-xs text-slate-500 mt-1">Portföy dağılımı</div>
          </div>
          <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            Toplam {fmt(totalProperties)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
          <div className="grid grid-cols-2 gap-2">
            {propertyStatusConfig.map((item) => {
              const value = Number(properties?.[item.key] ?? 0);
              const share = totalProperties > 0 ? Math.round((value / totalProperties) * 100) : 0;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => goToPropertyFilter({ status: item.key })}
                  className="rounded-2xl border border-white/70 bg-white/80 px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">%{share}</span>
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{fmt(value)}</div>
                </button>
              );
            })}
          </div>

          <div className="relative mx-auto h-52 w-52 sm:h-56 sm:w-56">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="8" stdDeviation="10" floodOpacity="0.14" />
                      </filter>
                    </defs>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={42}
                      paddingAngle={3}
                      cornerRadius={6}
                      stroke="none"
                      filter="url(#pieShadow)"
                    >
                      {pieData.map((segment) => (
                        <Cell key={segment.key} fill={segment.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PropertyStatusTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-white/90 px-5 py-4 text-center shadow-sm ring-1 ring-slate-200 backdrop-blur-sm">
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">Toplam</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900">{fmt(totalProperties)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/70 text-xs text-slate-400">
                Veri yok
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {propertyStatusConfig.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => goToPropertyFilter({ status: item.key })}
              className="flex items-center justify-between rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-left active:bg-white"
            >
              <span className="flex items-center gap-2 text-xs text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
              <span className="text-sm font-semibold text-slate-900">{properties?.[item.key] ?? 0}</span>
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

