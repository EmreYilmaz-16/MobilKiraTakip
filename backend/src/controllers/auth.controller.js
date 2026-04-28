const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email ve şifre gerekli' });
    }

    const { rows } = await query(
      `SELECT u.id,
              u.organization_id,
              u.name,
              u.email,
              u.password,
              u.role,
              o.name AS organization_name,
              o.slug AS organization_slug,
              o.is_active AS organization_active
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1 AND u.is_active = TRUE`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Geçersiz kimlik bilgileri' });
    }

    const user = rows[0];
    if (!user.organization_active) {
      return res.status(403).json({ success: false, message: 'Organizasyon hesabı pasif durumda' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Geçersiz kimlik bilgileri' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        organization_id: user.organization_id,
        organization_name: user.organization_name,
        organization_slug: user.organization_slug,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          organization_id: user.organization_id,
          organization_name: user.organization_name,
          organization_slug: user.organization_slug,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// Sadece admin rolüdeki kullanıcılar yeni kullanıcı oluşturabilir
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Ad, email ve şifre zorunlu' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Şifre en az 8 karakter olmalı' });
    }
    const validRoles = ['owner', 'accountant', 'agent', 'admin', 'platform_admin'];
    const assignedRole = validRoles.includes(role) ? role : 'owner';

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (organization_id, name, email, password, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, organization_id, name, email, role, phone, created_at`,
      [req.user.organization_id, name.trim(), email.toLowerCase().trim(), hash, assignedRole, phone || null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id,
              u.organization_id,
              u.name,
              u.email,
              u.role,
              u.phone,
              u.created_at,
              o.name AS organization_name,
              o.slug AS organization_slug
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Geçerli mevcut şifre ve en az 8 karakterli yeni şifre gerekli' });
    }

    const { rows } = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Mevcut şifre yanlış' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true, message: 'Şifre güncellendi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, me, changePassword };
