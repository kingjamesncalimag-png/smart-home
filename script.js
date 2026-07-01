/*=========================================================
 SMART HOME MANAGEMENT SYSTEM
 script.js
 Author: ChatGPT + King James
=========================================================*/

/*=========================================================
 CONFIG
=========================================================*/

const PHP = "";

/*=========================================================
 GLOBAL VARIABLES
=========================================================*/

let currentUser = null;
let currentRole = "client";

let accounts = [];
let currentStatus = {};

let dashboardTimer = null;
let historyTimer = null;
let clockTimer = null;

let temperatureChart = null;

let createRole = "client";
let modalRole = "client";

let lastStatusHash = "";

/*=========================================================
 OTP STATE
=========================================================*/

let pendingUserId = null;

/*=========================================================
 TEAM MEMBERS
=========================================================*/

const TEAM = {

    "King James": {
        role: "Project Leader",
        bio: "If God is leading, I am following.",
        link: "http://localhost/Website ng may bitaw/index.html"
    },

    "Moises": {
        role: "Hardware Engineer",
        bio: "Energy speaks before words.",
        link: "http://localhost/moises/index.html"
    },

    "Ronie": {
        role: "Backend Developer",
        bio: "Quiet moves. Loud results.",
        link: "http://localhost/ronie/index.html"
    },

    "Reah": {
        role: "Frontend Developer",
        bio: "Different mindset. Different path.",
        link: "http://localhost/reah/index.html"
    },

    "BJ": {
        role: "Documentation",
        bio: "Small steps. Big future.",
        link: "http://localhost/bj/index.html"
    }

};

/*=========================================================
 HELPERS
=========================================================*/

function $(id) {
    return document.getElementById(id);
}

function value(id) {
    return $(id)?.value.trim() || "";
}

function show(id) {
    $(id)?.classList.remove("hidden");
}

function hide(id) {
    $(id)?.classList.add("hidden");
}

function formatDate(date) {

    return new Date(date).toLocaleString("en-PH", {

        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"

    });

}

function updateClock() {

    if ($("datetime")) {

        $("datetime").textContent =
            formatDate(new Date());

    }

}

/*=========================================================
 API FETCH HELPER — handles 401 session expiry globally
=========================================================*/

async function apiFetch(url, options = {}) {

    const response = await fetch(url, {
        credentials: "include",
        ...options
    });

    const data = await response.json();

    if (response.status === 401 && !data.success) {
        alert("Your session has expired. Please log in again.");
        logout();
        return null;
    }

    return data;

}

/*=========================================================
 LOGIN — STEP 1: Verify credentials, trigger OTP
=========================================================*/

async function login() {

    const username = value("username");
    const password = $("password").value;

    if (!username || !password) {
        alert("Please enter your username and password.");
        return;
    }

    try {

        const data = await apiFetch(`${PHP}/auth.php?action=send_otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        if (!data) return;

        if (!data.success) {
            alert(data.message);
            return;
        }

        pendingUserId = data.user_id;

        $("otp-hint").textContent =
            `Enter the 6-digit code sent to ${data.masked_email}`;

        $("step-credentials").classList.add("hidden");
        $("step-otp").classList.remove("hidden");
        $("otp-input").focus();

    } catch (err) {
        console.error(err);
        alert("Unable to connect to the server.");
    }

}

/*=========================================================
 LOGIN — STEP 2: Verify OTP
=========================================================*/

async function verifyOTP() {

    const otp = value("otp-input");

    if (!otp || otp.length !== 6) {
        alert("Please enter the 6-digit code.");
        return;
    }

    try {

        const data = await apiFetch(`${PHP}/auth.php?action=verify_otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: pendingUserId, otp_code: otp })
        });

        if (!data) return;

        if (!data.success) {
            alert(data.message);
            return;
        }

        currentUser = data.username;
        currentRole = data.role;
        pendingUserId = null;

        // Reset login form back to step 1 for next time
        $("step-otp").classList.add("hidden");
        $("step-credentials").classList.remove("hidden");
        $("otp-input").value = "";

        hide("login-page");
        show("main-app");

        initializeApplication();

    } catch (err) {
        console.error(err);
        alert("Unable to connect to the server.");
    }

}

