let ordersData = [];
let leadsData = [];
let activeAdminTab = "orders";
const ORDERS_PER_PAGE = 15;
let ordersCurrentPage = 1;
let exportCurrentPage = 1;
let ordersFilteredData = [];
let exportFilteredData = [];

const DASHBOARD_CACHE = {
    stats: null,
    orders: null,
    leads: null,
    statsTimestamp: 0,
    ordersTimestamp: 0,
    leadsTimestamp: 0
};
const CACHE_TTL = 5 * 60 * 1000;

function getCachedData(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp > CACHE_TTL) {
            sessionStorage.removeItem(key);
            return null;
        }
        return parsed.data;
    } catch {
        sessionStorage.removeItem(key);
        return null;
    }
}

function setCachedData(key, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
    }
}

function showSkeleton(id) {
    const skeleton = document.getElementById(id);
    if (skeleton) skeleton.classList.add("active");
}

function hideSkeleton(id) {
    const skeleton = document.getElementById(id);
    if (skeleton) skeleton.classList.remove("active");
}

function showCardContent(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
}

function loadCachedStats() {
    const cached = getCachedData("dashboard_stats");
    if (cached) {
        DASHBOARD_CACHE.stats = cached;
        applyStatsToDOM(cached);
        hideSkeleton("skeleton-today-orders");
        hideSkeleton("skeleton-revenue");
        hideSkeleton("skeleton-pending");
        showCardContent("today-orders");
        showCardContent("revenue");
        showCardContent("pending");
        return true;
    }
    return false;
}

function applyStatsToDOM(stats) {
    document.getElementById("today-orders").innerText = stats.todayOrders || 0;
    document.getElementById("orders-today-count").innerText = stats.todayOrders || 0;
    document.getElementById("revenue").innerText = "$" + (stats.totalRevenue || 0).toFixed(2);
    document.getElementById("pending").innerText = stats.pendingOrders || 0;
}

function safeNumeric(val) {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "string" && val.indexOf("[") === 0) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
}

function formatProductsCell(productsRaw) {
    if (!productsRaw) return "-";
    let items = [];
    if (typeof productsRaw === "string") {
        try { items = JSON.parse(productsRaw); } catch(e) { return productsRaw; }
    } else if (Array.isArray(productsRaw)) {
        items = productsRaw;
    } else {
        return String(productsRaw);
    }
    if (!items.length) return "-";
    return items.map(item => {
        const id = item.productId || item.id || "";
        const name = item.productName || item.name || "";
        return `<div style="font-size:12px;line-height:1.5;"><code style="font-size:11px;">${id}</code> — ${name}</div>`;
    }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
    if (typeof updateCartCount === "function") {
        updateCartCount();
    }

    if (location.pathname.includes("admin-login") || !location.pathname.includes("admin-dashboard")) {
        initLoginEventBindings();
    } else if (location.pathname.includes("admin-dashboard")) {
        initDashboardCore();
    }
});

function initLoginEventBindings() {
    const loginForm = document.getElementById("login-form");
    const sendOtpBtn = document.getElementById("btn-send-otp");
    const verifyOtpBtn = document.getElementById("btn-verify-otp");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            login();
        });
    }

    if (sendOtpBtn) {
        sendOtpBtn.addEventListener("click", () => sendOTP());
    }

    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener("click", () => verifyOTP());
    }
}

function renderSystemNotice(msg, flag = "error") {
    const banner = document.getElementById("auth-alert");
    if (!banner) return;

    banner.className = `alert-banner ${flag}`;
    banner.innerText = msg;
}

function clearSystemNotice() {
    const banner = document.getElementById("auth-alert");
    if (banner) banner.className = "alert-banner hidden";
}

function validateCredentialsLocal(email, password = null) {
    let isValid = true;
    
    const emailGroup = document.getElementById("email").parentElement;
    if (!email || !email.includes("@")) {
        emailGroup.classList.add("field-invalid");
        isValid = false;
    } else {
        emailGroup.classList.remove("field-invalid");
    }

    if (password !== null) {
        const passGroup = document.getElementById("password").parentElement;
        if (!password || password.length < 4) {
            passGroup.classList.add("field-invalid");
            isValid = false;
        } else {
            passGroup.classList.remove("field-invalid");
        }
    }

    return isValid;
}

