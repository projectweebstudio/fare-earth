const SESSION_CACHE_KEY = 'usstore_products_v2';
let _productsCache = null;
let _productsPromise = null;

async function getAllProducts() {
    if (_productsCache) {
        return _productsCache;
    }

    try {
        const sessionRaw = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (sessionRaw) {
            const parsed = JSON.parse(sessionRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                _productsCache = parsed;
                return _productsCache;
            }
        }
    } catch (_) { }

    if (_productsPromise) {
        return _productsPromise;
    }

    _productsPromise = _loadProductsFromJSON();
    try {
        _productsCache = await _productsPromise;
        try {
            sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(_productsCache));
        } catch (_) { }
        return _productsCache;
    } finally {
        _productsPromise = null;
    }
}

async function _loadProductsFromJSON() {
    const jsonUrl = (typeof CONFIG !== 'undefined' && CONFIG.PRODUCTS_JSON_URL)
        ? CONFIG.PRODUCTS_JSON_URL
        : 'products.json';

    try {
        const response = await fetch(jsonUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Failed to load products.json: HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data && data.success && Array.isArray(data.products)) {
            data.products.forEach(p => {
                if (p.category) {
                    p.category = p.category.trim();
                }
            });
            return data.products;
        }

        throw new Error('products.json has an unexpected format');
    } catch (error) {
        console.warn('ProductService: Failed to load products.json, using fallback data.', error);
        return _getFallbackProducts();
    }
}

function _getFallbackProducts() {
    return [
        { productId: "P001", productName: "Racing Gaming Chair", category: "", price: 249.99, rating: 4.5, reviews: 120, image: "https://i.ibb.co/0jbdbpK8/racing.jpg", description: "Ergonomic racing-style gaming chair with adjustable armrests and lumbar support.", trending: "", status: "Active" },
        { productId: "P002", productName: "Gaming Chair", category: "", price: 299.99, rating: 4.3, reviews: 222, image: "https://i.ibb.co/R4z651Ht/cahirrr.jpg", description: "SHARP Leatherette Gaming Chair – Blue", trending: "", status: "Active" },
        { productId: "P003", productName: "Bossin Gaming Chair with Footrest and Massage", category: "", price: 219.99, rating: 5, reviews: 28, image: "https://i.ibb.co/jvzRhp2n/Bossin.jpg", description: "A comfortable gaming chair with footrest and massage feature, available in multiple colors.", trending: "", status: "Active" },
        { productId: "P004", productName: "Premium Gaming Chair", category: "", price: 199.99, rating: 5, reviews: 25, image: "https://i.ibb.co/tpqfSKDY/cahitp.jpg", description: "Bestseller Chair in the USA. International Quality checks. Sold in 15 countries worldwide.", trending: "yes", status: "Active" }
    ];
}

async function fetchProductsData() {
    const products = await getAllProducts();
    return {
        success: true,
        count: products.length,
        products: products
    };
}

async function getProductById(productId) {
    const products = await getAllProducts();
    return products.find(p => p.productId === productId) || null;
}

async function getProductsByCategory(category) {
    const products = await getAllProducts();
    const cat = String(category).toLowerCase().trim();
    return products.filter(p => String(p.category).toLowerCase().trim() === cat);
}

async function getTrendingProducts() {
    const products = await getAllProducts();
    return products.filter(p => String(p.trending).toLowerCase() === 'yes');
}

async function searchProducts(keyword) {
    const products = await getAllProducts();
    const kw = String(keyword).toLowerCase();
    return products.filter(p =>
        p.productName.toLowerCase().includes(kw) ||
        p.category.toLowerCase().includes(kw)
    );
}