/*=========================================================
 LOGIN — RESEND OTP
=========================================================*/

async function resendOTP() {

    const username = value("username");
    const password = $("password").value;

    await apiFetch(`${PHP}/auth.php?action=send_otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    alert("A new code has been sent to your email.");

}

/*=========================================================
 LOGOUT
=========================================================*/

function logout() {

    clearInterval(clockTimer);
    clearInterval(dashboardTimer);
    clearInterval(historyTimer);

    clockTimer = null;
    dashboardTimer = null;
    historyTimer = null;

    currentUser = null;
    currentRole = "client";
    pendingUserId = null;

    accounts = [];
    currentStatus = {};

    hide("main-app");
    show("login-page");

    $("username").value = "";
    $("password").value = "";

}

/*=========================================================
 INITIALIZATION
=========================================================*/

function initializeApplication() {

    updateClock();

    clockTimer = setInterval(updateClock, 1000);

    applyRolePermissions();

    switchPage(0);

    renderTeamMembers();

    initializeDashboard();

}

/*=========================================================
 ROLE PERMISSIONS
=========================================================*/

function applyRolePermissions() {

    const admin =
        currentRole === "admin";

    $("topbar-user").textContent =
        currentUser;

    $("topbar-role-badge").textContent =
        admin ? "Admin" : "Client";

    $("topbar-role-badge").className =
        admin
            ? "role-badge role-badge--admin"
            : "role-badge role-badge--client";

}

/*=========================================================
 PAGE NAVIGATION
=========================================================*/

let currentPage = 0;

function switchPage(page) {

    currentPage = page;

    document.querySelectorAll(".page").forEach(p => {

        p.classList.add("hidden");

    });

    const target = document.getElementById(`page-${page}`);

    if (target) {

        target.classList.remove("hidden");

    }

    document.querySelectorAll(".nav-btn").forEach(btn => {

        btn.classList.remove("active");

    });

    const navButtons = document.querySelectorAll(".nav-btn");

    if (navButtons[page]) {

        navButtons[page].classList.add("active");

    }

    switch (page) {

        case 1:
            loadAccounts();
            break;

        case 2:
            renderTeamMembers();
            break;

        case 4:
            initializeDashboard();
            break;

    }

}

/*=========================================================
 DASHBOARD HOME
=========================================================*/

function renderDashboardCards() {

    const container = $("dash-cards");

    if (!container) return;

    container.innerHTML = "";

    const cards = [

        {
            icon: "👥",
            title: "Accounts",
            page: 1
        },

        {
            icon: "🧑‍🤝‍🧑",
            title: "Team",
            page: 2
        },

        {
            icon: "➕",
            title: "Create Account",
            page: 3
        },

        {
            icon: "🏠",
            title: "IoT Dashboard",
            page: 4
        }

    ];

    cards.forEach(card => {

        const div = document.createElement("div");

        div.className = "dash-card";

        div.innerHTML = `

            <div style="font-size:40px;margin-bottom:15px;">

                ${card.icon}

            </div>

            <h3>${card.title}</h3>

        `;

        div.onclick = () => switchPage(card.page);

        container.appendChild(div);

    });

}

/*=========================================================
 TEAM PAGE
=========================================================*/

function renderTeamMembers() {

    const buttons = $("team-buttons");

    if (!buttons) return;

    buttons.innerHTML = "";

    Object.keys(TEAM).forEach(name => {

        const btn = document.createElement("button");

        btn.className = "team-btn";

        btn.textContent = name;

        btn.onclick = () => showTeamMember(name);

        buttons.appendChild(btn);

    });

    showTeamMember("King James");

}

function showTeamMember(name) {

    const member = TEAM[name];

    if (!member) return;

    const profile = $("team-profile");

    profile.innerHTML = `

        <h2>${name}</h2>

        <h4>${member.role}</h4>

        <p>

            ${member.bio}

        </p>

        <br>

        <button
            class="btn-primary"
            onclick="window.open('${member.link}','_blank')">

            View Portfolio

        </button>

    `;

}

/*=========================================================
 DASHBOARD STARTUP
=========================================================*/

function initializeDashboard() {

    renderDashboardCards();

    if (currentPage !== 4) return;

    // ✅ IMPORTANT: only ONE entry point for IoT
    startIoT();
}

/*=========================================================
 ACCOUNTS
=========================================================*/

let filteredAccounts = [];

/*=========================================================
 LOAD ACCOUNTS
=========================================================*/

async function loadAccounts() {

    try {

        const data = await apiFetch(`${PHP}/accounts.php`);

        if (!data) return;

        accounts = Array.isArray(data) ? data : [];

        filteredAccounts = [...accounts];

        renderAccounts();

        updateDashboardStats();

    }

    catch (err) {

        console.error(err);

        alert("Unable to load accounts.");

    }

}

/*=========================================================
 SEARCH
=========================================================*/

function searchAccounts() {

    const keyword = value("search-account").toLowerCase();

    if (keyword === "") {

        filteredAccounts = [...accounts];

        renderAccounts();

        return;

    }

    filteredAccounts = accounts.filter(account => {

        return (

            account.full_name.toLowerCase().includes(keyword) ||

            account.username.toLowerCase().includes(keyword) ||

            account.role.toLowerCase().includes(keyword) ||

            (account.department || "").toLowerCase().includes(keyword)

        );

    });

    renderAccounts();

}

/*=========================================================
 RENDER TABLE
=========================================================*/

function renderAccounts() {

    const tbody = $("accounts-body");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (filteredAccounts.length === 0) {

        tbody.innerHTML = `

            <tr>

                <td colspan="10" style="text-align:center;">

                    No accounts found.

                </td>

            </tr>

        `;

        return;

    }

    filteredAccounts.forEach(account => {

        const tr = document.createElement("tr");

        tr.innerHTML = `

            <td>${account.id}</td>

            <td>${account.first_name}</td>

            <td>${account.middle_name ?? ""}</td>

            <td>${account.last_name}</td>

            <td>${account.username}</td>

            <td>${account.role}</td>

            <td>${account.age ?? ""}</td>

            <td>${account.gender ?? ""}</td>

            <td>${account.department ?? ""}</td>

            <td>

                ${renderAccountButtons(account)}

            </td>

        `;

        tbody.appendChild(tr);

    });

}

/*=========================================================
 ACTION BUTTONS
=========================================================*/

function renderAccountButtons(account) {

    if (currentRole !== "admin") {

        return `
            <button
                class="btn-secondary"
                onclick="openEditAccount(${account.id})">

                View

            </button>
        `;

    }

    return `

        <button
            class="btn-primary"
            onclick="openEditAccount(${account.id})">

            Edit

        </button>

        <button
            class="btn-danger"
            onclick="deleteAccount(${account.id})">

            Delete

        </button>

    `;

}

/*=========================================================
 ACCOUNT CRUD
=========================================================*/

let selectedAccount = null;

/*=========================================================
 OPEN CREATE PAGE
=========================================================*/

function openCreateAccount() {

    switchPage(3);

    clearCreateForm();

}

/*=========================================================
 CLEAR CREATE FORM
=========================================================*/

function clearCreateForm() {

    const ids = [

        "fname",
        "sname",
        "lname",
        "age",
        "gender",
        "dept",
        "uname",
        "email",
        "create-password"

    ];

    ids.forEach(id => {

        const el = $(id);

        if (el) {

            if (el.tagName === "SELECT") {

                el.selectedIndex = 0;

            } else {

                el.value = "";

            }

        }

    });

}

/*=========================================================
 CREATE ACCOUNT
=========================================================*/

async function createAccount() {

    const payload = {

        first_name: value("fname"),
        middle_name: value("sname"),
        last_name: value("lname"),

        username: value("uname"),
        password: $("create-password").value,
        email: $("email").value,

        age: value("age"),
        gender: value("gender"),
        department: value("dept"),

        role: createRole

    };

    if (
        !payload.first_name ||
        !payload.last_name ||
        !payload.username ||
        !payload.password
    ) {

        alert("Please complete all required fields.");

        return;

    }

    try {

        const result = await apiFetch(`${PHP}/accounts.php`, {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify(payload)

        });

        if (!result) return;

        if (!result.success) {

            alert(result.message);

            return;

        }

        alert("Account created successfully.");

        clearCreateForm();

        switchPage(1);

        loadAccounts();

    }

    catch (err) {

        console.error(err);

        alert("Unable to create account.");

    }

}

/*=========================================================
 OPEN EDIT MODAL
=========================================================*/

function openEditAccount(id) {

    selectedAccount =
        accounts.find(acc => acc.id == id);

    if (!selectedAccount) {
        alert("Account not found.");
        return;
    }

    $("m-fname").value = selectedAccount.first_name;
    $("m-sname").value = selectedAccount.middle_name || "";
    $("m-lname").value = selectedAccount.last_name;
    $("m-age").value = selectedAccount.age || "";
    $("m-gender").value = selectedAccount.gender || "";
    $("m-dept").value = selectedAccount.department || "";
    $("m-uname").value = selectedAccount.username;
    $("m-email").value = selectedAccount.email || "";

    $("m-password").value = "";

    $("m-role").value = selectedAccount.role;
    modalRole = selectedAccount.role;

    if (currentRole !== "admin") {
        $("m-role").disabled = true;
    } else {
        $("m-role").disabled = false;
    }

    show("edit-modal");
}

/*=========================================================
 SAVE ACCOUNT
=========================================================*/

async function saveAccount() {

    if (!selectedAccount) {

        alert("No account selected.");

        return;

    }

    const payload = {

        first_name: value("m-fname"),
        middle_name: value("m-sname"),
        last_name: value("m-lname"),

        username: value("m-uname"),
        email: $("m-email").value,

        age: value("m-age"),
        gender: value("m-gender"),
        department: value("m-dept"),

        password: $("m-password").value

    };

    if (currentRole === "admin") {

        payload.role = modalRole;

    }

    try {

        const result = await apiFetch(

            `${PHP}/accounts.php?id=${selectedAccount.id}`,

            {

                method: "PUT",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify(payload)

            }

        );

        if (!result) return;

        if (!result.success) {

            alert(result.message);

            return;

        }

        alert("Account updated successfully.");

        closeEditModal();

        loadAccounts();

    }

    catch (err) {

        console.error(err);

        alert("Unable to update account.");

    }

}

/*=========================================================
 DELETE ACCOUNT
=========================================================*/

async function deleteAccount(id) {

    if (!confirm("Delete this account?")) {

        return;

    }

    try {

        const result = await apiFetch(

            `${PHP}/accounts.php?id=${id}`,

            {

                method: "DELETE"

            }

        );

        if (!result) return;

        if (!result.success) {

            alert(result.message);

            return;

        }

        alert("Account deleted.");

        loadAccounts();

    }

    catch (err) {

        console.error(err);

        alert("Unable to delete account.");

    }

}

/*=========================================================
 CLOSE EDIT MODAL
=========================================================*/

function closeEditModal() {

    hide("edit-modal");

    selectedAccount = null;

}

/*=========================================================
 ROLE SELECTORS
=========================================================*/

function setCreateRole(role) {

    createRole = role;

}

function setModalRole(role) {

    modalRole = role;

}

/*=========================================================
 REFRESH ACCOUNTS
=========================================================*/

function refreshAccounts() {

    loadAccounts();

}

/*=========================================================
 ACCOUNT HELPERS
=========================================================*/

function accountById(id) {

    return accounts.find(acc => acc.id == id);

}

function totalAccounts() {

    return accounts.length;

}


/*=========================================================
 DASHBOARD STATISTICS
=========================================================*/

function updateDashboardStats() {

    // Total Accounts
    if ($("total-accounts")) {

        $("total-accounts").textContent = accounts.length;

    }

    // Temperature
    if ($("dashboard-temp")) {

        $("dashboard-temp").textContent =
            (currentStatus.temperature ?? "--") + " °C";

    }

    // Humidity
    if ($("dashboard-humidity")) {

        $("dashboard-humidity").textContent =
            (currentStatus.humidity ?? "--") + " %";

    }

    // Connection
    if ($("dashboard-status")) {

        $("dashboard-status").textContent =
            currentStatus.connection ?? "OFFLINE";

    }

}

/*=========================================================
 IOT DASHBOARD
=========================================================*/

function startIoT() {

    stopIoT();

    refreshDashboard();

    loadSensorHistory();

    dashboardTimer = setInterval(refreshDashboard, 2000);

    historyTimer = setInterval(loadSensorHistory, 10000);

}

function stopIoT() {

    if (dashboardTimer) {

        clearInterval(dashboardTimer);

        dashboardTimer = null;

    }

    if (historyTimer) {

        clearInterval(historyTimer);

        historyTimer = null;

    }

}

/*=========================================================
 REFRESH DASHBOARD
=========================================================*/

async function refreshDashboard() {

    try {

        const newData = await apiFetch(
            `${PHP}/sensors.php?type=latest`,
            { cache: "no-store" }
        );

        if (!newData) return;

        const newHash =
            `${newData.temperature}|${newData.humidity}|${newData.rain}|${newData.connection}|${newData.rfid_uid}`;

        if (newHash !== lastStatusHash) {

            lastStatusHash = newHash;
            currentStatus = newData;

            updateDashboardStats();
            updateConnection();
            updateSensorCards();
            updateDeviceStatus();
        }

    }

    catch (err) {
        console.error(err);
    }
}

/*=========================================================
 CONNECTION STATUS
=========================================================*/

function updateConnection() {

    const online =
        currentStatus.connection === "ONLINE";

    if ($("status")) {

        $("status").textContent =
            online
                ? "🟢 ONLINE"
                : "🔴 OFFLINE";

        $("status").style.color =
            online
                ? "#16a34a"
                : "#dc2626";

    }

    if ($("last-update")) {

        $("last-update").textContent =
            new Date().toLocaleTimeString();

    }

}

/*=========================================================
 SENSOR CARDS
=========================================================*/

function updateSensorCards() {

    const container = $("sensor-cards");

    if (!container) return;

    container.innerHTML = `

        <div class="sensor-card">

            <h3>🌡 Temperature</h3>

            <h1>${currentStatus.temperature ?? "--"} °C</h1>

        </div>

        <div class="sensor-card">

            <h3>💧 Humidity</h3>

            <h1>${currentStatus.humidity ?? "--"} %</h1>

        </div>

        <div class="sensor-card">

            <h3>🌧 Rain</h3>

            <h1>${currentStatus.rain ?? "--"}</h1>

        </div>

        <div class="sensor-card">

            <h3>🏷 RFID</h3>

            <h1>${currentStatus.rfid_uid ?? "--"}</h1>

        </div>

    `;

}

/*=========================================================
 DEVICE STATUS
=========================================================*/

function updateDeviceStatus() {

    if ($("door-status")) {

        $("door-status").textContent =
            currentStatus.door_state ?? "--";

    }

    if ($("clothes-status")) {

        $("clothes-status").textContent =
            currentStatus.clothes_state ?? "--";

    }

    if ($("red-status")) {

        $("red-status").textContent =
            currentStatus.red_led ?? "--";

    }

    if ($("white-status")) {

        $("white-status").textContent =
            currentStatus.white_led ?? "--";

    }

}

/*=========================================================
 SENSOR HISTORY
=========================================================*/

async function loadSensorHistory() {

    try {

        const history = await apiFetch(

            `${PHP}/sensors.php?type=history&limit=20`,

            { cache: "no-store" }

        );

        if (!history) return;

        if (!Array.isArray(history)) {

            return;

        }

        history.reverse();

        updateTemperatureChart(history);

        updateSensorLogs(history);

    }

    catch (err) {

        console.error(err);

    }

}

/*=========================================================
 TEMPERATURE CHART
=========================================================*/

function createTemperatureChart() {

    const canvas = $("chart");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    temperatureChart = new Chart(ctx, {

        type: "line",

        data: {

            labels: [],

            datasets: [

                {

                    label: "Temperature (°C)",

                    data: [],

                    borderWidth: 2,

                    tension: 0.35,

                    fill: false

                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            animation: false,

            plugins: {

                legend: {

                    display: true

                }

            },

            scales: {

                y: {

                    beginAtZero: false

                }

            }

        }

    });

}

/*=========================================================
 UPDATE CHART
=========================================================*/

function updateTemperatureChart(history) {

    if (!temperatureChart) {

        createTemperatureChart();

    }

    if (!temperatureChart) return;

    temperatureChart.data.labels = history.map(item =>

        new Date(item.created_at)

        .toLocaleTimeString()

    );

    temperatureChart.data.datasets[0].data =

        history.map(item =>

            Number(item.temperature)

        );

    temperatureChart.update("none");

}

/*=========================================================
 SENSOR LOG TABLE
=========================================================*/

function updateSensorLogs(history) {

    const tbody = $("log-table");

    if (!tbody) return;

    tbody.innerHTML = "";

    history

    .slice()

    .reverse()

    .forEach(item => {

        tbody.innerHTML += `

            <tr>

                <td>

                    ${new Date(item.created_at)

                        .toLocaleTimeString()}

                </td>

                <td>

                    ${item.temperature} °C

                </td>

                <td>

                    ${item.humidity} %

                </td>

                <td>

                    ${item.rain}

                </td>

                <td>

                    ${item.rfid_uid ?? "--"}

                </td>

            </tr>

        `;

    });

}

/*=========================================================
 MANUAL CONTROLS
=========================================================*/

async function sendCommand(type, action) {

    try {

        const result = await apiFetch(

            `${PHP}/control.php`,

            {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    type,
                    action

                })

            }

        );

        if (!result) return false;

        if (!result.success) {

            alert(result.message);

            return false;

        }

        console.log("Command Sent:", result.queued);

        return true;

    }

    catch (err) {

        console.error(err);

        alert("Unable to communicate with the server.");

        return false;

    }

}

/*=========================================================
 DOOR
=========================================================*/

async function toggleDoor(action) {

    await sendCommand("door", action);

}

/*=========================================================
 CLOTHESLINE
=========================================================*/

async function toggleClothes(action) {

    await sendCommand("clothes", action);

}

/*=========================================================
 RED LED
=========================================================*/

async function toggleRedLED() {

    const state =
        currentStatus.red_led === "ON"
            ? "off"
            : "on";

    await sendCommand(

        "led_red",

        state

    );

}

/*=========================================================
 WHITE LED
=========================================================*/

async function toggleWhiteLED() {

    const state =
        currentStatus.white_led === "ON"
            ? "off"
            : "on";

    await sendCommand(

        "led_white",

        state

    );

}

/*=========================================================
 PAGE EVENTS
=========================================================*/

window.addEventListener(

    "beforeunload",

    () => {

        stopIoT();

    }

);

/*=========================================================
 DOM READY
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    () => {

        updateClock();

        $("password")?.addEventListener(

            "keydown",

            e => {

                if (e.key === "Enter") {

                    login();

                }

            }

        );

        $("username")?.addEventListener(

            "keydown",

            e => {

                if (e.key === "Enter") {

                    login();

                }

            }

        );

        // OTP input — press Enter to verify
        $("otp-input")?.addEventListener(

            "keydown",

            e => {

                if (e.key === "Enter") {

                    verifyOTP();

                }

            }

        );

    }

);

/*=========================================================
 END OF FILE
=========================================================*/

console.log(

    "%cSmart Home Management System Ready",

    "color:green;font-size:16px;font-weight:bold;"

);