async function login() {
    clearSystemNotice();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const loginBtn = document.getElementById("btn-login");

    if (!validateCredentialsLocal(email, password)) {
        renderSystemNotice("Please fix the validation errors highlighting your credential input fields.", "error");
        return;
    }

    try {
        setLoadingState(loginBtn, true, "Authenticating...");
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "adminLogin",
                email,
                password
            })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem("adminToken", result.token);
            window.location.href = "admin-dashboard";
            return;
        }

        renderSystemNotice(result.message || "Access denied. Invalid credentials provided.", "error");
    } catch (error) {
        console.error("Login error:", error);
        renderSystemNotice("Connection error. Could not contact server.", "error");
    } finally {
        setLoadingState(loginBtn, false, "Secure Sign In");
    }
}

async function sendOTP() {
    clearSystemNotice();
    const email = document.getElementById("email").value.trim();
    const otpBtn = document.getElementById("btn-send-otp");

    if (!validateCredentialsLocal(email)) {
        renderSystemNotice("Provide an enterprise email address.", "error");
        return;
    }

    try {
        setLoadingState(otpBtn, true, "Processing...");
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "sendOTP",
                email
            })
        });

        const result = await response.json();
        
        if (result.success || response.ok) {
            if (result.warning) {
                renderSystemNotice(result.message || "OTP generated but email delivery may be delayed.", "warning");
            } else {
                renderSystemNotice(result.message || "OTP sent successfully.", "success");
            }
            document.getElementById("otp-verification-zone").classList.remove("hidden");
        } else {
            renderSystemNotice(result.message || "Failed to send OTP.", "warning");
        }
    } catch (error) {
        console.error("OTP error:", error);
        renderSystemNotice("Network error while sending OTP.", "error");
    } finally {
        setLoadingState(otpBtn, false, "Request Secure One-Time Password (OTP)");
    }
}

async function verifyOTP() {
    clearSystemNotice();
    const email = document.getElementById("email").value.trim();
    const otp = document.getElementById("otp").value.trim();
    const verifyBtn = document.getElementById("btn-verify-otp");
    const otpGroup = document.getElementById("otp").parentElement.parentElement;

    if (!email || !otp) {
        otpGroup.classList.add("field-invalid");
        renderSystemNotice("Please enter email and OTP.", "error");
        return;
    }
    otpGroup.classList.remove("field-invalid");

    try {
        setLoadingState(verifyBtn, true, "...");
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "verifyOTP",
                email,
                otp
            })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem("adminToken", result.token);
            window.location.href = "admin-dashboard";
            return;
        }

        renderSystemNotice(result.message || "OTP verification failed.", "error");
    } catch (error) {
        console.error("OTP verify error:", error);
        renderSystemNotice("Connection error during OTP verification.", "error");
    } finally {
        setLoadingState(verifyBtn, false, "Verify");
    }
}

function setLoadingState(element, isLoading, textContent) {
    if (!element) return;
    element.disabled = isLoading;
    
    const textSpan = element.querySelector(".btn-text");
    const spinnerSpan = element.querySelector(".btn-spinner");
    
    if (textSpan && spinnerSpan) {
        // Button has spinner structure
        textSpan.classList.toggle("hidden", isLoading);
        spinnerSpan.classList.toggle("hidden", !isLoading);
    } else {
        // Fallback for simple buttons
        element.innerHTML = textContent;
    }
}

function logout() {
    localStorage.removeItem("adminToken");
    window.location.href = "admin-login";
}

function getAdminToken() {
    return localStorage.getItem("adminToken") || "";
}

async function authAdmin() {
    const token = getAdminToken();
    if (!token) {
        window.location.href = "admin-login";
        return false;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "validateAdminToken",
                token
            })
        });

        const result = await response.json();
        if (!result.success) {
            logout();
            return false;
        }

        const nameElement = document.getElementById("admin-name");
        if (nameElement) {
            nameElement.innerText = result.admin.name || "Admin";
        }
        return true;
    } catch (error) {
        console.error(error);
        logout();
        return false;
    }
}

