
// Отримуємо id товару з URL
// Наприклад: product.html?id=5 → id = 5
function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

async function loadProduct() {
  const id      = getProductId();
  const content = document.getElementById('productContent');

  if (!id) {
    content.innerHTML = `
      <div style="text-align:center;padding:80px 20px">
        <div style="font-size:3rem;margin-bottom:16px">❌</div>
        <div style="font-weight:700;font-size:1.1rem;margin-bottom:16px">Товар не знайдено</div>
        <a href="index.html" class="btn btn-primary">Повернутись до каталогу</a>
      </div>`;
    return;
  }

  try {
    const res  = await fetch(`${API}/products/${id}`);
    const data = await res.json();

    if (!res.ok) {
      content.innerHTML = `
        <div style="text-align:center;padding:80px 20px">
          <div style="font-size:3rem;margin-bottom:16px">😔</div>
          <div style="font-weight:700;font-size:1.1rem;margin-bottom:16px">Товар не знайдено</div>
          <a href="index.html" class="btn btn-primary">Повернутись до каталогу</a>
        </div>`;
      return;
    }

    const product = data.product;
    const icon    = CATEGORY_ICONS[product.category_name] || '📦';
    const price   = Number(product.price).toLocaleString('uk-UA');

    // Оновлюємо хлібні крихти
    document.getElementById('breadcrumbCategory').textContent = product.category_name || 'Категорія';
    document.getElementById('breadcrumbProduct').textContent  = product.name;
    document.title = `${product.name} — ShopUA`;

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start">

        <!-- ФОТО ТОВАРУ -->
        <div style="background:linear-gradient(135deg,var(--surface-2) 0%,var(--primary-soft) 100%);
                    border-radius:var(--radius-lg);
                    height:400px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:10rem;
                    position:relative;
                    overflow:hidden;
                    box-shadow:var(--shadow-md)">
          ${product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}"
                    style="width:100%;height:100%;object-fit:contain;padding:16px;background:#fff;border-radius:var(--radius-lg)">`
            : `<span style="filter:drop-shadow(0 8px 24px rgba(0,0,0,.15))">${icon}</span>`
          }
        </div>

        <!-- ІНФО ТОВАРУ -->
        <div>
          <div style="font-size:.8rem;font-weight:800;text-transform:uppercase;
                      letter-spacing:1px;color:var(--primary);margin-bottom:8px">
            ${product.category_name || ''}
          </div>

          <h1 style="font-size:1.8rem;font-weight:800;letter-spacing:-.5px;
                     line-height:1.2;margin-bottom:16px;color:var(--text)">
            ${product.name}
          </h1>

          <div style="font-size:1rem;color:var(--text-2);line-height:1.6;margin-bottom:24px">
            ${product.description || 'Опис товару відсутній'}
          </div>

          <!-- СТАТУС -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            ${product.stock > 0
              ? `<span style="display:flex;align-items:center;gap:6px;color:var(--success);font-weight:700">
                   <span style="width:8px;height:8px;border-radius:50%;background:var(--success);
                                box-shadow:0 0 8px var(--success);display:inline-block"></span>
                   В наявності (${product.stock} шт.)
                 </span>`
              : `<span style="display:flex;align-items:center;gap:6px;color:var(--danger);font-weight:700">
                   <span style="width:8px;height:8px;border-radius:50%;background:var(--danger);display:inline-block"></span>
                   Немає в наявності
                 </span>`
            }
          </div>

          <!-- ЦІНА -->
          <div style="font-size:2.5rem;font-weight:800;letter-spacing:-1px;
                      color:var(--text);margin-bottom:28px">
            ${price} <span style="font-size:1.2rem;color:var(--text-3);font-weight:600">₴</span>
          </div>

          <!-- КІЛЬКІСТЬ ТА КНОПКА -->
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
            <div style="display:flex;align-items:center;gap:8px;
                        background:var(--surface-2);border-radius:var(--radius-sm);padding:4px">
              <button class="qty-btn" onclick="changeProductQty(-1)">−</button>
              <span class="qty-num" id="productQty">1</span>
              <button class="qty-btn" onclick="changeProductQty(1)">+</button>
            </div>

            ${product.stock > 0
              ? `<button class="btn btn-primary" style="flex:1;padding:14px"
                         onclick="addToCartFromProduct(${product.id}, '${product.name.replace(/'/g,"\\'")}', ${product.price})">
                   🛒 Додати до кошика
                 </button>`
              : `<button class="btn" disabled
                         style="flex:1;padding:14px;background:var(--surface-2);color:var(--text-3);cursor:not-allowed">
                   Немає в наявності
                 </button>`
            }
          </div>

          <a href="cart.html" class="btn btn-outline btn-full" style="padding:14px">
            Перейти до кошика →
          </a>

          <!-- ХАРАКТЕРИСТИКИ -->
          <div style="margin-top:28px;padding-top:24px;border-top:2px solid var(--border)">
            <div style="font-weight:800;margin-bottom:14px;font-size:.95rem;text-transform:uppercase;
                        letter-spacing:.5px;color:var(--text-3)">Характеристики</div>
            <div style="display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;justify-content:space-between;padding:10px 0;
                          border-bottom:1px solid var(--border);font-size:.92rem">
                <span style="color:var(--text-3);font-weight:600">Категорія</span>
                <span style="font-weight:700">${product.category_name || '—'}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;
                          border-bottom:1px solid var(--border);font-size:.92rem">
                <span style="color:var(--text-3);font-weight:600">Артикул</span>
                <span style="font-weight:700">#${product.id}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;
                          font-size:.92rem">
                <span style="color:var(--text-3);font-weight:600">Наявність</span>
                <span style="font-weight:700;color:${product.stock > 0 ? 'var(--success)' : 'var(--danger)'}">
                  ${product.stock > 0 ? `${product.stock} шт.` : 'Немає'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>`;

  } catch (err) {
    content.innerHTML = `
      <div style="text-align:center;padding:80px 20px;color:var(--danger)">
        <div style="font-size:2rem;margin-bottom:12px">❌</div>
        <div style="font-weight:600">Помилка завантаження товару</div>
      </div>`;
  }
}

// Зміна кількості на сторінці товару
let productQty = 1;

function changeProductQty(delta) {
  productQty = Math.max(1, productQty + delta);
  document.getElementById('productQty').textContent = productQty;
}

// Додати до кошика з вибраною кількістю
function addToCartFromProduct(id, name, price) {
  if (!isLoggedIn()) {
    showToast('⚠️ Спочатку увійдіть в акаунт', 'error');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }

  const cart     = getCart();
  const existing = cart.find(item => item.id === id);

  if (existing) {
    existing.quantity += productQty;
  } else {
    cart.push({ id, name, price: Number(price), quantity: productQty });
  }

  saveCart(cart);
  showToast(`✅ "${name}" (${productQty} шт.) додано до кошика`, 'success');
  updateCartCount();
}

document.addEventListener('DOMContentLoaded', () => {
  loadProduct();
  updateCartCount();
});