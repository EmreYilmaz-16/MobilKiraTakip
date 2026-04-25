const { query } = require('../config/database');

const list = async (req, res, next) => {
  try {
    const { property_id, price_type } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;
    if (property_id) { conditions.push(`mp.property_id = $${i++}`); params.push(property_id); }
    if (price_type)  { conditions.push(`mp.price_type = $${i++}`);  params.push(price_type); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT mp.*,
              p.name AS property_name,
              (SELECT c.monthly_rent
               FROM contracts c
               WHERE c.property_id = p.id AND c.status = 'active'
               ORDER BY c.created_at DESC LIMIT 1) AS current_rent
       FROM market_prices mp
       LEFT JOIN properties p ON p.id = mp.property_id
       ${where}
       ORDER BY mp.noted_date DESC, mp.created_at DESC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { property_id, price_type, amount, source, url, noted_date, notes } = req.body;
    const { rows } = await query(
      `INSERT INTO market_prices (property_id, price_type, amount, source, url, noted_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [property_id || null, price_type, amount,
       source || null, url || null,
       noted_date || new Date().toISOString().split('T')[0],
       notes || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { property_id, price_type, amount, source, url, noted_date, notes } = req.body;
    const { rows } = await query(
      `UPDATE market_prices SET
        property_id = COALESCE($1, property_id),
        price_type  = COALESCE($2, price_type),
        amount      = COALESCE($3, amount),
        source      = COALESCE($4, source),
        url         = COALESCE($5, url),
        noted_date  = COALESCE($6, noted_date),
        notes       = COALESCE($7, notes)
       WHERE id = $8 RETURNING *`,
      [property_id, price_type, amount, source, url, noted_date, notes, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Fiyat kaydı bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM market_prices WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Fiyat kaydı bulunamadı' });
    res.json({ success: true, message: 'Fiyat kaydı silindi' });
  } catch (err) { next(err); }
};

module.exports = { list, create, update, remove };
