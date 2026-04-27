import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  Building2, AlertTriangle, TrendingUp, Wrench, ChevronRight,
  Clock, CheckCircle2, Phone, CalendarClock, FileText
} from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');

const dayDiff = (dateStr) => {
  const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
  return diff;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const goToPropertyFilter = (params) => {
    const query = new URLSearchParams(params).toString();
    navigate(`/properties${query ? `?${query}` : ''}`);
  };
  const badgeClassName = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-95';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then((r) => r.data),
    refetchInterval: 60000
  });

  if (isLoading) return <div className="flex items-center justify-center h-48 text-gray-400">Yükleniyor...</div>;

  const { properties, payments, contracts, expiring_contracts, overdue_payments, recent_payments, open_maintenance } = data || {};

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Özet</h1>

      {/* Ana istatistikler */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card cursor-pointer active:bg-gray-50" onClick={() => navigate('/properties')}>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={16} className="text-primary-600" />
            <span className="text-xs text-gray-500">Mülkler</span>
          </div>
          <div className="text-2xl font-bold">{properties?.total ?? 0}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ type: 'residential' }); }} className={`${badgeClassName} justify-start bg-slate-100 text-slate-700`}>
              {properties?.residential ?? 0} konut
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ type: 'commercial' }); }} className={`${badgeClassName} justify-start bg-slate-100 text-slate-700`}>
              {properties?.commercial ?? 0} ticari
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ type: 'parking' }); }} className={`${badgeClassName} justify-start bg-slate-50 text-slate-600`}>
              {properties?.parking ?? 0} otopark
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); goToPropertyFilter({ type: 'other' }); }} className={`${badgeClassName} justify-start bg-slate-50 text-slate-600`}>
              {properties?.other ?? 0} diğer
            </button>
          </div>
        </div>

        <div className="card cursor-pointer active:bg-gray-50" onClick={() => navigate('/contracts')}>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-indigo-600" />
            <span className="text-xs text-gray-500">Aktif Sözleşme</span>
          </div>
          <div className="text-2xl font-bold">{contracts?.active ?? 0}</div>
          {contracts?.expiring_soon > 0 && (
            <div className="text-xs text-amber-600 mt-1">{contracts.expiring_soon} bitiş yakın</div>
          )}
        </div>

        <div className="card cursor-pointer active:bg-gray-50" onClick={() => navigate('/payments')}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-600" />
            <span className="text-xs text-gray-500">Bu Ay Tahsilat</span>
          </div>
          <div className="text-xl font-bold text-green-600">₺{fmt(payments?.collected_this_month)}</div>
          {Number(payments?.pending_this_month) > 0 && (
            <div className="text-xs text-yellow-600 mt-1">₺{fmt(payments?.pending_this_month)} bekliyor</div>
          )}
        </div>

        <div className="card cursor-pointer active:bg-gray-50" onClick={() => navigate('/payments')}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-xs text-gray-500">Gecikmiş</span>
          </div>
          <div className="text-2xl font-bold text-red-500">{payments?.overdue_count ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">₺{fmt(payments?.overdue_total)}</div>
        </div>
      </div>

      {/* Gecikmiş ödemeler listesi */}
      {overdue_payments?.length > 0 && (
        <div className="card border-l-4 border-red-400">
          <h2 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={15} />
            Gecikmiş Ödemeler ({overdue_payments.length})
          </h2>
          <div className="divide-y divide-gray-100">
            {overdue_payments.map((p) => {
              const days = Math.abs(dayDiff(p.due_date));
              return (
                <div key={p.id} className="py-2.5 flex items-center justify-between" onClick={() => navigate('/payments')}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.property_name}</div>
                    <div className="text-xs text-gray-500">{p.tenant_name}</div>
                    {p.phone && (
                      <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-500 flex items-center gap-0.5 w-fit mt-0.5">
                        <Phone size={10} /> {p.phone}
                      </a>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-bold text-red-600">₺{fmt(p.amount)}</div>
                    <div className="text-xs text-red-400">{days} gün geç</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => navigate('/payments')}
            className="mt-2 w-full text-xs text-center text-red-600 py-1.5 border border-red-200 rounded-lg">
            Tüm ödemelere git →
          </button>
        </div>
      )}

      {/* Yaklaşan sözleşme bitişleri */}
      {expiring_contracts?.length > 0 && (
        <div className="card border-l-4 border-amber-400">
          <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
            <CalendarClock size={15} />
            Yaklaşan Sözleşme Bitişleri
          </h2>
          <div className="divide-y divide-gray-100">
            {expiring_contracts.map((c) => {
              const days = dayDiff(c.end_date);
              return (
                <div key={c.id} className="py-2.5 flex items-center justify-between cursor-pointer"
                  onClick={() => navigate('/contracts')}>
                  <div>
                    <div className="text-sm font-medium">{c.property_name}</div>
                    <div className="text-xs text-gray-500">{c.tenant_name}</div>
                    <div className="text-xs text-gray-400">₺{fmt(c.monthly_rent)}/ay</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-right">
                      <div className="text-xs text-amber-600 font-medium">
                        {new Date(c.end_date).toLocaleDateString('tr-TR')}
                      </div>
                      <div className="text-xs text-amber-500">{days} gün kaldı</div>
                    </div>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Son tahsilatlar */}
      {recent_payments?.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-green-500" />
            Son Tahsilatlar
          </h2>
          <div className="divide-y divide-gray-100">
            {recent_payments.map((p) => (
              <div key={p.id} className="py-2 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.property_name}</div>
                  <div className="text-xs text-gray-500">{p.tenant_name}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-sm font-bold text-green-600">₺{fmt(p.amount)}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(p.payment_date).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alt bilgiler */}
      <div className="flex gap-3">
        {open_maintenance > 0 && (
          <div className="card flex-1 cursor-pointer" onClick={() => navigate('/maintenance')}>
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-orange-500" />
              <div>
                <div className="text-lg font-bold text-orange-500">{open_maintenance}</div>
                <div className="text-xs text-gray-500">Açık Bakım</div>
              </div>
            </div>
          </div>
        )}
        <div className="card flex-1 cursor-pointer" onClick={() => navigate('/payments')}>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-yellow-500" />
            <div>
              <div className="text-lg font-bold text-yellow-600">{Number(payments?.pending_this_month) > 0 ? `₺${fmt(payments.pending_this_month)}` : '—'}</div>
              <div className="text-xs text-gray-500">Bu Ay Bekleyen</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

