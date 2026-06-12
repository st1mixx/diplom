// public/js/manager.js

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

const STATUS_COLORS = {
  pending:    '#ffb800',
  confirmed:  '#0057ff',
  processing: '#8b5cf6',
  shipped:    '#00c48c',
  delivered:  '#00c48c',
  cancelled:  '#ff3b3b',
};

function showManagerSection(name, btn) {
  document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.cabinet-link').forEach(el => el.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  if (btn) btn.classList.add('active');

  if (name === 'new')    loadOrders('pending',    'newOrdersList');
  if (name === 'active') loadOrders('processing', 'activeOrdersList');
  if (name === 'all')    loadOrders('',           'allOrdersList');
}

async function loadOrders(status, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3)">⏳ Завантаження...</div>';

  try {
    let url = `${API}/orders`;
    if (status) url += `?status=${status}`;

    const res  = await fetch(url, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();

    if (!data.orders || data.orders.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px">
          <div style="font-size:3rem;margin-bottom:16px">📭</div>
          <div style="font-size:1rem;font-weight:700;color:var(--text-2)">
            ${status === 'pending'    ? 'Нових замовлень немає' :
              status === 'processing' ? 'Замовлень в обробці немає' :
              'Замовлень немає'}
          </div>
        </div>`;
      return;
    }

    container.innerHTML = data.orders.map(order => createOrderCard(order)).join('');

  } catch (err) {
    container.innerHTML = '<div style="color:var(--danger);padding:20px">❌ Помилка завантаження</div>';
  }
}

function createOrderCard(order) {
  const date  = new Date(order.created_at).toLocaleDateString('uk-UA');
  const time  = new Date(order.created_at).toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
  const color = STATUS_COLORS[order.status] || '#9ca3af';

  return `
    <div style="background:var(--surface);
                border:1px solid var(--border);
                border-left:4px solid ${color};
                border-radius:var(--radius);
                padding:20px;
                margin-bottom:14px;
                transition:all var(--transition);
                box-shadow:var(--shadow-sm)"
         onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateX(4px)'"
         onmouseout="this.style.boxShadow='var(--shadow-sm)';this.style.transform='none'">

      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:1.1rem;font-weight:800">#${order.id} — ${order.user_name}</div>
          <div style="font-size:.85rem;color:var(--text-3);margin-top:2px">
            📧 ${order.user_email} · 📅 ${date} ${time}
          </div>
        </div>
        <span class="badge ${STATUS_BADGES[order.status]}">${STATUS_LABELS[order.status]}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:12px">
          <div style="font-size:.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Товарів</div>
          <div style="font-weight:700">${order.items_count} шт.</div>
        </div>
        <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:12px">
          <div style="font-size:.75rem;color:var(--text-3);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Сума</div>
          <div style="font-weight:800;color:var(--primary)">${Number(order.total_amount).toLocaleString('uk-UA')} ₴</div>
        </div>
      </div>

      <div style="background:var(--surface-2);border-radius:var(--radius-sm);padding:12px;margin-bottom:16px;font-size:.88rem">
        <span style="color:var(--text-3);font-weight:700">📦 Доставка:</span>
        <span style="margin-left:8px;font-weight:600">${order.delivery_address || 'Не вказано'}</span>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${order.status === 'pending' ? `
          <button class="btn btn-primary btn-sm" onclick="updateStatus(${order.id}, 'confirmed')">
            ✅ Підтвердити
          </button>
          <button class="btn btn-danger btn-sm" onclick="updateStatus(${order.id}, 'cancelled')">
            ❌ Скасувати
          </button>
        ` : ''}

        ${order.status === 'confirmed' ? `
          <button class="btn btn-primary btn-sm" onclick="updateStatus(${order.id}, 'processing')">
            ⚙️ Почати обробку
          </button>
          <button class="btn btn-danger btn-sm" onclick="updateStatus(${order.id}, 'cancelled')">
            ❌ Скасувати
          </button>
        ` : ''}

        ${order.status === 'processing' ? `
          <button class="btn btn-primary btn-sm" onclick="updateStatus(${order.id}, 'shipped')">
            🚚 Відправити
          </button>
        ` : ''}

        ${order.status === 'shipped' ? `
          <button class="btn btn-primary btn-sm" onclick="updateStatus(${order.id}, 'delivered')">
            🎉 Доставлено
          </button>
        ` : ''}

        ${order.status === 'cancelled' || order.status === 'delivered' ? `
          <span style="color:var(--text-3);font-size:.88rem;font-weight:600">
            Замовлення завершено
          </span>
        ` : ''}
      </div>
    </div>`;
}

async function updateStatus(orderId, status) {
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
      const labels = {
        confirmed:  'Замовлення підтверджено ✅',
        processing: 'Замовлення в обробці ⚙️',
        shipped:    'Замовлення відправлено 🚚',
        delivered:  'Замовлення доставлено 🎉',
        cancelled:  'Замовлення скасовано ❌',
      };
      showToast(labels[status] || 'Статус оновлено', 'success');

      const activeBtn = document.querySelector('.cabinet-link.active');
      if (activeBtn) activeBtn.click();

    } else {
      showToast('❌ Помилка зміни статусу', 'error');
    }
  } catch (err) {
    showToast('❌ Помилка підключення', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUser();
  if (user.role !== 'manager' && user.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('managerName').textContent = user.name;
  updateCartCount();
  loadOrders('pending', 'newOrdersList');
});