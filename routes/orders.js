const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { items, delivery_address, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Кошик порожній' });
    }

    await connection.beginTransaction();

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const [products] = await connection.execute(
        'SELECT id, name, price, stock FROM products WHERE id = ? AND is_active = 1',
        [item.product_id]
      );

      if (products.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: `Товар id=${item.product_id} не знайдено` });
      }

      const product = products[0];

      if (product.stock < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          error: `Недостатньо "${product.name}" на складі. Доступно: ${product.stock}`
        });
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        product_id:   product.id,
        product_name: product.name,
        unit_price:   product.price,
        quantity:     item.quantity,
        subtotal,
      });
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, status, total_amount, delivery_address, notes)
       VALUES (?, 'pending', ?, ?, ?)`,
      [req.user.id, totalAmount, delivery_address || null, notes || null]
    );

    const orderId = orderResult.insertId;

    for (const item of orderItems) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_name, item.unit_price, item.quantity, item.subtotal]
      );

      await connection.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }
    // Записуємо платіж
       const paymentMethod = req.body.payment_method || 'cash';
       await connection.execute(
       `INSERT INTO payments (order_id, amount, method, status)
       VALUES (?, ?, ?, 'pending')`,
      [orderId, totalAmount, paymentMethod]
      );
    
    await connection.commit();

    res.status(201).json({
      message: 'Замовлення створено успішно!',
      orderId,
      totalAmount,
    });

  } catch (err) {
    await connection.rollback();
    console.error('Помилка створення замовлення:', err);
    res.status(500).json({ error: 'Помилка сервера при створенні замовлення' });
  } finally {
    connection.release();
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
        const [orders] = await pool.execute(
         `SELECT o.*, COUNT(oi.id) AS items_count,
          p.method AS payment_method, p.status AS payment_status
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN payments p ON o.id = p.order_id
          WHERE o.user_id = ?
          GROUP BY o.id, p.method, p.status
          ORDER BY o.created_at DESC`,
        [req.user.id]
        );
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання замовлень' });
  }
});

router.get('/', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
        SELECT o.*, u.name AS user_name, u.email AS user_email,
         COUNT(oi.id) AS items_count,
         m.name AS updated_by_name
         FROM orders o
         JOIN users u ON o.user_id = u.id
         LEFT JOIN order_items oi ON o.id = oi.order_id
         LEFT JOIN users m ON o.updated_by = m.id
        `;
    const params = [];

    if (status) {
      sql += ' WHERE o.status = ?';
      params.push(status);
    }

    sql += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const [orders] = await pool.execute(sql, params);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання замовлень' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Замовлення не знайдено' });
    }

    const order = orders[0];

    if (req.user.role === 'client' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Доступ заборонено' });
    }

    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );

    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE order_id = ?',
      [req.params.id]
    );

    res.json({ order, items, payment: payments[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання деталей замовлення' });
  }
});

router.put('/:id/status', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Невірний статус. Допустимі: ${validStatuses.join(', ')}` });
    }

    // Записуємо хто і коли змінив статус
    await pool.execute(
      'UPDATE orders SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
      [status, req.user.id, req.params.id]
    ); 
    // Якщо замовлення скасовано — оновлюємо статус платежу
if (status === 'cancelled') {
  await pool.execute(
    'UPDATE payments SET status = "failed" WHERE order_id = ?',
    [req.params.id]
  );
}

// Якщо замовлення доставлено — оновлюємо статус платежу
if (status === 'delivered') {
  await pool.execute(
    'UPDATE payments SET status = "paid", paid_at = NOW() WHERE order_id = ?',
    [req.params.id]
  );
}

    res.json({ message: `Статус змінено на "${status}"` });
  } catch (err) {
    res.status(500).json({ error: 'Помилка зміни статусу' });
  }
});
// GET /api/orders/:id/payment — інфо про оплату
router.get('/:id/payment', authMiddleware, async (req, res) => {
  try {
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE order_id = ?',
      [req.params.id]
    );
    if (payments.length === 0) {
      return res.status(404).json({ error: 'Платіж не знайдено' });
    }
    res.json({ payment: payments[0] });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання платежу' });
  }
});

// GET /api/orders/payments/all — всі платежі (тільки адмін)
router.get('/payments/all', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const [payments] = await pool.execute(
      `SELECT p.*, o.user_id, u.name AS user_name, u.email AS user_email
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       JOIN users u ON o.user_id = u.id
       ORDER BY p.created_at DESC`
    );
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Помилка отримання платежів' });
  }
});

module.exports = router;