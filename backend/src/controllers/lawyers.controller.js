const { query } = require('../config/database');

// ─── AVUKAT CRUD ─────────────────────────────────────────────
const listLawyers = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM lawyers ORDER BY name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const getLawyer = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM lawyers WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Avukat bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const createLawyer = async (req, res, next) => {
  try {
    const { name, phone, email, specialty, bar_no, firm, hourly_rate, notes } = req.body;
    const { rows } = await query(
      `INSERT INTO lawyers (name, phone, email, specialty, bar_no, firm, hourly_rate, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, phone || null, email || null, specialty || null,
       bar_no || null, firm || null, hourly_rate || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const updateLawyer = async (req, res, next) => {
  try {
    const { name, phone, email, specialty, bar_no, firm, hourly_rate, notes, is_active } = req.body;
    const { rows } = await query(
      `UPDATE lawyers SET
        name        = COALESCE($1, name),
        phone       = COALESCE($2, phone),
        email       = COALESCE($3, email),
        specialty   = COALESCE($4, specialty),
        bar_no      = COALESCE($5, bar_no),
        firm        = COALESCE($6, firm),
        hourly_rate = COALESCE($7, hourly_rate),
        notes       = COALESCE($8, notes),
        is_active   = COALESCE($9, is_active)
       WHERE id = $10 RETURNING *`,
      [name, phone, email, specialty, bar_no, firm, hourly_rate, notes, is_active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Avukat bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const removeLawyer = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM lawyers WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Avukat bulunamadı' });
    res.json({ success: true, message: 'Avukat silindi' });
  } catch (err) { next(err); }
};

// ─── DAVA CRUD ────────────────────────────────────────────────
const listCases = async (req, res, next) => {
  try {
    const { lawyer_id, property_id, status } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;
    if (lawyer_id)   { conditions.push(`lc.lawyer_id = $${i++}`);   params.push(lawyer_id); }
    if (property_id) { conditions.push(`lc.property_id = $${i++}`); params.push(property_id); }
    if (status)      { conditions.push(`lc.status = $${i++}`);      params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT lc.*,
              l.name AS lawyer_name,
              p.name AS property_name,
              t.first_name || ' ' || t.last_name AS tenant_name
       FROM legal_cases lc
       LEFT JOIN lawyers    l ON l.id = lc.lawyer_id
       LEFT JOIN properties p ON p.id = lc.property_id
       LEFT JOIN tenants    t ON t.id = lc.tenant_id
       ${where}
       ORDER BY lc.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const createCase = async (req, res, next) => {
  try {
    const { lawyer_id, property_id, tenant_id, case_type, title,
            court, case_no, status, filing_date, next_hearing, fee, description } = req.body;
    const { rows } = await query(
      `INSERT INTO legal_cases
         (lawyer_id, property_id, tenant_id, case_type, title,
          court, case_no, status, filing_date, next_hearing, fee, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [lawyer_id || null, property_id || null, tenant_id || null,
       case_type, title, court || null, case_no || null,
       status || 'devam_ediyor', filing_date || null, next_hearing || null,
       fee || 0, description || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const updateCase = async (req, res, next) => {
  try {
    const { lawyer_id, property_id, tenant_id, case_type, title,
            court, case_no, status, filing_date, next_hearing, fee, description, result } = req.body;
    const { rows } = await query(
      `UPDATE legal_cases SET
        lawyer_id    = COALESCE($1,  lawyer_id),
        property_id  = COALESCE($2,  property_id),
        tenant_id    = COALESCE($3,  tenant_id),
        case_type    = COALESCE($4,  case_type),
        title        = COALESCE($5,  title),
        court        = COALESCE($6,  court),
        case_no      = COALESCE($7,  case_no),
        status       = COALESCE($8,  status),
        filing_date  = COALESCE($9,  filing_date),
        next_hearing = COALESCE($10, next_hearing),
        fee          = COALESCE($11, fee),
        description  = COALESCE($12, description),
        result       = COALESCE($13, result)
       WHERE id = $14 RETURNING *`,
      [lawyer_id, property_id, tenant_id, case_type, title,
       court, case_no, status, filing_date, next_hearing, fee, description, result,
       req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Dava bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const removeCase = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM legal_cases WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Dava bulunamadı' });
    res.json({ success: true, message: 'Dava silindi' });
  } catch (err) { next(err); }
};

module.exports = {
  listLawyers, getLawyer, createLawyer, updateLawyer, removeLawyer,
  listCases, createCase, updateCase, removeCase
};
