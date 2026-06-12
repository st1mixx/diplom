let currentPage     = 1;
let currentCategory = '';
let searchTimeout   = null;

const CATEGORY_ICONS = {
  'Смартфони': '📱', 'Ноутбуки': '💻', 'Планшети': '📟',
  'Навушники': '🎧', 'Аксесуари': '🔌', 'Футболки': '👕',
  'Штани': '👖', 'Куртки': '🧥', 'Кросівки': '👟',
  'Електроніка': '⚡', 'Одяг': '👗',
};

async function loadCategories() {
  try {
    const res  = await fetch(`${API}/products/categories`);
    const data = await res.json();
    const container = document.getElementById('categoriesList');
    if (!container) return;
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = 'cat-btn active';
    allBtn.id = 'cat-all';
    allBtn.innerHTML = `<span class="cat-icon">🏪</span> Всі товари`;
    allBtn.onclick = () => filterCategory('', allBtn);
    container.appendChild(allBtn);

    data.categories.forEach(cat => {
      const icon = CATEGORY_ICONS[cat.name] || '📦';
      const btn  = document.createElement('button');
      btn.className = 'cat-btn';
      btn.id = `cat-${cat.id}`;
      btn.innerHTML = `<span class="cat-icon">${icon}</span> ${cat.name}`;
      btn.onclick = () => filterCategory(cat.id, btn);
      container.appendChild(btn);
    });
  } catch (err) {
    console.error('Помилка категорій:', err);
  }
}

function filterCategory(categoryId, btnEl) {
  currentCategory = categoryId;
  currentPage = 1;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  loadProducts();
}

async function loadProducts() {
  const grid   = document.getElementById('productsGrid');
  const search = document.getElementById('searchInput')?.value.trim() || '';
  const meta   = document.getElementById('catalogMeta');
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-3)">
      <div style="font-size:2rem;margin-bottom:12px">⏳</div>
      <div style="font-weight:600">Завантаження товарів...</div>
    </div>`;

  let url = `${API}/products?page=${currentPage}&limit=12`;
  if (currentCategory) url += `&category=${currentCategory}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (meta) meta.textContent = `Знайдено ${data.pagination.total} товарів`;

    if (data.products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-3)">
          <div style="font-size:3rem;margin-bottom:16px">😔</div>
          <div style="font-weight:700;font-size:1.1rem">Нічого не знайдено</div>
        </div>`;
      if (document.getElementById('pagination'))
        document.getElementById('pagination').innerHTML = '';
      return;
    }

    grid.innerHTML = data.products.map(p => createProductCard(p)).join('');
    renderPagination(data.pagination);

    grid.querySelectorAll('.product-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.transition = 'opacity .4s ease, transform .4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 50);
    });

  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--danger)">
        ❌ Помилка завантаження товарів
      </div>`;
  }
}

function createProductCard(product) {
  const icon  = CATEGORY_ICONS[product.category_name] || '📦';
  const price = Number(product.price).toLocaleString('uk-UA');

  const stockHtml = product.stock > 0
    ? `<div class="product-stock" style="color:var(--success)">
         <span class="stock-dot in"></span> В наявності (${product.stock} шт.)
       </div>`
    : `<div class="product-stock" style="color:var(--danger)">
         <span class="stock-dot out"></span> Немає в наявності
       </div>`;

  const cartBtn = product.stock > 0
    ? `<button class="btn-cart" onclick="addToCart(${product.id}, '${product.name.replace(/'/g,"\\'")}', ${product.price}); event.stopPropagation()">
         🛒 До кошика
       </button>`
    : `<button class="btn-cart-disabled" disabled>Немає</button>`;

  return `
    <div class="product-card" onclick="window.location='product.html?id=${product.id}'" style="cursor:pointer">
      <div class="product-img">
        <span class="product-emoji">${product.image_url
          ? `<img src="${product.image_url}" style="width:100%;height:100%;object-fit:cover">`
          : icon}</span>
      </div>
      <div class="product-body">
        <div class="product-category">${product.category_name || 'Без категорії'}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-desc">${product.description || ''}</div>
        ${stockHtml}
        <div class="product-footer">
          <div class="product-price">${price} <span>₴</span></div>
          ${cartBtn}
        </div>
      </div>
    </div>`;
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!container) return;
  if (currentCategory !== '' || pagination.pages <= 1) {
    container.innerHTML = '';
    return;
  }
  let html = '';
  if (currentPage > 1)
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">←</button>`;
  for (let i = 1; i <= pagination.pages; i++)
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  if (currentPage < pagination.pages)
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">→</button>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getCart()      { return JSON.parse(localStorage.getItem('cart') || '[]'); }
function saveCart(cart) { localStorage.setItem('cart', JSON.stringify(cart)); updateCartCount(); }

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

function addToCart(id, name, price) {
  if (!isLoggedIn()) {
    showToast('⚠️ Спочатку увійдіть в акаунт', 'error');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }
  const cart = getCart();
  const existing = cart.find(item => item.id === id);
  if (existing) existing.quantity++;
  else cart.push({ id, name, price: Number(price), quantity: 1 });
  saveCart(cart);
  showToast(`✅ "${name}" додано до кошика`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadProducts();
      }, 400);
    });
  }
  if (document.getElementById('productsGrid')) {
    loadCategories();
    loadProducts();
  }
  updateCartCount();
});