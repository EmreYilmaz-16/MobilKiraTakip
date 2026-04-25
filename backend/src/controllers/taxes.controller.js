const { query } = require('../config/database');

const list = async (req, res, next) => {
  try {
    const { property_id, tax_type, year, status } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;
    if (property_id) { conditions.push(`td.property_id = $${i++}`); params.push(property_id); }
    if (tax_type)    { conditions.push(`td.tax_type = $${i++}`);    params.push(tax_type); }
    if (year)        { conditions.push(`td.year = $${i++}`);        params.push(Number(year)); }
    if (status)      { conditions.push(`td.status = $${i++}`);      params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT td.*, p.name AS property_name
       FROM tax_declarations td
       LEFT JOIN properties p ON p.id = td.property_id
       ${where}
       ORDER BY td.due_date ASC NULLS LAST, td.year DESC, td.month ASC NULLS LAST`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { property_id, tax_type, year, month, amount,
            due_date, paid_date, status, reference_no, notes } = req.body;
    const { rows } = await query(
      `INSERT INTO tax_declarations
         (property_id, tax_type, year, month, amount, due_date, paid_date, status, reference_no, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [property_id || null, tax_type, year,
       month || null, amount || null,
       due_date || null, paid_date || null,
       status || 'bekliyor', reference_no || null, notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { property_id, tax_type, year, month, amount,
            due_date, paid_date, status, reference_no, notes } = req.body;
    const { rows } = await query(
      `UPDATE tax_declarations SET
        property_id  = COALESCE($1,  property_id),
        tax_type     = COALESCE($2,  tax_type),
        year         = COALESCE($3,  year),
        month        = COALESCE($4,  month),
        amount       = COALESCE($5,  amount),
        due_date     = COALESCE($6,  due_date),
        paid_date    = COALESCE($7,  paid_date),
        status       = COALESCE($8,  status),
        reference_no = COALESCE($9,  reference_no),
        notes        = COALESCE($10, notes)
       WHERE id = $11 RETURNING *`,
      [property_id, tax_type, year, month, amount,
       due_date, paid_date, status, reference_no, notes, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Vergi kaydı bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM tax_declarations WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Vergi kaydı bulunamadı' });
    res.json({ success: true, message: 'Vergi kaydı silindi' });
  } catch (err) { next(err); }
};

module.exports = { list, create, update, remove };
