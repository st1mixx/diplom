// public/js/admin.js

const STATUS_LABELS = {
  pending:    '⏳ Очікує',
  confirmed:  '✅ Підтверджено',
  processing: '⚙️ Обробляється',
  shipped:    '🚚 Відправлено',
  delivered:  '🎉 Доставлено',
  cancelled:  '❌ Скасовано',
};

const STATUS_BADGES = {
  pending:    'badge-pending',
  confirmed:  'badge-confirmed',
  processing: 'badge-processing',
  shipped:    'badge-shipped',
  delivered:  'badge-delivered',
  cancelled:  'badge-cancelled',
};

// ── ПЕРЕМИКАННЯ РОЗДІЛІВ ──────────────────────────────────────
function showSection(name, btn) {
  document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.cabinet-link').forEach(el => el.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  if (btn) btn.classList.add('active');

  if (name === 'orders')   loadAdminOrders();
  if (name === 'products') loadAdminProducts();
  if (name === 'users')    loadAdminUsers();
  if (name === 'stats')    loadStats();
  if (name === 'payments') loadPayments();
}

// ── ЗАМОВЛЕННЯ ────────────────────────────────────────────────
async function loadAdminOrders() {
  const container = document.getElementById('ordersList');
  try {
    const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
    let url = `${API}/orders`;
    if (statusFilter) url += `?status=${statusFilter}`;

    const res  = await fetch(url, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();

    if (data.orders.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3)">Замовлень немає</div>';
      return;
    }

    container.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Клієнт</th>
            <th>Дата</th>
            <th>Товарів</th>
            <th>Сума</th>
            <th>Статус</th>
            <th>Змінив</th>
            <th>Дія</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map(order => `
            <tr>
              <td><strong>#${order.id}</strong></td>
              <td>
                <div style="font-weight:600">${order.user_name}</div>
                <div style="font-size:.8rem;color:var(--text-3)">${order.user_email}</div>
              </td>
              <td>${new Date(order.created_at).toLocaleDateString('uk-UA')}</td>
              <td>${order.items_count} шт.</td>
              <td><strong>${Number(order.total_amount).toLocaleString('uk-UA')} ₴</strong></td>
              <td><span class="badge ${STATUS_BADGES[order.status]}">${STATUS_LABELS[order.status]}</span></td>
              <td style="font-size:.82rem;color:var(--text-3)">
                ${order.updated_by_name
                  ? `👤 ${order.updated_by_name}`
                  : '—'}
              </td>
              <td>
                <select class="form-input" style="padding:6px 10px;font-size:.82rem;width:auto"
                  onchange="changeOrderStatus(${order.id}, this.value)">
                  <option value="pending"    ${order.status==='pending'    ?'selected':''}>⏳ Очікує</option>
                  <option value="confirmed"  ${order.status==='confirmed'  ?'selected':''}>✅ Підтверджено</option>
                  <option value="processing" ${order.status==='processing' ?'selected':''}>⚙️ Обробляється</option>
                  <option value="shipped"    ${order.status==='shipped'    ?'selected':''}>🚚 Відправлено</option>
                  <option value="delivered"  ${order.status==='delivered'  ?'selected':''}>🎉 Доставлено</option>
                  <option value="cancelled"  ${order.status==='cancelled'  ?'selected':''}>❌ Скасовано</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);padding:20px">❌ Помилка завантаження</div>';
  }
}

// Змінити статус замовлення
async function changeOrderStatus(orderId, status) {
  try {
    const res = await fetch(`${API}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      showToast(`✅ Статус замовлення #${orderId} змінено`, 'success');
      loadAdminOrders();
    } else {
      showToast('❌ Помилка зміни статусу', 'error');
    }
  } catch (err) {
    showToast('❌ Помилка підключення', 'error');
  }
}

