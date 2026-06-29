document.addEventListener("DOMContentLoaded", () => {
    try {
        const sessionRaw = sessionStorage.getItem('usstore_products_v2');
        if (sessionRaw) {
            const parsed = JSON.parse(sessionRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                renderProducts(parsed);
            }
        }
    } catch (_) { }

    loadHomeProducts();
    initHeroSlider();
});

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides.length) return;

    let currentIndex = 0;
    slides[0].classList.add('active');

    setInterval(() => {
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, 2000);
}

async function loadHomeProducts() {
    try {
        const result = await fetchProductsData();

        if (!result || !result.success) {
            console.error("Failed to load products");
            return;
        }

        renderProducts(result.products);
    } catch (error) {
        console.error("Product loading error:", error);
    }
}

let _renderTimeoutIds = [];

function renderProducts(products) {
    _renderTimeoutIds.forEach(id => clearTimeout(id));
    _renderTimeoutIds = [];

    const trending = document.getElementById("trending-products");

    if (!trending) return;

    trending.innerHTML = "";

    const starSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#b9935a" style="margin-right:2px; vertical-align:middle; display:inline-block;"><path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/></svg>`;

    function cardHTML(product) {
        const safeName = product.productName.replace(/'/g, "\\'");
        return `
        <div class="product-card">
            <a href="product?id=${product.productId}" class="image-wrapper" aria-label="View details of ${product.productName}">
                <img src="${product.image}" alt="${product.productName}" class="product-image" loading="lazy">
            </a>
            <div class="product-card-info">
                <span class="category">${product.category}</span>
                <a href="product?id=${product.productId}" style="text-decoration:none;">
                    <h3>${product.productName}</h3>
                </a>
                <div class="meta-row">
                    <div class="rating">${starSvg}<span>${product.rating} (${product.reviews})</span></div>
                    <span class="price">$${Number(product.price).toFixed(2)}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-buy-now" onclick="buyNow('${product.productId}', '${safeName}', ${product.price}, '${product.image}')">Buy Now</button>
                    <div class="cart-btn-wrapper" data-id="${product.productId}" data-name="${safeName}" data-price="${product.price}" data-image="${product.image}"></div>
                </div>
            </div>
        </div>`;
    }
    
    const allProductCards = products.map(cardHTML);

    let delay = 20;
    allProductCards.forEach(html => {
        const id = setTimeout(() => {
            trending.innerHTML += html;
            if (typeof initLazyLoadImages === "function") initLazyLoadImages();
            if (typeof syncCartButtons === "function") syncCartButtons();
            const idx = _renderTimeoutIds.indexOf(id);
            if (idx !== -1) _renderTimeoutIds.splice(idx, 1);
        }, delay);
        _renderTimeoutIds.push(id);
        delay += 20;
    });
}