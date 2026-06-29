let allProducts = [];

document.addEventListener(
"DOMContentLoaded",
() => {

loadProducts();

document
.getElementById("search")
.addEventListener(
"input",
filterProducts
);

document
.getElementById("category")
.addEventListener(
"change",
filterProducts
);

document
.getElementById("sort")
.addEventListener(
"change",
filterProducts
);

}
);

async function loadProducts(){

    const result =
        await fetchProductsData();

    if(result.success){

        allProducts =
            result.products;

        populateCategories();

        renderProducts(
            allProducts
        );

    } else {
        console.error(result.message || "Failed to load products");
    }

}

function populateCategories(){

const category =
document.getElementById(
"category"
);

const categories =
[
...new Set(
allProducts.map(
p => p.category
)
)
];

categories.forEach(cat => {

category.innerHTML +=

`<option value="${cat}">
${cat}
</option>`;

});

}

function filterProducts(){

let products =
[...allProducts];

const search =
document
.getElementById("search")
.value
.toLowerCase();

const category =
document
.getElementById("category")
.value;

const sort =
document
.getElementById("sort")
.value;

    if(search){

        products =
        products.filter(
            p =>
p.productName
.toLowerCase()
.includes(search)
);

}

if(category){

products =
products.filter(
p =>
p.category === category
);

}

if(sort==="low"){

products.sort(
(a,b)=>
a.price-b.price
);

}

if(sort==="high"){

products.sort(
(a,b)=>
b.price-a.price
);

}

renderProducts(products);

}

function renderProducts(products) {
    const container = document.getElementById("shop-products");
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

    // Initialize lazy loading for newly added images
    initLazyLoadImages();

    // Sync cart buttons with the cart
    if (typeof syncCartButtons === "function") {
        syncCartButtons();
    }
}