// ── ТОВАРИ ────────────────────────────────────────────────────
async function loadAdminProducts() {
  const container = document.getElementById('productsList');
  try {
    const res  = await fetch(`${API}/products?limit=100`);
    const data = await res.json();

    container.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th>Фото</th>
            <th>ID</th>
            <th>Назва</th>
            <th>Категорія</th>
            <th>Ціна</th>
            <th>Залишок</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          ${data.products.map(p => `
            <tr>
              <td>
                <div style="width:50px;height:50px;border-radius:8px;
                            background:var(--surface-2);
                            display:flex;align-items:center;justify-content:center;
                            font-size:1.5rem;overflow:hidden">
                  ${p.image_url
                    ? `<img src="${p.image_url}" style="width:100%;height:100%;object-fit:cover">`
                    : '📦'}
                </div>
              </td>
              <td>${p.id}</td>
              <td><strong>${p.name}</strong></td>
              <td>${p.category_name || '—'}</td>
              <td>${Number(p.price).toLocaleString('uk-UA')} ₴</td>
              <td>
                <span style="color:${p.stock > 0 ? 'var(--success)' : 'var(--danger)'}">
                  ${p.stock} шт.
                </span>
              </td>
              <td style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <label class="btn btn-sm btn-outline" style="cursor:pointer;margin:0">
                  📷 Фото
                  <input type="file" accept=".jpg,.jpeg,.png,.webp"
                    style="display:none"
                    onchange="uploadPhoto(${p.id}, this)">
                </label>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">
                  🗑️ Видалити
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);padding:20px">❌ Помилка завантаження</div>';
  }
}

function showAddProduct()  { document.getElementById('addProductForm').classList.remove('hidden'); }
function hideAddProduct()  { document.getElementById('addProductForm').classList.add('hidden'); }

async function addProduct() {
  const name     = document.getElementById('newProductName').value.trim();
  const price    = document.getElementById('newProductPrice').value;
  const stock    = document.getElementById('newProductStock').value;
  const category = document.getElementById('newProductCategory').value;
  const desc     = document.getElementById('newProductDesc').value.trim();

  if (!name || !price) {
    showToast('⚠️ Заповніть назву і ціну', 'error');
    return;
  }

  try {
    const res = await fetch(`${API}/products`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        name, price: Number(price),
        stock: Number(stock) || 0,
        category_id: Number(category) || null,
        description: desc,
      }),
    });

    if (res.ok) {
      showToast('✅ Товар додано!', 'success');
      hideAddProduct();
      loadAdminProducts();
    } else {
      const data = await res.json();
      showToast(`❌ ${data.error}`, 'error');
    }
  } catch (err) {
    showToast('❌ Помилка підключення', 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Видалити цей товар?')) return;

  try {
    const res = await fetch(`${API}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });

    if (res.ok) {
      showToast('🗑️ Товар видалено', 'success');
      loadAdminProducts();
    }
  } catch (err) {
    showToast('❌ Помилка підключення', 'error');
  }
}

