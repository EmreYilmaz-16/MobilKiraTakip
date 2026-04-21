const errorHandler = (err, req, res, _next) => {
  console.error(err);

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Bu kayıt zaten mevcut' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'İlişkili kayıt bulunamadı' });
  }

  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Sunucu hatası';
  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
