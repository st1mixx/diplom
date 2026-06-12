const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const pool     = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/');
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname);
    const filename = `product-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext     = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Дозволені лише JPG, PNG, WEBP'));
  },
});

const router = express.Router();

router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name'
    );
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання категорій' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY p.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [products] = await pool.execute(sql, params);

    const [countResult] = await pool.execute(
  'SELECT COUNT(*) AS total FROM products WHERE is_active = 1'
   );

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка отримання товарів' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [products] = await pool.execute(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.is_active = 1`,
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    res.json({ product: products[0] });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання товару' });
  }
});

router.post('/', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { category_id, name, description, price, stock, image_url } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Обовʼязкові поля: name, price' });
    }

    const slug = name.toLowerCase()
      .replace(/[^a-zа-яёїіє0-9\s]/gi, '')
      .trim()
      .replace(/\s+/g, '-');

    const [result] = await pool.execute(
      `INSERT INTO products (category_id, name, slug, description, price, stock, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [category_id || null, name, slug, description || null, price, stock || 0, image_url || null]
    );

    res.status(201).json({
      message: 'Товар додано!',
      productId: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка додавання товару' });
  }
});

router.put('/:id', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, description, price, stock, is_active, category_id } = req.body;

    await pool.execute(
      `UPDATE products
       SET name=?, description=?, price=?, stock=?, is_active=?, category_id=?
       WHERE id=?`,
      [name, description, price, stock, is_active, category_id, req.params.id]
    );

    res.json({ message: 'Товар оновлено!' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка оновлення товару' });
  }
});

router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    await pool.execute(
      'UPDATE products SET is_active = 0 WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Товар видалено!' });
  } catch (err) {
    res.status(500).json({ error: 'Помилка видалення товару' });
  }
});

// Завантаження фото товару
// PUT /api/products/:id/image
router.put('/:id/image', authMiddleware, requireRole('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не завантажено' });
    }

    const imageUrl = `/images/${req.file.filename}`;

    await pool.execute(
      'UPDATE products SET image_url = ? WHERE id = ?',
      [imageUrl, req.params.id]
    );

    res.json({
      message: 'Фото завантажено успішно!',
      image_url: imageUrl,
    });

  } catch (err) {
    console.error('Помилка завантаження фото:', err);
    res.status(500).json({ error: 'Помилка завантаження фото' });
  }
});

module.exports = router;