async function uploadPhoto(productId, input) {
  const file = input.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('image', file);

  showToast('⏳ Завантаження фото...', '');

  try {
    const res = await fetch(`${API}/products/${productId}/image`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      showToast('✅ Фото завантажено!', 'success');
      loadAdminProducts();
    } else {
      showToast(`❌ ${data.error}`, 'error');
    }
  } catch (err) {
    showToast('❌ Помилка завантаження', 'error');
  }
}
// ── КЛІЄНТИ ───────────────────────────────────────────────────
async function loadAdminUsers() {
  const container = document.getElementById('usersList');
  try {
    const res  = await fetch(`${API}/auth/users`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();

    container.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Ім'я</th>
            <th>Email</th>
            <th>Роль</th>
            <th>Дата реєстрації</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map(u => `
            <tr>
              <td>${u.id}</td>
              <td><strong>${u.name}</strong></td>
              <td>${u.email}</td>
              <td>
                <span class="badge ${u.role === 'admin' ? 'badge-confirmed' : u.role === 'manager' ? 'badge-processing' : 'badge-pending'}">
                  ${u.role === 'admin' ? '👑 Адмін' : u.role === 'manager' ? '⚙️ Менеджер' : '👤 Клієнт'}
                </span>
              </td>
              <td>${new Date(u.created_at).toLocaleDateString('uk-UA')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);padding:20px">❌ Помилка завантаження</div>';
  }
}

// ── СТАТИСТИКА ────────────────────────────────────────────────
async function loadStats() {
  const container = document.getElementById('statsList');
  try {
    const [ordersRes, productsRes] = await Promise.all([
      fetch(`${API}/orders`, { headers: { 'Authorization': `Bearer ${getToken()}` } }),
      fetch(`${API}/products?limit=100`),
    ]);

    const ordersData   = await ordersRes.json();
    const productsData = await productsRes.json();

    const orders   = ordersData.orders || [];
    const products = productsData.products || [];

    const totalRevenue  = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount), 0);

    const pendingOrders   = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const lowStock        = products.filter(p => p.stock < 5).length;

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:28px">
        ${[
          { icon: '💰', label: 'Загальний дохід',    value: totalRevenue.toLocaleString('uk-UA') + ' ₴', color: 'var(--success)' },
          { icon: '📦', label: 'Всього замовлень',   value: orders.length,       color: 'var(--primary)' },
          { icon: '⏳', label: 'Очікують обробки',   value: pendingOrders,       color: 'var(--warning)' },
          { icon: '🎉', label: 'Доставлено',          value: deliveredOrders,     color: 'var(--success)' },
          { icon: '🛍️', label: 'Товарів у каталозі', value: products.length,     color: 'var(--primary)' },
          { icon: '⚠️', label: 'Мало на складі',     value: lowStock,            color: 'var(--danger)'  },
        ].map(s => `
          <div style="background:var(--surface-2);border-radius:var(--radius);padding:20px;text-align:center">
            <div style="font-size:2rem;margin-bottom:8px">${s.icon}</div>
            <div style="font-size:1.4rem;font-weight:800;color:${s.color};margin-bottom:4px">${s.value}</div>
            <div style="font-size:.82rem;color:var(--text-3);font-weight:600">${s.label}</div>
          </div>
        `).join('')}
      </div>`;
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);padding:20px">❌ Помилка завантаження статистики</div>';
  }
}

async function loadPayments() {
  const container = document.getElementById('paymentsList');
  try {
    const res  = await fetch(`${API}/orders/payments/all`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();

    if (!data.payments || data.payments.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3)">Платежів немає</div>';
      return;
    }

    const METHOD_LABELS = {
      cash:          '💵 Готівка',
      card:          '💳 Картка',
      bank_transfer: '🏦 Переказ',
    };

    const PAYMENT_STATUS = {
      pending:  '⏳ Очікує',
      paid:     '✅ Оплачено',
      failed:   '❌ Помилка',
      refunded: '↩️ Повернено',
    };

    container.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Замовлення</th>
            <th>Клієнт</th>
            <th>Сума</th>
            <th>Метод</th>
            <th>Статус</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          ${data.payments.map(p => `
            <tr>
              <td>${p.id}</td>
              <td><strong>#${p.order_id}</strong></td>
              <td>
                <div style="font-weight:600">${p.user_name}</div>
                <div style="font-size:.8rem;color:var(--text-3)">${p.user_email}</div>
              </td>
              <td><strong>${Number(p.amount).toLocaleString('uk-UA')} ₴</strong></td>
              <td>${METHOD_LABELS[p.method] || p.method}</td>
              <td>
                <span class="badge ${p.status === 'paid' ? 'badge-delivered' : 'badge-pending'}">
                  ${PAYMENT_STATUS[p.status] || p.status}
                </span>
              </td>
              <td>${new Date(p.created_at).toLocaleDateString('uk-UA')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);padding:20px">❌ Помилка завантаження</div>';
  }
}
// ── ІНІЦІАЛІЗАЦІЯ ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser();
  if (user.role !== 'admin' && user.role !== 'manager') {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('adminName').textContent = user.name;
  updateCartCount();
  loadAdminOrders();
});