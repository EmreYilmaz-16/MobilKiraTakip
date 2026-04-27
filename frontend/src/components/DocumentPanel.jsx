import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import api from '../api/client';

const formatFileSize = (size) => {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentPanel({ entityType, entityId, title }) {
  const fileInputRef = useRef(null);
  const [localError, setLocalError] = useState('');
  const qc = useQueryClient();
  const maxUploadBytes = 25 * 1024 * 1024;

  const queryKey = ['documents', entityType, entityId];

  const { data: documents = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get('/documents', { params: { entity_type: entityType, entity_id: entityId } }).then((r) => r.data),
    enabled: Boolean(entityId)
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setLocalError('');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId);
      return api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
    },
    onSuccess: () => {
      setLocalError('');
      qc.invalidateQueries({ queryKey });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId) => api.delete(`/documents/${documentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey })
  });

  const handleDownload = async (documentId, originalName) => {
    const blob = await api.get(`/documents/${documentId}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!entityId) {
    return (
      <div className="card space-y-2">
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <Paperclip size={16} />
          <span>{title}</span>
        </div>
        <div className="text-sm text-gray-500">Belge yüklemek için önce kaydı oluşturun.</div>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <Paperclip size={16} />
          <span>{title}</span>
        </div>
        <label className="btn-secondary py-2 px-3 text-sm cursor-pointer">
          <Upload size={14} /> Belge Ekle
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (!file) return;

              if (file.size > maxUploadBytes) {
                setLocalError('Secilen dosya 25 MB sinirini asiyor. Telefonda daha dusuk boyutlu fotograf secin veya sikistirin.');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
              }

              uploadMutation.mutate(file);
            }}
          />
        </label>
      </div>

      {(localError || uploadMutation.error) && (
        <div className="text-sm text-red-600">{localError || uploadMutation.error.message}</div>
      )}

      <div className="text-xs text-gray-500">Telefon fotografi ve diger belgeler icin maksimum dosya boyutu 25 MB.</div>

      {isLoading ? (
        <div className="text-sm text-gray-400">Belgeler yükleniyor...</div>
      ) : documents.length === 0 ? (
        <div className="text-sm text-gray-500">Henüz belge eklenmemiş.</div>
      ) : (
        <div className="space-y-2">
          {documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800 truncate">
                  <FileText size={14} className="shrink-0 text-gray-400" />
                  <span className="truncate">{document.original_name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatFileSize(document.file_size)}
                  {document.created_at ? ` • ${new Date(document.created_at).toLocaleDateString('tr-TR')}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(document.id, document.original_name)}
                  className="text-sm text-primary-600 flex items-center gap-1"
                >
                  <Download size={14} /> İndir
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(document.id)}
                  className="text-sm text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={14} /> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}