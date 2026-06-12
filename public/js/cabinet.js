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

function showSection(name) {
  document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.cabinet-link').forEach(el => el.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  event.target.classList.add('active');
  if (name === 'orders')  loadOrders();
  if (name === 'profile') loadProfile();
}

async function loadOrders() {
  const container = document.getElementById('ordersList');
  if (!container) return;

  try {
    const response = await fetch(`${API}/orders/my`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();

    if (data.orders.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px">
          <div style="font-size:4rem;margin-bottom:16px">📭</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text-2);margin-bottom:16px">
            Замовлень поки немає
          </div>
          <a href="catalog.html" class="btn btn-primary">Перейти до каталогу</a>
        </div>`;
      return;
    }

    container.innerHTML = `
      <table class="orders-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Дата</th>
            <th>Товарів</th>
            <th>Сума</th>
            <th>Доставка</th>
            <th>Оплата</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map(order => `
            <tr>
              <td><strong>#${order.id}</strong></td>
              <td>${new Date(order.created_at).toLocaleDateString('uk-UA')}</td>
              <td>${order.items_count} шт.</td>
              <td><strong>${Number(order.total_amount).toLocaleString('uk-UA')} ₴</strong></td>
              <td style="font-size:.82rem;max-width:180px">
                ${order.delivery_address
                  ? `<span title="${order.delivery_address}">
                       ${order.delivery_address.substring(0, 30)}${order.delivery_address.length > 30 ? '...' : ''}
                     </span>`
                  : '—'}
              </td>
              <td>
                ${order.payment_method === 'card'
                  ? '<span class="badge badge-confirmed">💳 Картка</span>'
                  : order.payment_method === 'bank_transfer'
                  ? '<span class="badge badge-processing">🏦 Переказ</span>'
                  : '<span class="badge badge-pending">💵 Готівка</span>'}
              </td>
              <td>
                <span class="badge ${STATUS_BADGES[order.status]}">
                  ${STATUS_LABELS[order.status]}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);padding:20px">❌ Помилка завантаження замовлень</div>`;
  }
}

async function loadProfile() {
  const container = document.getElementById('profileContent');
  if (!container) return;

  try {
    const response = await fetch(`${API}/auth/me`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await response.json();
    const user = data.user;

    container.innerHTML = `
      <div style="max-width:480px">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div style="background:var(--surface-2);border-radius:var(--radius);padding:20px">
            <div style="font-size:.78rem;font-weight:800;text-transform:uppercase;
                        letter-spacing:1px;color:var(--text-3);margin-bottom:4px">Ім'я</div>
            <div style="font-size:1.05rem;font-weight:700">${user.name}</div>
          </div>
          <div style="background:var(--surface-2);border-radius:var(--radius);padding:20px">
            <div style="font-size:.78rem;font-weight:800;text-transform:uppercase;
                        letter-spacing:1px;color:var(--text-3);margin-bottom:4px">Email</div>
            <div style="font-size:1.05rem;font-weight:700">${user.email}</div>
          </div>
          <div style="background:var(--surface-2);border-radius:var(--radius);padding:20px">
            <div style="font-size:.78rem;font-weight:800;text-transform:uppercase;
                        letter-spacing:1px;color:var(--text-3);margin-bottom:4px">Роль</div>
            <div style="font-size:1.05rem;font-weight:700">
              ${user.role === 'admin' ? '👑 Адміністратор' :
                user.role === 'manager' ? '⚙️ Менеджер' : '👤 Клієнт'}
            </div>
          </div>
          <div style="background:var(--surface-2);border-radius:var(--radius);padding:20px">
            <div style="font-size:.78rem;font-weight:800;text-transform:uppercase;
                        letter-spacing:1px;color:var(--text-3);margin-bottom:4px">
              Дата реєстрації
            </div>
            <div style="font-size:1.05rem;font-weight:700">
              ${new Date(user.created_at).toLocaleDateString('uk-UA')}
            </div>
          </div>
        </div>
      </div>`;

  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);padding:20px">❌ Помилка завантаження профілю</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser();
  if (user) {
    document.getElementById('cabinetName').textContent = user.name;
    document.getElementById('cabinetRole').textContent =
      user.role === 'admin' ? '👑 Адміністратор' :
      user.role === 'manager' ? '⚙️ Менеджер' : '👤 Клієнт';
  }

  updateCartCount();
  loadOrders();
});