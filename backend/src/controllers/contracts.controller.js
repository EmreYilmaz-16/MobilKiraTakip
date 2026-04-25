const { query, getClient } = require('../config/database');

const list = async (req, res, next) => {
  try {
    const { status, property_id, tenant_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let i = 1;

    if (status)      { conditions.push(`c.status = $${i++}`); params.push(status); }
    if (property_id) { conditions.push(`c.property_id = $${i++}`); params.push(property_id); }
    if (tenant_id)   { conditions.push(`c.tenant_id = $${i++}`); params.push(tenant_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRes = await query(`SELECT COUNT(*) FROM contracts c ${where}`, params);
    const { rows } = await query(
      `SELECT c.*,
              p.name AS property_name, p.unit_number,
              t.first_name || ' ' || t.last_name AS tenant_name, t.phone AS tenant_phone
       FROM contracts c
       JOIN properties p ON p.id = c.property_id
       JOIN tenants t ON t.id = c.tenant_id
       ${where}
       ORDER BY c.start_date DESC
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

const get = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              p.name AS property_name, p.unit_number,
              t.first_name || ' ' || t.last_name AS tenant_name,
              t.phone AS tenant_phone, t.email AS tenant_email
       FROM contracts c
       JOIN properties p ON p.id = c.property_id
       JOIN tenants t ON t.id = c.tenant_id
       WHERE c.id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Sözleşme bulunamadı' });

    const { rows: payments } = await query(
      'SELECT * FROM payments WHERE contract_id = $1 ORDER BY due_date DESC',
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], payments } });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { property_id, tenant_id, start_date, end_date, monthly_rent,
            deposit_amount, increase_type, increase_rate, special_terms, eviction_date } = req.body;

    // Çakışan aktif sözleşme kontrolü
    const conflict = await client.query(
      `SELECT id FROM contracts
       WHERE property_id = $1 AND status = 'active'
         AND daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')`,
      [property_id, start_date, end_date]
    );
    if (conflict.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Bu mülk için çakışan aktif sözleşme var' });
    }

    const { rows } = await client.query(
      `INSERT INTO contracts (property_id, tenant_id, start_date, end_date, monthly_rent,
        deposit_amount, increase_type, increase_rate, special_terms, eviction_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [property_id, tenant_id, start_date, end_date, monthly_rent,
       deposit_amount || 0, increase_type || 'tüfe', increase_rate || null,
       special_terms || null, eviction_date || null]
    );

    // Mülk durumunu "rented" yap
    await client.query(`UPDATE properties SET status = 'rented' WHERE id = $1`, [property_id]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const update = async (req, res, next) => {
  try {
    const { end_date, monthly_rent, deposit_amount, increase_type,
            increase_rate, special_terms, eviction_date, status } = req.body;
    const { rows } = await query(
      `UPDATE contracts SET
        end_date = COALESCE($1, end_date),
        monthly_rent = COALESCE($2, monthly_rent),
        deposit_amount = COALESCE($3, deposit_amount),
        increase_type = COALESCE($4, increase_type),
        increase_rate = COALESCE($5, increase_rate),
        special_terms = COALESCE($6, special_terms),
        eviction_date = COALESCE($7, eviction_date),
        status = COALESCE($8, status)
       WHERE id = $9 RETURNING *`,
      [end_date, monthly_rent, deposit_amount, increase_type,
       increase_rate, special_terms, eviction_date, status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Sözleşme bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// Sözleşmeyi sonlandır: status güncelle + mülkü "available" yap + depozito bilgisi kaydet
const terminate = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { termination_type = 'terminated', deposit_returned = false, deposit_return_date = null, termination_notes = null } = req.body;

    // Sözleşmeyi getir
    const { rows: existing } = await client.query(
      'SELECT * FROM contracts WHERE id = $1', [req.params.id]
    );
    if (!existing.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sözleşme bulunamadı' });
    }
    if (existing[0].status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Sadece aktif sözleşmeler sonlandırılabilir' });
    }

    // Sözleşmeyi güncelle
    const { rows } = await client.query(
      `UPDATE contracts SET
         status = $1,
         deposit_returned = $2,
         deposit_return_date = $3,
         termination_notes = $4,
         updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [termination_type, deposit_returned, deposit_return_date, termination_notes, req.params.id]
    );

    // Mülkü boşa çıkar
    await client.query(
      `UPDATE properties SET status = 'available', updated_at = NOW() WHERE id = $1`,
      [existing[0].property_id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { list, get, create, update, terminate };
