document.addEventListener(
"DOMContentLoaded",
initCheckout
);

function initCheckout(){

renderSummary();

document
.getElementById("checkout-form")
.addEventListener("submit", placeOrder);

// Clear validation errors on input
document.querySelectorAll("#checkout-form input").forEach(input => {
    input.addEventListener("input", function() {
        clearFieldError(this.id);
    });
    input.addEventListener("change", function() {
        clearFieldError(this.id);
    });
});

// Clear terms error on change
document.getElementById("agree-terms")?.addEventListener("change", function() {
    document.querySelector(".terms-checkbox-wrapper")?.classList.remove("field-invalid");
});

}

function getCart() {
return JSON.parse(localStorage.getItem("cart") || "[]");
}

function saveCart(cart) {
localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
try {
if (typeof window.updateCartCount === "function") {
window.updateCartCount();
}
} catch(e) {}
}

function renderSummary(){

const cart = getCart();

const container = document.getElementById("order-summary");

if (!cart || cart.length === 0) {
container.innerHTML = `
<div class="checkout-empty">
<p>Your cart is empty.</p>
                <a href="shop" class="btn btn-primary">Browse Products</a>
</div>
`;
return;
}

let itemsHtml = '';
let subtotal = 0;

cart.forEach((item, index) => {
const itemTotal = item.price * item.qty;
subtotal += itemTotal;
const safeName = item.name;
const imgSrc = item.image || '';

itemsHtml += `
<div class="checkout-summary-item" data-index="${index}">
<img class="checkout-summary-item-img" src="${imgSrc}" alt="${safeName}" loading="lazy" onerror="this.style.display='none'">
<div class="checkout-summary-item-info">
<p class="checkout-summary-item-name">${safeName}</p>
<div class="checkout-qty-controls">
<button class="checkout-qty-btn checkout-qty-minus" data-index="${index}" type="button" aria-label="Decrease quantity">&minus;</button>
<span class="checkout-qty-value">${item.qty}</span>
<button class="checkout-qty-btn checkout-qty-plus" data-index="${index}" type="button" aria-label="Increase quantity">+</button>
</div>
</div>
<div class="checkout-summary-item-right">
<span class="checkout-summary-item-price">$${itemTotal.toFixed(2)}</span>
<button class="checkout-item-remove" data-index="${index}" type="button" aria-label="Remove item">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
</div>
</div>
`;
});

const tax =
subtotal *
CONFIG.TAX_RATE /
100;

const shipping =
subtotal >=
CONFIG.FREE_SHIPPING_ABOVE
? 0
: CONFIG.SHIPPING_CHARGE;

const total =
subtotal +
tax +
shipping;

const shippingLabel = shipping === 0 ? '<span class="checkout-summary-free">FREE</span>' : `$${shipping.toFixed(2)}`;

container.innerHTML = `
<div class="checkout-summary-items" id="checkout-items-container">
${itemsHtml}
</div>
<div class="checkout-summary-totals">
<div class="checkout-summary-total-row">
<span class="checkout-summary-total-label">Subtotal</span>
<span class="checkout-summary-total-amount">$${subtotal.toFixed(2)}</span>
</div>
<div class="checkout-summary-total-row">
<span class="checkout-summary-total-label">Tax</span>
<span class="checkout-summary-total-amount">$${tax.toFixed(2)}</span>
</div>
<div class="checkout-summary-total-row">
<span class="checkout-summary-total-label">Shipping</span>
<span class="checkout-summary-total-amount">${shippingLabel}</span>
</div>
<div class="checkout-summary-total-row total">
<span class="checkout-summary-total-label">Total</span>
<span class="checkout-summary-total-amount">$${total.toFixed(2)}</span>
</div>
</div>
`;

attachCheckoutEvents();

}

function attachCheckoutEvents() {
const container = document.getElementById("order-summary");
if (!container) return;

container.querySelectorAll(".checkout-qty-minus").forEach(btn => {
btn.addEventListener("click", function(e) {
e.stopPropagation();
const index = parseInt(this.dataset.index);
adjustQty(index, -1);
});
});

container.querySelectorAll(".checkout-qty-plus").forEach(btn => {
btn.addEventListener("click", function(e) {
e.stopPropagation();
const index = parseInt(this.dataset.index);
adjustQty(index, 1);
});
});

container.querySelectorAll(".checkout-item-remove").forEach(btn => {
btn.addEventListener("click", function(e) {
e.stopPropagation();
const index = parseInt(this.dataset.index);
removeItem(index);
});
});
}

function adjustQty(index, delta) {
let cart = getCart();
if (index < 0 || index >= cart.length) return;

cart[index].qty += delta;

if (cart[index].qty <= 0) {
cart.splice(index, 1);
}

saveCart(cart);
updateCartCount();
renderSummary();
}

function removeItem(index) {
let cart = getCart();
if (index < 0 || index >= cart.length) return;

cart.splice(index, 1);

saveCart(cart);
updateCartCount();
renderSummary();
}

