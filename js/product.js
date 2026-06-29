document.addEventListener("DOMContentLoaded", loadProduct);

function showProductSkeleton() {
    document.getElementById("product-details").innerHTML = `
        <div class="product-detail-container">
            <div class="product-image-section">
                <div class="skeleton-image-detail"></div>
            </div>
            <div class="product-info-section" style="display:flex;flex-direction:column;gap:16px;">
                <div class="skeleton-title-detail"></div>
                <div class="skeleton-desc-detail-1"></div>
                <div class="skeleton-desc-detail-2"></div>
                <div class="skeleton-desc-detail-3"></div>
                <div class="skeleton-rating-detail"></div>
                <div class="skeleton-price-detail"></div>
                <div class="skeleton-btn-detail"></div>
            </div>
        </div>
    `;
}

async function loadProduct() {
    const params    = new URLSearchParams(window.location.search);
    const productId = params.get("id");
    const container = document.getElementById("product-details");

    if (!productId) {
        container.innerHTML = `
            <div style="text-align:center;padding:80px 20px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b9935a" stroke-width="1.5" style="margin-bottom:16px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <h2 style="font-size:1.5rem;margin:0 0 8px;">Product Not Found</h2>
                <p style="color:#64748b;margin:0 0 24px;">No product ID was provided.</p>
                <a href="shop" class="btn btn-primary">Browse Shop</a>
            </div>`;
        return;
    }

    showProductSkeleton();

    try {
        const product = await getProductById(productId);

        if (!product) {
            throw new Error("Product not found");
        }

        renderProduct(product);

    } catch (error) {
        console.error("Product load error:", error);
        container.innerHTML = `
            <div style="text-align:center;padding:80px 20px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" style="margin-bottom:16px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <h2 style="font-size:1.5rem;margin:0 0 8px;">Unable to Load Product</h2>
                <p style="color:#64748b;margin:0 0 24px;">Something went wrong. Please try again.</p>
                <a href="shop" class="btn btn-primary">Back to Shop</a>
            </div>`;
    }
}

function renderProduct(product) {
    const starSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#b9935a" style="vertical-align:middle;display:inline-block;"><path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/></svg>`;
    const safeName = product.productName.replace(/'/g, "\\'");

    document.getElementById("product-details").innerHTML = `
        <div class="product-detail-container">
            <div class="product-image-section">
                <img
                    src="${product.image}"
                    alt="${product.productName}"
                    class="product-detail-image">
            </div>
            <div class="product-info-section">
                <span class="product-detail-category">${product.category || ""}</span>
                <h1>${product.productName}</h1>
                <p class="product-description">${product.description || "Discover this premium product."}</p>
                <div class="product-rating">
                    ${starSvg}
                    <span style="vertical-align:middle;margin-left:4px;">${product.rating} <span style="color:#94a3b8;">(${product.reviews} reviews)</span></span>
                </div>
                <div class="product-price">
                    <h2>$${Number(product.price).toFixed(2)}</h2>
                    <span class="product-price-label">Free shipping on orders over $100</span>
                </div>
                <div class="product-actions">
                    <div class="cart-btn-wrapper" data-id="${product.productId}" data-name="${safeName}" data-price="${product.price}" data-image="${product.image}" data-is-detail="true"></div>
                    <button
                        class="btn"
                        style="background:var(--accent); color:#fff;"
                        id="buy-now-btn"
                        onclick="buyNow('${product.productId}', '${safeName}', ${product.price}, '${product.image}')">
                        Buy Now
                    </button>
                <a href="shop" class="btn btn-outline" style="color:#52525b;border-color:#e4e4e7;background:transparent;">
                        Continue Shopping
                    </a>
                </div>
            </div>
        </div>
    `;

    document.title = `${product.productName} | Fare Earth`;

    if (typeof syncCartButtons === "function") {
        syncCartButtons();
    }

    loadRelatedProducts(product.category, product.productId);
}

async function loadRelatedProducts(category, currentProductId) {
    try {
        const result = await fetchProductsData();
        if (result && result.success && Array.isArray(result.products)) {
            const related = result.products.filter(p => 
                p.category && 
                category && 
                p.category.toLowerCase().trim() === category.toLowerCase().trim() && 
                p.productId !== currentProductId
            ).slice(0, 4);
            if (related.length > 0) {
                renderRelatedProducts(related);
            }
        }
    } catch (err) {
        console.error("Failed to load related products:", err);
    }
}

function renderRelatedProducts(products) {
    const section = document.getElementById("related-products-section");
    const container = document.getElementById("related-products");
    if (!section || !container) return;

    container.innerHTML = "";
    const starSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#b9935a" style="margin-right:2px; vertical-align:middle; display:inline-block;"><path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/></svg>`;

    products.forEach(product => {
        const safeName = product.productName.replace(/'/g, "\\'");
        container.innerHTML += `
        <div class="product-card">
            <a href="product?id=${product.productId}" class="image-wrapper" aria-label="View details of ${product.productName}">
                <img
                    src="${product.image}"
                    alt="${product.productName}"
                    class="product-image"
                    loading="lazy">
            </a>
            <div class="product-card-info">
                <span class="category">${product.category}</span>
                <a href="product?id=${product.productId}" style="text-decoration:none;">
                    <h3>${product.productName}</h3>
                </a>
                <div class="meta-row">
                    <div class="rating">
                        ${starSvg}
                        <span>${product.rating || "5.0"} (${product.reviews || 0})</span>
                    </div>
                    <span class="price">$${Number(product.price).toFixed(2)}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-buy-now" onclick="buyNow('${product.productId}', '${safeName}', ${product.price}, '${product.image}')">Buy Now</button>
                    <div class="cart-btn-wrapper" data-id="${product.productId}" data-name="${safeName}" data-price="${product.price}" data-image="${product.image}"></div>
                </div>
            </div>
        </div>
        `;
    });

    section.style.display = "block";
    initLazyLoadImages();

    if (typeof syncCartButtons === "function") {
        syncCartButtons();
    }
}