function initDashboardCore() {
    authAdmin().then(isAuthenticated => {
        if (!isAuthenticated) return;

        const searchInput = document.getElementById("search-order");
        const statusInput = document.getElementById("filter-status");
        const fromDateInput = document.getElementById("filter-from");
        const toDateInput = document.getElementById("filter-to");
        const todayOrdersButton = document.getElementById("today-orders-button");
        const clearFilters = document.getElementById("clear-filters");
        const exportBtn = document.getElementById("export-button");
        const exportStatusInput = document.getElementById("export-filter-status");
        const exportFromInput = document.getElementById("export-filter-from");
        const exportToInput = document.getElementById("export-filter-to");

        searchInput?.addEventListener("input", applyFilters);
        statusInput?.addEventListener("change", applyFilters);
        fromDateInput?.addEventListener("change", applyFilters);
        toDateInput?.addEventListener("change", applyFilters);
        todayOrdersButton?.addEventListener("click", showTodayOrders);
        clearFilters?.addEventListener("click", clearOrderFilters);
        exportBtn?.addEventListener("click", downloadOrdersExport);
        exportStatusInput?.addEventListener("change", applyExportFilters);
        exportFromInput?.addEventListener("change", applyExportFilters);
        exportToInput?.addEventListener("change", applyExportFilters);

        document.getElementById("orders-tab")?.addEventListener("click", () => switchAdminTab("orders"));
        document.getElementById("leads-tab")?.addEventListener("click", () => switchAdminTab("leads"));
        document.getElementById("export-tab")?.addEventListener("click", () => switchAdminTab("export"));

        switchAdminTab(activeAdminTab);

        const cacheLoaded = loadCachedStats();
        loadDashboardStats();

        const cachedOrders = getCachedData("dashboard_orders");
        if (cachedOrders) {
            ordersData = cachedOrders;
            renderOrders(ordersData);
        }

        loadOrders();
    });
}

async function loadOrders() {
    const table = document.getElementById("orders-table");
    let loadingRow = document.getElementById("orders-loading");
    if (!loadingRow && table) {
        loadingRow = document.createElement("tr");
        loadingRow.id = "orders-loading";
        loadingRow.innerHTML = `<td colspan="12" style="text-align:center;padding:32px;"><div class="loading-spinner"></div><p style="margin-top:8px;color:#64748b;">Loading orders...</p></td>`;
        table.innerHTML = "";
        table.appendChild(loadingRow);
    } else if (loadingRow) {
        loadingRow.style.display = "";
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getOrders", token: getAdminToken() })
        });

        const result = await response.json();
        ordersData = Array.isArray(result.orders) ? result.orders : [];
        ordersData.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        setCachedData("dashboard_orders", ordersData);
        DASHBOARD_CACHE.orders = ordersData;
        renderOrders(ordersData);
    } catch (error) {
        console.error(error);
        if (loadingRow) loadingRow.style.display = "none";
        const cached = getCachedData("dashboard_orders");
        if (cached && ordersData.length === 0) {
            ordersData = cached;
            renderOrders(ordersData);
        } else if (table && ordersData.length === 0) {
            table.innerHTML = "<tr><td colspan=\"12\">Failed to load orders. Check connection.</td></tr>";
        }
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getDashboardStats", token: getAdminToken() })
        });

        const result = await response.json();
        if (result.success) {
            setCachedData("dashboard_stats", result.stats);
            DASHBOARD_CACHE.stats = result.stats;
            applyStatsToDOM(result.stats);
            hideSkeleton("skeleton-today-orders");
            hideSkeleton("skeleton-revenue");
            hideSkeleton("skeleton-pending");
            showCardContent("today-orders");
            showCardContent("revenue");
            showCardContent("pending");
        }
    } catch (error) {
        console.error(error);
    }
}

function switchAdminTab(tab) {
    activeAdminTab = tab;
    document.querySelectorAll(".dashboard-tab").forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tab);
    });
    document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.style.display = panel.id === `${tab}-panel` ? "block" : "none";
    });

    if (tab === "leads") {
        loadContactLeads();
    } else if (tab === "export") {
        applyExportFilters();
    }
}

