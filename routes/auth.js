const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Заповніть усі поля: name, email, password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль має містити мінімум 6 символів' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Цей email вже зареєстрований' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'client']
    );

    const token = jwt.sign(
      { id: result.insertId, email, role: 'client', name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Реєстрація успішна!',
      token,
      user: { id: result.insertId, name, email, role: 'client' },
    });

  } catch (err) {
    console.error('Помилка реєстрації:', err);
    res.status(500).json({ error: 'Помилка сервера при реєстрації' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Введіть email та пароль' });
    }

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Вхід успішний!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

  } catch (err) {
    console.error('Помилка входу:', err);
    res.status(500).json({ error: 'Помилка сервера при вході' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Користувача не знайдено' });
    }

    res.json({ user: users[0] });

  } catch (err) {
    console.error('Помилка отримання профілю:', err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// GET /api/auth/users — список всіх користувачів (тільки адмін)
router.get('/users', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання користувачів' });
  }
});

module.exports = router;