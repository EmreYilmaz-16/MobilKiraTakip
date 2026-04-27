const { query } = require('../config/database');

const list = async (req, res, next) => {
  try {
    const { status, type, building_id, site_name, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let i = 1;

    if (status)      { conditions.push(`p.status = $${i++}`); params.push(status); }
    if (type)        { conditions.push(`p.type = $${i++}`); params.push(type); }
    if (building_id) { conditions.push(`p.building_id = $${i++}`); params.push(building_id); }
    if (site_name)   { conditions.push(`p.site_name ILIKE $${i++}`); params.push(`%${site_name}%`); }
    if (search)      { conditions.push(`(p.name ILIKE $${i++} OR p.unit_number ILIKE $${i-1} OR p.site_name ILIKE $${i-1})`); params.push(`%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM properties p ${where}`, params
    );

    const { rows } = await query(
      `SELECT p.*, b.name AS building_name,
              c.id AS active_contract_id, c.monthly_rent,
              t.first_name || ' ' || t.last_name AS tenant_name,
              ci.name AS city_name, d.name AS district_name
       FROM properties p
       LEFT JOIN buildings b ON b.id = p.building_id
       LEFT JOIN contracts c ON c.property_id = p.id AND c.status = 'active'
       LEFT JOIN tenants t ON t.id = c.tenant_id
       LEFT JOIN cities ci ON ci.id = p.city_id
       LEFT JOIN districts d ON d.id = p.district_id
       ${where}
       ORDER BY p.created_at DESC
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
      `SELECT p.*, b.name AS building_name,
              ci.name AS city_name, d.name AS district_name
       FROM properties p
       LEFT JOIN buildings b ON b.id = p.building_id
       LEFT JOIN cities ci ON ci.id = p.city_id
       LEFT JOIN districts d ON d.id = p.district_id
       WHERE p.id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mülk bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { building_id, name, site_name, type, floor, unit_number, area_sqm,
            deed_info, description, purchase_price, market_value,
            city_id, district_id, neighborhood } = req.body;
    const { rows } = await query(
      `INSERT INTO properties (building_id, name, site_name, type, floor, unit_number, area_sqm,
        deed_info, description, purchase_price, market_value, city_id, district_id, neighborhood)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [building_id || null, name, site_name || null, type || 'residential', floor || null,
       unit_number || null, area_sqm || null, deed_info || null,
       description || null, purchase_price || null, market_value || null,
       city_id || null, district_id || null, neighborhood || null]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { building_id, name, site_name, type, floor, unit_number, area_sqm,
            deed_info, description, status, purchase_price, market_value,
            city_id, district_id, neighborhood } = req.body;
    const { rows } = await query(
      `UPDATE properties SET
        building_id = COALESCE($1, building_id),
        name = COALESCE($2, name),
        site_name = $3,
        type = COALESCE($4, type),
        floor = COALESCE($5, floor),
        unit_number = COALESCE($6, unit_number),
        area_sqm = COALESCE($7, area_sqm),
        deed_info = COALESCE($8, deed_info),
        description = COALESCE($9, description),
        status = COALESCE($10, status),
        purchase_price = COALESCE($11, purchase_price),
        market_value = COALESCE($12, market_value),
        city_id = $14,
        district_id = $15,
        neighborhood = $16
       WHERE id = $13 RETURNING *`,
      [building_id, name, site_name || null, type, floor, unit_number, area_sqm,
       deed_info, description, status, purchase_price, market_value, req.params.id,
       city_id || null, district_id || null, neighborhood || null]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mülk bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { rows } = await query('DELETE FROM properties WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mülk bulunamadı' });
    res.json({ success: true, message: 'Mülk silindi' });
  } catch (err) { next(err); }
};

module.exports = { list, get, create, update, remove };