async function loadContactLeads() {
    const cached = getCachedData("dashboard_leads");
    if (cached) {
        leadsData = cached;
        renderLeads(leadsData);
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getContactLeads", token: getAdminToken() })
        });

        const result = await response.json();
        leadsData = Array.isArray(result.leads) ? result.leads : [];
        setCachedData("dashboard_leads", leadsData);
        DASHBOARD_CACHE.leads = leadsData;
        renderLeads(leadsData);
    } catch (error) {
        console.error(error);
    }
}

function renderLeads(rows) {
    const table = document.getElementById("leads-table");
    if (!table) return;

    table.innerHTML = "";

    if (!rows.length) {
        table.innerHTML = "<tr><td colspan=\"5\">No contact submissions found.</td></tr>";
        return;
    }

    rows.forEach(lead => {
        const dateValue = lead.date ? new Date(lead.date).toLocaleString() : "";
        table.innerHTML += `
            <tr>
                <td>${dateValue}</td>
                <td><strong>${lead.name || "-"}</strong></td>
                <td>${lead.email || "-"}</td>
                <td>${lead.subject || "-"}</td>
                <td>${lead.message || "-"}</td>
            </tr>
        `;
    });
}

function applyFilters() {
    const query = document.getElementById("search-order")?.value.toLowerCase() || "";
    const status = document.getElementById("filter-status")?.value;
    const fromDate = document.getElementById("filter-from")?.value;
    const toDate = document.getElementById("filter-to")?.value;

    ordersFilteredData = ordersData.filter(order => {
        const dateValue = order.orderDate ? order.orderDate.split("T")[0] : "";
        const matchesQuery = [
            order.orderId,
            order.customerName,
            order.email,
            order.phone,
            order.address,
            order.city,
            order.state,
            order.zipcode,
            order.status,
            order.products
        ].some(field => String(field || "").toLowerCase().includes(query));

        const matchesStatus = !status || order.status === status;
        const matchesFrom = !fromDate || dateValue >= fromDate;
        const matchesTo = !toDate || dateValue <= toDate;

        return matchesQuery && matchesStatus && matchesFrom && matchesTo;
    });

    ordersCurrentPage = 1;
    renderOrders(ordersFilteredData);
}

function renderOrders(rows) {
    const table = document.getElementById("orders-table");
    const loadingRow = document.getElementById("orders-loading");
    if (loadingRow) loadingRow.style.display = "none";
    if (!table) return;

    if (rows.length > 0) {
        ordersFilteredData = rows;
    }

    const totalPages = Math.ceil(rows.length / ORDERS_PER_PAGE) || 1;
    if (ordersCurrentPage > totalPages) ordersCurrentPage = totalPages;

    const startIndex = (ordersCurrentPage - 1) * ORDERS_PER_PAGE;
    const pageRows = rows.slice(startIndex, startIndex + ORDERS_PER_PAGE);

    table.innerHTML = "";

    if (!rows.length) {
        table.innerHTML = "<tr><td colspan=\"12\">No orders match the filter criteria.</td></tr>";
        renderPagination("orders-pagination", rows.length, ordersCurrentPage, totalPages, goToOrdersPage);
        return;
    }

    pageRows.forEach(order => {
        const dateValue = order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "";
        const address = order.address || [order.addressStreet, order.city, order.state, order.zipcode].filter(Boolean).join(", ");
        const subtotal = safeNumeric(order.subtotal);
        const tax = safeNumeric(order.tax);
        const shipping = safeNumeric(order.shipping);
        const amount = safeNumeric(order.total);

        const statusOptions = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
        const statusSelect = statusOptions.map(option => `
                    <option value="${option}"${option === order.status ? " selected" : ""}>${option}</option>
                `).join("");

        const subtotalDisplay = subtotal !== null ? `$${subtotal.toFixed(2)}` : "-";
        const taxDisplay = tax !== null ? `$${tax.toFixed(2)}` : "-";
        const shippingDisplay = shipping !== null ? `$${shipping.toFixed(2)}` : "-";
        const amountDisplay = amount !== null ? `<strong>$${amount.toFixed(2)}</strong>` : "-";

        table.innerHTML += `
            <tr>
                <td><code>${order.orderId}</code></td>
                <td>${formatProductsCell(order.products)}</td>
                <td>${dateValue}</td>
                <td><strong>${order.customerName}</strong></td>
                <td>${order.email}</td>
                <td>${order.phone || "-"}</td>
                <td>${address}</td>
                <td>${subtotalDisplay}</td>
                <td>${taxDisplay}</td>
                <td>${shippingDisplay}</td>
                <td>${amountDisplay}</td>
                <td>
                    <div class="status-selector-wrapper">
                        <select class="order-status-select" onchange="handleOrderStatusChange('${order.orderId}', this.value)">
                            ${statusSelect}
                        </select>
                    </div>
                </td>
            </tr>
        `;
    });

    renderPagination("orders-pagination", rows.length, ordersCurrentPage, totalPages, goToOrdersPage);
}

