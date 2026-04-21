const { query } = require('../config/database');

const list = async (req, res, next) => {
  try {
    const { property_id, category, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let i = 1;

    if (property_id) { conditions.push(`e.property_id = $${i++}`); params.push(property_id); }
    if (category)    { conditions.push(`e.category = $${i++}`); params.push(category); }
    if (from_date)   { conditions.push(`e.date >= $${i++}`); params.push(from_date); }
    if (to_date)     { conditions.push(`e.date <= $${i++}`); params.push(to_date); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await query(`SELECT COUNT(*) FROM expenses e ${where}`, params);
    const { rows } = await query(
      `SELECT e.*, p.name AS property_name
       FROM expenses e
       LEFT JOIN properties p ON p.id = e.property_id
       ${where}
       ORDER BY e.date DESC
       LIMIT $${i++} OFFSET $${i++}`,
      [...params, Number(limit), Number(offset)]
    );

    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countRes.rows[0].count), page: Number(page), limit: Number(limit) }
    });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { property_id, category, amount, date, vendor, description, receipt_url } = req.body;
    const { rows } = await query(
      `INSERT INTO expenses (property_id, category, amount, date, vendor, description, receipt_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [property_id || null, category, amount, date, vendor || null, description || null, receipt_url || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { property_id, category, amount, date, vendor, description, receipt_url } = req.body;
    const { rows } = await query(
      `UPDATE expenses SET
        property_id = COALESCE($1, property_id),
        category = COALESCE($2, category),
        amount = COALESCE($3, amount),
        date = COALESCE($4, date),
        vendor = COALESCE($5, vendor),
        description = COALESCE($6, description),
        receipt_url = COALESCE($7, receipt_url)
       WHERE id = $8 RETURNING *`,
      [property_id, category, amount, date, vendor, description, receipt_url, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Gider bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM expenses WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Gider bulunamadı' });
    res.json({ success: true, message: 'Gider silindi' });
  } catch (err) { next(err); }
};

module.exports = { list, create, update, remove };
