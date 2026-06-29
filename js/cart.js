document.addEventListener("DOMContentLoaded", loadCart);

function loadCart() {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const items = document.getElementById("cart-items");
    const checkoutButton = document.querySelector('a.btn[href="checkout"]');
    let subtotal = 0;
    items.innerHTML = "";

    if (!cart.length) {
        items.innerHTML = `
            <div class="card" style="text-align: center; padding: 60px 20px; border-radius: 24px; border: 1px solid var(--border);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" style="margin-bottom: 16px; display: inline-block;">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <h3 style="font-size: 1.25rem; margin: 0 0 8px 0;">Your cart is empty</h3>
                <p style="color: var(--muted); margin: 0 0 24px 0;">Start browsing our premium collections to add items to your cart.</p>
                <a href="shop" class="btn btn-primary">Start Shopping</a>
            </div>
        `;
        if (checkoutButton) {
            checkoutButton.style.display = "none";
        }
        document.getElementById("cart-summary").innerHTML = "";
        return;
    }

    cart.forEach(item => {
        subtotal += item.price * item.qty;

        items.innerHTML += `
            <div class="cart-item card" style="display: flex; gap: 20px; align-items: center; padding: 20px; margin-bottom: 16px; border: 1px solid var(--border); border-radius: 16px;">
                <img src="${item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); background-color: var(--surface-soft);">
                <div style="flex-grow: 1;">
                    <h3 style="margin: 0 0 6px 0; font-size: 1.05rem; font-weight: 600; color: var(--primary);">${item.name}</h3>
                    <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                        <span style="font-size: 1.1rem; font-weight: 700; color: var(--primary);">$${item.price.toFixed(2)}</span>
                        <span style="font-size: 0.9rem; color: var(--muted);">Qty: ${item.qty}</span>
                    </div>
                </div>
                <button class="btn btn-secondary" style="padding: 10px 20px; font-size: 0.85rem; border-radius: 8px; background: transparent; border: 1px solid var(--border); color: var(--muted); cursor: pointer;" onclick="removeItem('${item.id}')">Remove</button>
            </div>
        `;
    });

    const tax = subtotal * CONFIG.TAX_RATE / 100;
    const shipping = subtotal >= CONFIG.FREE_SHIPPING_ABOVE ? 0 : CONFIG.SHIPPING_CHARGE;
    const total = subtotal + tax + shipping;

    document.getElementById("cart-summary").innerHTML = `
        <div class="card" style="padding:24px;">
            <h3>Subtotal: $${subtotal.toFixed(2)}</h3>
            <p>Tax: $${tax.toFixed(2)}</p>
            <p>Shipping: $${shipping.toFixed(2)}</p>
            <h2>Total: $${total.toFixed(2)}</h2>
        </div>
    `;

    if (checkoutButton) {
        checkoutButton.style.display = "inline-flex";
    }
}

function removeItem(id) {
    let cart = JSON.parse(localStorage.getItem("cart") || "[]");
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem("cart", JSON.stringify(cart));
    loadCart();
    updateCartCount();
}