function renderExportFilteredList(rows) {
    const container = document.getElementById("export-filtered-list");
    const exportLoading = document.getElementById("export-loading");
    const table = document.getElementById("export-filtered-table");
    const count = document.getElementById("export-filtered-count");
    if (!container || !table) return;

    if (exportLoading) exportLoading.style.display = "none";

    exportFilteredData = rows;
    const totalPages = Math.ceil(rows.length / ORDERS_PER_PAGE) || 1;
    if (exportCurrentPage > totalPages) exportCurrentPage = totalPages;

    const startIndex = (exportCurrentPage - 1) * ORDERS_PER_PAGE;
    const pageRows = rows.slice(startIndex, startIndex + ORDERS_PER_PAGE);

    container.style.display = rows.length ? "block" : "none";
    table.innerHTML = "";
    if (count) count.innerText = `(${rows.length} orders)`;

    if (!rows.length) {
        table.innerHTML = "<tr><td colspan=\"12\">No orders match the export filter criteria.</td></tr>";
        renderPagination("export-pagination", rows.length, exportCurrentPage, totalPages, goToExportPage);
        return;
    }

    pageRows.forEach(order => {
        const dateValue = order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "";
        const address = order.address || [order.addressStreet, order.city, order.state, order.zipcode].filter(Boolean).join(", ");
        const subtotal = safeNumeric(order.subtotal);
        const tax = safeNumeric(order.tax);
        const shipping = safeNumeric(order.shipping);
        const amount = safeNumeric(order.total);

        const subtotalDisplay = subtotal !== null ? `$${subtotal.toFixed(2)}` : "-";
        const taxDisplay = tax !== null ? `$${tax.toFixed(2)}` : "-";
        const shippingDisplay = shipping !== null ? `$${shipping.toFixed(2)}` : "-";
        const amountDisplay = amount !== null ? `<strong>$${amount.toFixed(2)}</strong>` : "-";

        table.innerHTML += `
            <tr>
                <td><code>${order.orderId}</code></td>
                <td>${formatProductsCell(order.products)}</td>
                <td>${dateValue}</td>
                <td><strong>${order.customerName}</strong></td>
                <td>${order.email}</td>
                <td>${order.phone || "-"}</td>
                <td>${address}</td>
                <td>${subtotalDisplay}</td>
                <td>${taxDisplay}</td>
                <td>${shippingDisplay}</td>
                <td>${amountDisplay}</td>
                <td>${order.status}</td>
            </tr>
        `;
    });

    renderPagination("export-pagination", rows.length, exportCurrentPage, totalPages, goToExportPage);
}

function showTodayOrders() {
    const btn = document.getElementById("today-orders-button");
    if (btn && btn.classList.contains("active-filter")) {
        clearOrderFilters();
        return;
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    document.getElementById("filter-from").value = todayStr;
    document.getElementById("filter-to").value = todayStr;
    document.getElementById("today-indicator").style.display = "inline";
    if (btn) btn.classList.add("active-filter");
    applyFilters();
}

function clearOrderFilters() {
    document.getElementById("search-order").value = "";
    document.getElementById("filter-status").value = "";
    document.getElementById("filter-from").value = "";
    document.getElementById("filter-to").value = "";
    document.getElementById("today-indicator").style.display = "none";
    const btn = document.getElementById("today-orders-button");
    if (btn) btn.classList.remove("active-filter");
    applyFilters();
}

function applyExportFilters() {
    const status = document.getElementById("export-filter-status")?.value;
    const fromDate = document.getElementById("export-filter-from")?.value;
    const toDate = document.getElementById("export-filter-to")?.value;

    let filtered = ordersData;

    if (status) {
        filtered = filtered.filter(order => order.status === status);
    }

    if (fromDate) {
        filtered = filtered.filter(order => {
            const d = order.orderDate ? order.orderDate.split("T")[0] : "";
            return d >= fromDate;
        });
    }
    if (toDate) {
        filtered = filtered.filter(order => {
            const d = order.orderDate ? order.orderDate.split("T")[0] : "";
            return d <= toDate;
        });
    }

    exportCurrentPage = 1;
    renderExportFilteredList(filtered);
}

async function handleOrderStatusChange(orderId, newStatus) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "updateOrderStatus",
                token: getAdminToken(),
                orderId: orderId,
                status: newStatus
            })
        });
        const result = await response.json();
        if (!result.success) {
            alert("Failed to update order status: " + (result.message || "Unknown error"));
            loadOrders();
        }
    } catch (error) {
        console.error(error);
        alert("Failed to update order status.");
        loadOrders();
    }
}

