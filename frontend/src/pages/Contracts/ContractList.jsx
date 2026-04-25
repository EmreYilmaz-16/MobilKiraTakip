import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, XCircle } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const [terminatingId, setTerminatingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ termination_type: 'terminated', deposit_returned: false, deposit_return_date: '', termination_notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.get('/contracts', { params: { limit: 50 } }).then((r) => r.data)
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, body }) => api.post(`/contracts/${id}/terminate`, body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowModal(false);
      setTerminatingId(null);
    }
  });

  function openTerminate(id) {
    setTerminatingId(id);
    setForm({ termination_type: 'terminated', deposit_returned: false, deposit_return_date: '', termination_notes: '' });
    setShowModal(true);
  }

  function handleTerminate() {
    terminateMutation.mutate({ id: terminatingId, body: form });
  }

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
              {c.status === 'active' && (
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => openTerminate(c.id)}
                    className="flex items-center gap-1 text-xs text-red-500 border border-red-200 rounded px-2 py-1 hover:bg-red-50"
                  >
                    <XCircle size={13} /> Sonlandır
                  </button>
                </div>
              )}
            </div>
          ))}
          {!data?.length && <div className="text-center py-8 text-gray-400">Sözleşme bulunamadı</div>}
        </div>
      )}

      {/* Sonlandırma Modalı */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-800">Sözleşmeyi Sonlandır</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Sonlandırma Türü</label>
                <select
                  className="input text-sm w-full"
                  value={form.termination_type}
                  onChange={(e) => setForm({ ...form, termination_type: e.target.value })}
                >
                  <option value="terminated">Fesih (erken)</option>
                  <option value="expired">Doğal Sona Erme</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dep_ret"
                  checked={form.deposit_returned}
                  onChange={(e) => setForm({ ...form, deposit_returned: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="dep_ret" className="text-sm text-gray-700">Depozito iade edildi</label>
              </div>

              {form.deposit_returned && (
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">İade Tarihi</label>
                  <input
                    type="date"
                    className="input text-sm w-full"
                    value={form.deposit_return_date}
                    onChange={(e) => setForm({ ...form, deposit_return_date: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Notlar</label>
                <textarea
                  className="input text-sm w-full"
                  rows={2}
                  placeholder="İsteğe bağlı açıklama..."
                  value={form.termination_notes}
                  onChange={(e) => setForm({ ...form, termination_notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600">
                İptal
              </button>
              <button
                onClick={handleTerminate}
                disabled={terminateMutation.isPending}
                className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
              >
                {terminateMutation.isPending ? 'İşleniyor...' : 'Sonlandır'}
              </button>
            </div>
            {terminateMutation.isError && (
              <p className="text-xs text-red-500 text-center">{terminateMutation.error?.response?.data?.message || 'Hata oluştu'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
