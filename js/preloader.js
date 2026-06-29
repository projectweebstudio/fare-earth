(function () {
    'use strict';

    const KEY = 'fye_preloader_shown';
    const isHP = location.pathname === '/' || location.pathname === '/index.html' ||
        location.pathname.endsWith('/Fly-on-earth/') || location.pathname.endsWith('/Fly-on-earth');

    if (!isHP || localStorage.getItem(KEY)) return;

    document.write(
        '<div id="preloader-overlay">' +
            '<div class="preloader-glass-container" id="preloader-glass">' +
                '<div class="preloader-logo" id="preloader-logo">' +
                    '<img src="images/logop.png" alt="Fare Earth" style="width:56px;height:56px;border-radius:50%;object-fit:cover;box-shadow:0 2px 16px rgba(255,215,0,0.15)">' +
                '</div>' +
                '<div class="preloader-tagline" id="preloader-tagline">' +
                    '<div class="preloader-tagline-main">Dominate Every Game</div>' +
                    '<div class="preloader-tagline-sub">Fare Earth — Premium Gaming Chair</div>' +
                '</div>' +
                '<div class="preloader-bar" id="preloader-bar">' +
                    '<div class="preloader-bar-fill" id="preloader-bar-fill"></div>' +
                '</div>' +
            '</div>' +
        '</div>'
    );

    let productsData = null;
    let productsFetched = false;
    let renderStarted = false;
    let preloaderDone = false;
    let timeoutExpired = false;

    function hidePreloader() {
        if (preloaderDone) return;
        preloaderDone = true;
        var overlay = document.getElementById('preloader-overlay');
        if (overlay) overlay.classList.add('hidden');
        setTimeout(function () {
            var el = document.getElementById('preloader-overlay');
            if (el && el.parentNode) el.parentNode.removeChild(el);
        }, 1000);
        localStorage.setItem(KEY, 'true');
    }

    function checkAndHide() {
        if (productsFetched && renderStarted && !preloaderDone) {
            // Small delay so the bar fill animation completes
            setTimeout(hidePreloader, 400);
        } else if (timeoutExpired && !preloaderDone) {
            hidePreloader();
        }
    }

    async function fetchProducts() {
        try {
            const url = (typeof CONFIG !== 'undefined' && CONFIG.PRODUCTS_JSON_URL)
                ? CONFIG.PRODUCTS_JSON_URL
                : 'products.json';
            const resp = await fetch(url, { method: 'GET' });
            const data = await resp.json();
            if (data && data.success && Array.isArray(data.products)) {
                productsData = data.products;
                try { sessionStorage.setItem('usstore_products_v2', JSON.stringify(productsData)); } catch (_) {}
            }
        } catch (e) {
            console.warn('Preloader fetch error:', e);
            productsData = [
                { productId: "P001", productName: "ErgoStealth Pro Gaming Chair", category: "GAMING CHAIR", price: 499, rating: 4.8, reviews: 320, image: "https://i.ibb.co/m1fzy1y/watch.jpg", description: "Premium ergonomic gaming chair with lumbar support.", trending: "Yes", status: "Active" },
                { productId: "P002", productName: "Titan Elite Racing Seat", category: "GAMING CHAIR", price: 599, rating: 4.7, reviews: 215, image: "https://i.ibb.co/nMpmGK8R/beauty.jpg", description: "Race-inspired design meets all-day comfort.", trending: "Yes", status: "Active" },
                { productId: "P003", productName: "Nebula Cloud Chair", category: "GAMING CHAIR", price: 449, rating: 4.9, reviews: 180, image: "https://i.ibb.co/Y4FTLk0h/giftb4.jpg", description: "Cloud-soft cushioning for marathon sessions.", trending: "", status: "Active" },
                { productId: "P004", productName: "Apex Series Gaming Throne", category: "GAMING CHAIR", price: 699, rating: 5, reviews: 95, image: "https://i.ibb.co/C5x4J6pQ/tingo2t.jpg", description: "The ultimate throne for competitive gamers.", trending: "Yes", status: "Active" }
            ];
        }
        productsFetched = true;
        checkAndHide();
        tryRenderProducts();
    }

    function tryRenderProducts() {
        if (!productsData || renderStarted || !document.getElementById('featured-products')) return;
        renderStarted = true;
        renderProductsProgressive();
        checkAndHide();
    }

    function renderProductsProgressive() {
        var featured = document.getElementById('featured-products');
        var trending = document.getElementById('trending-products');
        if (!featured || !trending) return;

        featured.innerHTML = '';
        trending.innerHTML = '';

        var star = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#b9935a" style="margin-right:2px;vertical-align:middle;display:inline-block"><path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/></svg>';

        function cardHTML(p) {
            var n = p.productName.replace(/'/g, "\\'");
return '<div class="product-card"><a href="product?id=' + p.productId + '" class="image-wrapper" aria-label="' + p.productName + '"><img src="' + p.image + '" alt="' + p.productName + '" class="product-image" loading="lazy"></a><div class="product-card-info"><span class="category">' + p.category + '</span><a href="product?id=' + p.productId + '" style="text-decoration:none"><h3>' + p.productName + '</h3></a><div class="meta-row"><div class="rating">' + star + '<span>' + p.rating + ' (' + p.reviews + ')</span></div><span class="price">$' + Number(p.price).toFixed(2) + '</span></div><div class="card-actions"><button class="btn-buy-now" onclick="buyNow(\'' + p.productId + '\',\'' + n + '\',' + p.price + ',\'' + p.image + '\')">Buy Now</button><div class="cart-btn-wrapper" data-id="' + p.productId + '" data-name="' + n + '" data-price="' + p.price + '" data-image="' + p.image + '"></div></div></div></div>';
        }

        var featuredCards = productsData.slice(0, 8).map(cardHTML);
        var trendingCards = productsData.filter(function(p) { return p.trending === 'Yes'; }).map(cardHTML);

        featured.innerHTML = featuredCards.join('');
        if (typeof initLazyLoadImages === 'function') initLazyLoadImages();
        if (typeof syncCartButtons === 'function') syncCartButtons();
        if (typeof updateCartCount === 'function') updateCartCount();

        var delay = 20;
        trendingCards.forEach(function(html) {
            setTimeout(function() {
                trending.innerHTML += html;
                if (typeof initLazyLoadImages === 'function') initLazyLoadImages();
                if (typeof syncCartButtons === 'function') syncCartButtons();
                if (typeof updateCartCount === 'function') updateCartCount();
            }, delay);
            delay += 20;
        });
    }

    function waitForBody(cb) {
        if (document.body) { cb(); return; }
        var i = setInterval(function () {
            if (document.body) { clearInterval(i); cb(); }
        }, 5);
    }

    waitForBody(function () {
        var logo = document.getElementById('preloader-logo');
        var tagline = document.getElementById('preloader-tagline');
        var bar = document.getElementById('preloader-bar');
        var fill = document.getElementById('preloader-bar-fill');

        fetchProducts();

        setTimeout(function () { if (logo) logo.classList.add('visible'); }, 200);
        setTimeout(function () { if (tagline) tagline.classList.add('visible'); }, 500);
        setTimeout(function () {
            if (bar) bar.classList.add('active');
            if (fill) fill.style.width = '100%';
        }, 300);

        // Max 3 seconds fallback — hide preloader if products still haven't loaded
        setTimeout(function () {
            timeoutExpired = true;
            checkAndHide();
        }, 3000);
    });

})();