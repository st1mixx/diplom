// public/js/cart.js

function renderCart() {
  const cart    = getCart();
  const content = document.getElementById('cartContent');
  if (!content) return;

  if (cart.length === 0) {
    content.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <p>Кошик порожній</p>
        <a href="index.html" class="btn btn-primary">Перейти до каталогу</a>
      </div>`;
    return;
  }

  const total    = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count    = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalFmt = total.toLocaleString('uk-UA');

  const itemsHtml = cart.map(item => `
    <div class="cart-item" id="cart-item-${item.id}">
      <div class="cart-item-icon">📦</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${Number(item.price).toLocaleString('uk-UA')} ₴ за шт.</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
          <span class="qty-num">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
          <button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.id})" style="margin-left:8px">🗑️ Видалити</button>
        </div>
      </div>
      <div style="text-align:right;min-width:120px">
        <div style="font-size:1.1rem;font-weight:800;color:var(--primary)">
          ${(item.price * item.quantity).toLocaleString('uk-UA')} ₴
        </div>
      </div>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items">${itemsHtml}</div>
      <div class="cart-summary">
        <div class="summary-title">Підсумок замовлення</div>
        <div class="summary-row">
          <span>Товарів:</span>
          <span>${count} шт.</span>
        </div>
        <div class="summary-row">
          <span>Доставка:</span>
          <span style="color:var(--success)">Безкоштовно</span>
        </div>
        <div class="summary-total">
          <span>Разом:</span>
          <span>${totalFmt} ₴</span>
        </div>

        <div class="form-group">
          <label class="form-label">Метод оплати</label>
          <select id="paymentMethod" class="form-input">
            <option value="cash">💵 Готівка при отриманні</option>
            <option value="card">💳 Оплата карткою онлайн</option>
            <option value="bank_transfer">🏦 Банківський переказ</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Спосіб доставки</label>
          <select id="deliveryMethod" class="form-input">
            <option value="nova_poshta">🚚 Нова Пошта</option>
            <option value="ukrposhta">📬 Укрпошта</option>
            <option value="meest">📦 Meest Express</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Місто</label>
          <input type="text" id="deliveryCity" class="form-input"
            placeholder="Наприклад: Київ">
        </div>

        <div class="form-group">
          <label class="form-label">Номер відділення або поштомат</label>
          <input type="text" id="deliveryBranch" class="form-input"
            placeholder="Наприклад: Відділення №1">
        </div>

        <div class="form-group">
          <label class="form-label">ПІБ отримувача</label>
          <input type="text" id="deliveryName" class="form-input"
            placeholder="Іван Іваненко">
        </div>

        <div class="form-group">
          <label class="form-label">Телефон отримувача</label>
          <input type="text" id="deliveryPhone" class="form-input"
            placeholder="+380501234567">
        </div>

        <div class="form-group">
          <label class="form-label">Коментар до замовлення</label>
          <input type="text" id="orderNotes" class="form-input"
            placeholder="Додаткова інформація...">
        </div>

        <button class="btn btn-primary btn-full" onclick="placeOrder()" style="margin-top:8px">
          ✅ Оформити замовлення
        </button>
        <a href="index.html" class="btn btn-ghost btn-full" style="margin-top:10px">
          ← Продовжити покупки
        </a>
      </div>
    </div>`;
}

// Змінити кількість товару
function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    removeFromCart(id);
    return;
  }

  saveCart(cart);
  renderCart();
}

// Видалити товар
function removeFromCart(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  renderCart();
  showToast('🗑️ Товар видалено з кошика');
}

// Оформити замовлення
async function placeOrder() {
  if (!isLoggedIn()) {
    showToast('⚠️ Спочатку увійдіть в акаунт', 'error');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }

  const cart   = getCart();
  const method = document.getElementById('deliveryMethod')?.value;
  const paymentMethod = document.getElementById('paymentMethod')?.value;
  const city   = document.getElementById('deliveryCity')?.value.trim();
  const branch = document.getElementById('deliveryBranch')?.value.trim();
  const name   = document.getElementById('deliveryName')?.value.trim();
  const phone  = document.getElementById('deliveryPhone')?.value.trim();
  const notes  = document.getElementById('orderNotes')?.value.trim();

  if (!city) {
    showToast('⚠️ Вкажіть місто', 'error');
    return;
  }
  if (!branch) {
    showToast('⚠️ Вкажіть номер відділення', 'error');
    return;
  }
  if (!name) {
    showToast('⚠️ Вкажіть ПІБ отримувача', 'error');
    return;
  }
  if (!phone) {
    showToast('⚠️ Вкажіть телефон отримувача', 'error');
    return;
  }

  const methodLabels = {
    nova_poshta: 'Нова Пошта',
    ukrposhta:   'Укрпошта',
    meest:       'Meest Express',
  };

  const address = `${methodLabels[method]}, м. ${city}, ${branch}, Отримувач: ${name}, Тел: ${phone}`;

  const items = cart.map(item => ({
    product_id: item.id,
    quantity:   item.quantity,
  }));

  try {
    const response = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ items, delivery_address: address, notes, payment_method: paymentMethod }),
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(`❌ ${data.error}`, 'error');
      return;
    }

    saveCart([]);
    showToast('🎉 Замовлення оформлено успішно!', 'success');
    setTimeout(() => window.location.href = 'cabinet.html', 1500);

  } catch (err) {
    showToast('❌ Помилка підключення до сервера', 'error');
  }
}

// Запускаємо рендер кошика
document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  updateCartCount();
});