// Field validation helpers
function showFieldError(fieldId, errorElementId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const parent = field.closest(".checkout-field") || field.parentElement;
    if (parent) {
        parent.classList.add("field-invalid");
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    const parent = field.closest(".checkout-field") || field.parentElement;
    if (parent) {
        parent.classList.remove("field-invalid");
    }
}

function clearAllFieldErrors() {
    document.querySelectorAll(".checkout-field.field-invalid").forEach(el => {
        el.classList.remove("field-invalid");
    });
    document.querySelector(".terms-checkbox-wrapper.field-invalid")?.classList.remove("field-invalid");
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    // Allow various phone formats: +1 (555) 000-0000, 555-000-0000, etc.
    return phone.length >= 6;
}

function validateZipcode(zip) {
    return zip.length >= 3;
}

function validateCheckoutForm() {
    let isValid = true;
    
    // Reset all errors
    clearAllFieldErrors();
    
    // Validate customer name
    const name = document.getElementById("customerName").value.trim();
    if (!name) {
        showFieldError("customerName");
        isValid = false;
    }
    
    // Validate email
    const email = document.getElementById("email").value.trim();
    if (!email || !validateEmail(email)) {
        showFieldError("email");
        isValid = false;
    }
    
    // Validate phone
    const phone = document.getElementById("phone").value.trim();
    if (!phone || !validatePhone(phone)) {
        showFieldError("phone");
        isValid = false;
    }
    
    // Validate shipping address
    const addressStreet = document.getElementById("addressStreet").value.trim();
    if (!addressStreet) {
        showFieldError("addressStreet");
        isValid = false;
    }
    
    const city = document.getElementById("city").value.trim();
    if (!city) {
        showFieldError("city");
        isValid = false;
    }
    
    const state = document.getElementById("state").value.trim();
    if (!state) {
        showFieldError("state");
        isValid = false;
    }
    
    const zipcode = document.getElementById("zipcode").value.trim();
    if (!zipcode || !validateZipcode(zipcode)) {
        showFieldError("zipcode");
        isValid = false;
    }
    
    // Validate terms
    const agreeTerms = document.getElementById("agree-terms");
    if (!agreeTerms || !agreeTerms.checked) {
        document.querySelector(".terms-checkbox-wrapper")?.classList.add("field-invalid");
        isValid = false;
    }
    
    return isValid;
}

async function placeOrder(e){

e.preventDefault();

const cart = getCart();

if(cart.length===0){
alert("Cart is empty");
return;
}

// Run client-side validation with inline errors
if (!validateCheckoutForm()) {
    // Scroll to the first error
    const firstInvalid = document.querySelector(".checkout-field.field-invalid, .terms-checkbox-wrapper.field-invalid");
    if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
}

// Show processing overlay
const overlay = document.getElementById("checkout-processing-overlay");
const btn = document.getElementById("place-order-btn");
if (overlay) overlay.classList.remove("hidden");
if (btn) btn.classList.add("processing");

function hideProcessing() {
if (overlay) overlay.classList.add("hidden");
if (btn) btn.classList.remove("processing");
}

const addressStreet = document.getElementById("addressStreet").value.trim();
const city = document.getElementById("city").value.trim();
const state = document.getElementById("state").value.trim();
const zipcode = document.getElementById("zipcode").value.trim();

if(!addressStreet || !city || !state || !zipcode){
hideProcessing();
showFieldError("addressStreet");
showFieldError("city");
showFieldError("state");
showFieldError("zipcode");
return;
}

const agreeTerms = document.getElementById("agree-terms");
if(!agreeTerms || !agreeTerms.checked){
hideProcessing();
document.querySelector(".terms-checkbox-wrapper")?.classList.add("field-invalid");
return;
}

let subtotal = 0;

cart.forEach(item=>{

subtotal +=
item.price *
item.qty;

});

const payload = {

action: "placeOrder",

customerName:
document.getElementById(
"customerName"
).value,

email:
document.getElementById(
"email"
).value,

phone:
document.getElementById(
"phone"
).value,

addressStreet:
document.getElementById(
"addressStreet"
).value.trim(),

city:
document.getElementById(
"city"
).value.trim(),

state:
document.getElementById(
"state"
).value.trim(),

zipcode:
document.getElementById(
"zipcode"
).value.trim(),

products: cart,

subtotal: subtotal

};

const response =
await fetch(
CONFIG.API_URL,
{
method:"POST",
body:JSON.stringify(
payload
)
}
);

const result =
await response.json();

if(result.success){

localStorage.removeItem(
"cart"
);

window.location.href =

            "success?orderId=" +

result.orderId;

}
else{

hideProcessing();

// Show server error as inline error on first field
renderSystemNotice(result.message || "Order could not be processed. Please try again.");

}

}

function renderSystemNotice(msg, flag = "error") {
    // Create a general error banner at the top of the form if one doesn't exist
    let banner = document.getElementById("checkout-form-alert");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "checkout-form-alert";
        banner.className = "checkout-form-alert";
        const form = document.getElementById("checkout-form");
        if (form) {
            form.prepend(banner);
        }
    }
    
    banner.className = `checkout-form-alert ${flag}`;
    banner.innerText = msg;
    
    // Scroll to the alert
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
        banner.className = "checkout-form-alert hidden";
    }, 8000);
}