async function downloadOrdersExport() {
    const exportButton = document.getElementById("export-button");
    const exportStatus = document.getElementById("export-status");
    const statusFilter = document.getElementById("export-filter-status")?.value;
    const fromDate = document.getElementById("export-filter-from")?.value;
    const toDate = document.getElementById("export-filter-to")?.value;

    setLoadingState(exportButton, true, "Generating export...");
    exportStatus.innerText = "Fetching order data...";

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "exportOrdersCSV",
                token: getAdminToken(),
                status: statusFilter || "",
                fromDate: fromDate || "",
                toDate: toDate || ""
            })
        });

        const result = await response.json();
        if (result.success && result.csvContent) {
            let csvData = result.csvContent;

            if (csvData.charCodeAt(0) === 0xFEFF) {
                csvData = csvData.substring(1);
            }

            const blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = result.fileName || "Orders_export.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
            exportStatus.innerHTML = `✅ Exported ${result.orderCount || ""} orders as <strong>${result.fileName}</strong>`;
        } else {
            exportStatus.innerText = result.message || "Failed to generate export.";
        }
    } catch (error) {
        console.error(error);
        exportStatus.innerText = "Export failed due to a network or server error.";
    } finally {
        exportButton.disabled = false;
        exportButton.innerHTML = "Export Filtered Orders CSV";
    }
}

function renderPagination(containerId, totalItems, currentPage, totalPages, onPageClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (totalPages <= 1) {
        if (totalItems > 0) {
            container.innerHTML = `<span class="page-info">Showing all ${totalItems} orders</span>`;
        }
        return;
    }

    const startItem = (currentPage - 1) * ORDERS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ORDERS_PER_PAGE, totalItems);
    const info = document.createElement("span");
    info.className = "page-info";
    info.innerText = `${startItem}-${endItem} of ${totalItems}`;
    container.appendChild(info);

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.innerText = "« Prev";
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) onPageClick(currentPage - 1);
    });
    container.appendChild(prevBtn);

    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        const firstBtn = document.createElement("button");
        firstBtn.className = "page-btn";
        firstBtn.innerText = "1";
        firstBtn.addEventListener("click", () => onPageClick(1));
        container.appendChild(firstBtn);
        if (startPage > 2) {
            const dots = document.createElement("span");
            dots.className = "page-info";
            dots.innerText = "...";
            container.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement("button");
        btn.className = `page-btn${i === currentPage ? " active" : ""}`;
        btn.innerText = String(i);
        btn.addEventListener("click", () => onPageClick(i));
        container.appendChild(btn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement("span");
            dots.className = "page-info";
            dots.innerText = "...";
            container.appendChild(dots);
        }
        const lastBtn = document.createElement("button");
        lastBtn.className = "page-btn";
        lastBtn.innerText = String(totalPages);
        lastBtn.addEventListener("click", () => onPageClick(totalPages));
        container.appendChild(lastBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.innerText = "Next »";
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) onPageClick(currentPage + 1);
    });
    container.appendChild(nextBtn);
}

function goToOrdersPage(page) {
    ordersCurrentPage = page;
    renderOrders(ordersFilteredData.length > 0 ? ordersFilteredData : ordersData);
}

function goToExportPage(page) {
    exportCurrentPage = page;
    renderExportFilteredList(exportFilteredData);
}