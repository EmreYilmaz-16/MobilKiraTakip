import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import { ArrowLeft } from 'lucide-react';

export default function TenantForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const isEdit = Boolean(id);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => api.get(`/tenants/${id}`).then((r) => r.data),
    enabled: isEdit
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (tenant) reset(tenant);
  }, [tenant, reset]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/tenants/${id}`, data) : api.post('/tenants', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      navigate('/tenants');
    }
  });

  if (isEdit && isLoading) return <div className="py-8 text-center text-gray-400">Yükleniyor...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary py-2 px-3">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-bold">{isEdit ? 'Kiracı Düzenle' : 'Yeni Kiracı'}</h1>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ad *</label>
            <input className="input" {...register('first_name', { required: true })} />
            {errors.first_name && <span className="text-red-500 text-xs">Zorunlu</span>}
          </div>
          <div>
            <label className="label">Soyad *</label>
            <input className="input" {...register('last_name', { required: true })} />
            {errors.last_name && <span className="text-red-500 text-xs">Zorunlu</span>}
          </div>
        </div>

        <div>
          <label className="label">Telefon *</label>
          <input className="input" type="tel" {...register('phone', { required: true })} placeholder="05XX XXX XXXX" />
          {errors.phone && <span className="text-red-500 text-xs">Zorunlu</span>}
        </div>

        <div>
          <label className="label">E-posta</label>
          <input className="input" type="email" {...register('email')} />
        </div>

        <div>
          <label className="label">TC Kimlik No</label>
          <input className="input" {...register('tc_no')} maxLength={11} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Acil İletişim Adı</label>
            <input className="input" {...register('emergency_contact')} />
          </div>
          <div>
            <label className="label">Acil Telefon</label>
            <input className="input" type="tel" {...register('emergency_phone')} />
          </div>
        </div>

        <div>
          <label className="label">Findeks Puanı</label>
          <input className="input" type="number" {...register('findeks_score')} min={0} max={1900} />
        </div>

        <div>
          <label className="label">Notlar</label>
          <textarea className="input" rows={3} {...register('notes')} />
        </div>

        {mutation.error && <div className="text-red-600 text-sm">{mutation.error.message}</div>}

        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full py-3">
          {mutation.isPending ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Ekle'}
        </button>
      </form>
    </div>
  );
}
