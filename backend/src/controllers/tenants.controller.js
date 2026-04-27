const { query } = require('../config/database');

const list = async (req, res, next) => {
  try {
    const { search, is_active, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let i = 1;

    if (is_active !== undefined) { conditions.push(`is_active = $${i++}`); params.push(is_active === 'true'); }
    if (search) {
      conditions.push(`(first_name ILIKE $${i} OR last_name ILIKE $${i} OR phone ILIKE $${i} OR email ILIKE $${i})`);
      params.push(`%${search}%`); i++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await query(`SELECT COUNT(*) FROM tenants ${where}`, params);
    const { rows } = await query(
      `SELECT tenants.*,
              (
                SELECT COUNT(*)
                FROM contracts c
                WHERE c.tenant_id = tenants.id AND c.status = 'active'
              )::int AS active_contract_count
       FROM tenants ${where}
       ORDER BY last_name, first_name LIMIT $${i++} OFFSET $${i++}`,
      [...params, Number(limit), Number(offset)]
    );

    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countRes.rows[0].count), page: Number(page), limit: Number(limit) }
    });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Kiracı bulunamadı' });

    const { rows: contracts } = await query(
      `SELECT c.*, p.name AS property_name FROM contracts c
       JOIN properties p ON p.id = c.property_id
       WHERE c.tenant_id = $1 ORDER BY c.start_date DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], contracts } });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { first_name, last_name, tc_no, phone, email,
            emergency_contact, emergency_phone, findeks_score, notes } = req.body;
    const { rows } = await query(
      `INSERT INTO tenants (first_name, last_name, tc_no, phone, email,
        emergency_contact, emergency_phone, findeks_score, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [first_name, last_name, tc_no || null, phone, email || null,
       emergency_contact || null, emergency_phone || null,
       findeks_score || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { first_name, last_name, tc_no, phone, email,
            emergency_contact, emergency_phone, findeks_score, notes, is_active } = req.body;
    const { rows } = await query(
      `UPDATE tenants SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        tc_no = COALESCE($3, tc_no),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        emergency_contact = COALESCE($6, emergency_contact),
        emergency_phone = COALESCE($7, emergency_phone),
        findeks_score = COALESCE($8, findeks_score),
        notes = COALESCE($9, notes),
        is_active = COALESCE($10, is_active)
       WHERE id = $11 RETURNING *`,
      [first_name, last_name, tc_no, phone, email,
       emergency_contact, emergency_phone, findeks_score, notes, is_active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Kiracı bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM tenants WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Kiracı bulunamadı' });
    res.json({ success: true, message: 'Kiracı silindi' });
  } catch (err) { next(err); }
};

module.exports = { list, get, create, update, remove };
