const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { query } = require('../config/database');

const uploadDir = path.resolve(__dirname, '../../uploads/documents');
fs.mkdirSync(uploadDir, { recursive: true });

const entityTableMap = {
  property: 'properties',
  tenant: 'tenants',
  contract: 'contracts'
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

const ensureEntityExists = async (entityType, entityId) => {
  const tableName = entityTableMap[entityType];

  if (!tableName) {
    const err = new Error('Geçersiz belge türü');
    err.status = 400;
    throw err;
  }

  const { rows } = await query(`SELECT id FROM ${tableName} WHERE id = $1`, [entityId]);
  if (!rows.length) {
    const err = new Error('İlişkili kayıt bulunamadı');
    err.status = 404;
    throw err;
  }
};

const list = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.query;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ success: false, message: 'entity_type ve entity_id gerekli' });
    }

    await ensureEntityExists(entity_type, entity_id);

    const { rows } = await query(
      `SELECT id, entity_type, entity_id, original_name, mime_type, file_size, created_at
       FROM documents
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entity_type, entity_id]
    );

    res.json({
      success: true,
      data: rows.map((row) => ({
        ...row,
        download_url: `/api/v1/documents/${row.id}/download`
      }))
    });
  } catch (err) {
    next(err);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.body;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ success: false, message: 'entity_type ve entity_id gerekli' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Dosya seçilmedi' });
    }

    await ensureEntityExists(entity_type, entity_id);

    const { rows } = await query(
      `INSERT INTO documents (entity_type, entity_id, file_name, original_name, mime_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, entity_type, entity_id, original_name, mime_type, file_size, created_at`,
      [
        entity_type,
        entity_id,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype || null,
        req.file.size || 0,
        req.user?.id || null
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        ...rows[0],
        download_url: `/api/v1/documents/${rows[0].id}/download`
      }
    });
  } catch (err) {
    if (req.file?.path) {
      fs.rmSync(req.file.path, { force: true });
    }
    next(err);
  }
};

const download = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı' });
    }

    const document = rows[0];
    const filePath = path.join(uploadDir, document.file_name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
    }

    res.download(filePath, document.original_name);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı' });
    }

    const filePath = path.join(uploadDir, rows[0].file_name);
    fs.rmSync(filePath, { force: true });

    res.json({ success: true, message: 'Belge silindi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, uploadDocument, download, remove, upload };const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

const entityConfig = {
  property: 'properties',
  tenant: 'tenants',
  contract: 'contracts'
};

const ensureEntityExists = async (entityType, entityId) => {
  const tableName = entityConfig[entityType];

  if (!tableName) {
    const error = new Error('Geçersiz belge türü');
    error.status = 400;
    throw error;
  }

  const { rows } = await query(`SELECT id FROM ${tableName} WHERE id = $1`, [entityId]);
  if (!rows.length) {
    const error = new Error('İlişkili kayıt bulunamadı');
    error.status = 404;
    throw error;
  }
};

const list = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.query;
    if (!entity_type || !entity_id) {
      return res.status(400).json({ success: false, message: 'entity_type ve entity_id gerekli' });
    }

    await ensureEntityExists(entity_type, entity_id);

    const { rows } = await query(
      `SELECT id, entity_type, entity_id, original_name, mime_type, file_size, created_at
       FROM documents
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entity_type, entity_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.body;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ success: false, message: 'entity_type ve entity_id gerekli' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Dosya gerekli' });
    }

    await ensureEntityExists(entity_type, entity_id);

    const storagePath = path.join('uploads', 'documents', req.file.filename);
    const { rows } = await query(
      `INSERT INTO documents (entity_type, entity_id, original_name, stored_name, mime_type, file_size, storage_path, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, entity_type, entity_id, original_name, mime_type, file_size, created_at`,
      [
        entity_type,
        entity_id,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        storagePath,
        req.user?.id || null
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const download = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı' });
    }

    const document = rows[0];
    const absolutePath = path.resolve(process.cwd(), document.storage_path);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'Belge dosyası bulunamadı' });
    }

    res.download(absolutePath, document.original_name);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Belge bulunamadı' });
    }

    const absolutePath = path.resolve(process.cwd(), rows[0].storage_path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    res.json({ success: true, message: 'Belge silindi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, download, remove };