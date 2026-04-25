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
            deposit_amount, increase_type, increase_rate, special_terms, eviction_date,
            payment_day } = req.body;

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
        deposit_amount, increase_type, increase_rate, special_terms, eviction_date, payment_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [property_id, tenant_id, start_date, end_date, monthly_rent,
       deposit_amount || 0, increase_type || 'tüfe', increase_rate || null,
       special_terms || null, eviction_date || null, payment_day || 1]
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
            increase_rate, special_terms, eviction_date, status, payment_day } = req.body;
    const { rows } = await query(
      `UPDATE contracts SET
        end_date = COALESCE($1, end_date),
        monthly_rent = COALESCE($2, monthly_rent),
        deposit_amount = COALESCE($3, deposit_amount),
        increase_type = COALESCE($4, increase_type),
        increase_rate = COALESCE($5, increase_rate),
        special_terms = COALESCE($6, special_terms),
        eviction_date = COALESCE($7, eviction_date),
        status = COALESCE($8, status),
        payment_day = COALESCE($9, payment_day)
       WHERE id = $10 RETURNING *`,
      [end_date, monthly_rent, deposit_amount, increase_type,
       increase_rate, special_terms, eviction_date, status, payment_day || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Sözleşme bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// Sözleşmeyi sonlandır: status güncelle + mülkü "available" yap + depozito mahsubu gelir kaydı
const terminate = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      termination_type = 'terminated',
      deposit_return_amount = null,   // null = tam iade, 0 = hiç iade yok, X = kısmi iade
      deposit_return_date,
      termination_notes
    } = req.body;
    const safeReturnDate  = deposit_return_date  || null;
    const safeNotes       = termination_notes    || null;

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

    const depositAmount  = Number(existing[0].deposit_amount) || 0;
    // deposit_return_amount null gelirse tam iade varsayılır
    const returnAmount   = deposit_return_amount !== null ? Number(deposit_return_amount) : depositAmount;
    const damageAmount   = Math.max(0, depositAmount - returnAmount);
    const depositReturned = returnAmount >= depositAmount;

    // Sözleşmeyi güncelle
    const { rows } = await client.query(
      `UPDATE contracts SET
         status = $1,
         deposit_returned = $2,
         deposit_return_date = $3,
         deposit_return_amount = $4,
         termination_notes = $5,
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [termination_type, depositReturned, safeReturnDate, returnAmount, safeNotes, req.params.id]
    );

    // Hasar tazminatı varsa → ödeme tablosuna gelir kaydı düş (zaten tahsil edildi)
    if (damageAmount > 0) {
      const today = new Date().toISOString().split('T')[0];
      await client.query(
        `INSERT INTO payments (contract_id, amount, due_date, payment_date, status, notes)
         VALUES ($1, $2, $3, $3, 'paid', $4)`,
        [req.params.id, damageAmount, today,
         `Depozito mahsubu — hasar/eksiklik tazminatı (toplam depozito: ₺${depositAmount}, iade: ₺${returnAmount})`]
      );
    }

    // Mülkü boşa çıkar
    await client.query(
      `UPDATE properties SET status = 'available', updated_at = NOW() WHERE id = $1`,
      [existing[0].property_id]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      data: rows[0],
      damage_amount: damageAmount,
      message: damageAmount > 0
        ? `Sözleşme sonlandırıldı. ₺${damageAmount.toLocaleString('tr-TR')} hasar tazminatı gelir olarak kaydedildi.`
        : 'Sözleşme sonlandırıldı.'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { list, get, create, update, terminate };
