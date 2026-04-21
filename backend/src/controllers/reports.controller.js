const { query } = require('../config/database');

const dashboard = async (req, res, next) => {
  try {
    const [
      propertyStats, paymentStats, upcomingContracts, recentPayments, maintenanceOpen
    ] = await Promise.all([
      query(`SELECT
               COUNT(*) FILTER (WHERE status = 'available') AS available,
               COUNT(*) FILTER (WHERE status = 'rented') AS rented,
               COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance,
               COUNT(*) AS total
             FROM properties`),
      query(`SELECT
               COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND date_trunc('month', payment_date) = date_trunc('month', NOW())), 0) AS collected_this_month,
               COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < NOW()::date), 0) AS overdue_total,
               COUNT(*) FILTER (WHERE status = 'pending' AND due_date < NOW()::date) AS overdue_count
             FROM payments`),
      query(`SELECT c.id, c.end_date, c.monthly_rent,
                    p.name AS property_name,
                    t.first_name || ' ' || t.last_name AS tenant_name, t.phone
             FROM contracts c
             JOIN properties p ON p.id = c.property_id
             JOIN tenants t ON t.id = c.tenant_id
             WHERE c.status = 'active'
               AND c.end_date BETWEEN NOW()::date AND (NOW() + INTERVAL '60 days')::date
             ORDER BY c.end_date`),
      query(`SELECT py.*, pr.name AS property_name,
                    t.first_name || ' ' || t.last_name AS tenant_name
             FROM payments py
             JOIN contracts c ON c.id = py.contract_id
             JOIN properties pr ON pr.id = c.property_id
             JOIN tenants t ON t.id = c.tenant_id
             ORDER BY py.updated_at DESC LIMIT 10`),
      query(`SELECT COUNT(*) AS count FROM maintenance_requests
             WHERE status IN ('open','in_progress')`)
    ]);

    res.json({
      success: true,
      data: {
        properties: propertyStats.rows[0],
        payments: paymentStats.rows[0],
        expiring_contracts: upcomingContracts.rows,
        recent_payments: recentPayments.rows,
        open_maintenance: Number(maintenanceOpen.rows[0].count)
      }
    });
  } catch (err) { next(err); }
};

const incomeExpense = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const [income, expenses] = await Promise.all([
      query(`SELECT
               to_char(date_trunc('month', payment_date), 'YYYY-MM') AS month,
               SUM(amount) AS total
             FROM payments
             WHERE status = 'paid'
               AND EXTRACT(YEAR FROM payment_date) = $1
             GROUP BY 1 ORDER BY 1`, [year]),
      query(`SELECT
               to_char(date_trunc('month', date), 'YYYY-MM') AS month,
               SUM(amount) AS total
             FROM expenses
             WHERE EXTRACT(YEAR FROM date) = $1
             GROUP BY 1 ORDER BY 1`, [year])
    ]);

    res.json({ success: true, data: { income: income.rows, expenses: expenses.rows, year: Number(year) } });
  } catch (err) { next(err); }
};

const propertyProfitability = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const { rows } = await query(
      `SELECT p.id, p.name, p.unit_number,
              COALESCE(SUM(py.amount) FILTER (WHERE py.status = 'paid'), 0) AS income,
              COALESCE(SUM(e.amount), 0) AS expenses,
              COALESCE(SUM(py.amount) FILTER (WHERE py.status = 'paid'), 0)
                - COALESCE(SUM(e.amount), 0) AS net
       FROM properties p
       LEFT JOIN contracts c ON c.property_id = p.id
       LEFT JOIN payments py ON py.contract_id = c.id
         AND EXTRACT(YEAR FROM py.payment_date) = $1
       LEFT JOIN expenses e ON e.property_id = p.id
         AND EXTRACT(YEAR FROM e.date) = $1
       GROUP BY p.id, p.name, p.unit_number
       ORDER BY net DESC`, [year]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

module.exports = { dashboard, incomeExpense, propertyProfitability };
