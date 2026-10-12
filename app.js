/**
 * Клієнтський скрипт веб-додатку «Облік поштових відправлень»
 * Взаємодія з REST API PostService через Fetch API
 */

// Базові налаштування
let API_BASE_URL = "http://localhost:5000/postings";
let isOfflineMode = false;
let currentPostings = [];
let deleteTargetId = null;

// Демонстраційні початкові дані на випадок недоступності сервера
const initialMockData = [
    { id: 101, from: "Київ", to: "Львів", content: "Документи та договори", deliveryType: 1, weight: 0.5, depth: 21, width: 30, height: 2, value: 150, price: 90 },
    { id: 102, from: "Рівне", to: "Луцьк", content: "Подарунковий набір", deliveryType: 0, weight: 2.5, depth: 20, width: 25, height: 15, value: 750, price: 135 },
    { id: 103, from: "Одеса", to: "Харків", content: "Одяг та взуття", deliveryType: 0, weight: 4.2, depth: 30, width: 40, height: 20, value: 1200, price: 175 },
    { id: 104, from: "Дніпро", to: "Полтава", content: "Комп'ютерні комплектуючі", deliveryType: 1, weight: 1.8, depth: 15, width: 20, height: 10, value: 2500, price: 160 }
];

// Ініціалізація локального сховища для демонстрації
function getLocalPostings() {
    const saved = localStorage.getItem("postservice_postings");
    if (!saved) {
        localStorage.setItem("postservice_postings", JSON.stringify(initialMockData));
        return [...initialMockData];
    }
    try {
        return JSON.parse(saved);
    } catch {
        return [...initialMockData];
    }
}

function saveLocalPostings(items) {
    localStorage.setItem("postservice_postings", JSON.stringify(items));
}

// 1. Навігація між сторінками
function navigateTo(sectionId) {
    const sections = ["home-section", "list-section", "form-section", "about-section"];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (id === sectionId) ? "block" : "none";
        }
    });

    // Оновлення активної кнопки в меню
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    if (sectionId === "home-section") document.getElementById("nav-home")?.classList.add("active");
    if (sectionId === "list-section") document.getElementById("nav-list")?.classList.add("active");
    if (sectionId === "form-section") document.getElementById("nav-create")?.classList.add("active");
    if (sectionId === "about-section") document.getElementById("nav-about")?.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (sectionId === "list-section") {
        loadPostings();
    }
}

// 2. Оновлення адреси API
function updateApiUrl() {
    const input = document.getElementById("api-url-input");
    if (input && input.value.trim()) {
        API_BASE_URL = input.value.trim();
        alert("Адресу REST API оновлено: " + API_BASE_URL);
        checkApiConnection();
    }
}

// 3. Перевірка доступності REST API
async function checkApiConnection() {
    const badge = document.getElementById("api-status-badge");
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(API_BASE_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            isOfflineMode = false;
            if (badge) {
                badge.textContent = "Сервер онлайн";
                badge.className = "status-badge online";
            }
            return;
        }
    } catch {
        // Сервер недоступний
    }

    isOfflineMode = true;
    if (badge) {
        badge.textContent = "Локальний режим (сервер офлайн)";
        badge.className = "status-badge offline";
    }
}

// 4. Отримання списку відправлень (GET)
async function loadPostings() {
    const tbody = document.getElementById("postings-table-body");
    const statusMsg = document.getElementById("status-message");
    const countLabel = document.getElementById("items-count");

    if (statusMsg) {
        statusMsg.textContent = "Завантаження списку відправлень...";
        statusMsg.style.color = "#555";
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(API_BASE_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            currentPostings = await response.json();
            isOfflineMode = false;
            if (statusMsg) {
                statusMsg.textContent = "Дані успішно отримано з REST API";
                statusMsg.style.color = "#27ae60";
            }
        } else {
            throw new Error(`Помилка сервера: ${response.status}`);
        }
    } catch (err) {
        // Перехід на локальний режим
        isOfflineMode = true;
        currentPostings = getLocalPostings();
        if (statusMsg) {
            statusMsg.textContent = "Сервер API недоступний (працює демонстраційний локальний режим)";
            statusMsg.style.color = "#d35400";
        }
    }

    renderTable();
    if (countLabel) {
        countLabel.textContent = `Всього записів: ${currentPostings.length}`;
    }
}

// 5. Відображення таблиці
function renderTable() {
    const tbody = document.getElementById("postings-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (currentPostings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #888; padding: 20px;">Список поштових відправлень порожній</td></tr>`;
        return;
    }

    currentPostings.forEach(p => {
        const tr = document.createElement("tr");

        const deliveryTitle = (p.deliveryType === 1)
            ? `<span class="badge badge-courier">Кур'єр</span>`
            : `<span class="badge badge-office">Відділення</span>`;

        const dimensions = `${p.depth || 0}x${p.width || 0}x${p.height || 0}`;

        tr.innerHTML = `
            <td><strong>#${p.id}</strong></td>
            <td>${escapeHtml(p.content || "")}</td>
            <td>${escapeHtml(p.from || "")}</td>
            <td>${escapeHtml(p.to || "")}</td>
            <td>${deliveryTitle}</td>
            <td>${p.weight} кг</td>
            <td>${dimensions}</td>
            <td>${p.value} грн</td>
            <td>${p.price} грн</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-primary" onclick="openEditForm(${p.id})">Редагувати</button>
                <button class="btn btn-sm btn-danger" onclick="promptDelete(${p.id})">Видалити</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// 6. Спільна форма: Відкриття для створення
function openCreateForm() {
    document.getElementById("form-title").textContent = "Створення нового відправлення";
    document.getElementById("posting-id").value = "";
    document.getElementById("posting-form").reset();

    // Значення за замовчуванням
    document.getElementById("input-delivery-type").value = "0";
    document.getElementById("input-weight").value = "1.0";
    document.getElementById("input-depth").value = "15.0";
    document.getElementById("input-width").value = "20.0";
    document.getElementById("input-height").value = "10.0";
    document.getElementById("input-value").value = "100.0";
    document.getElementById("input-price").value = "70.0";

    clearValidationErrors();
    navigateTo("form-section");
}

// 7. Спільна форма: Відкриття для редагування
function openEditForm(id) {
    const item = currentPostings.find(x => x.id === id);
    if (!item) {
        alert("Запис не знайдено!");
        return;
    }

    document.getElementById("form-title").textContent = `Редагування відправлення #${item.id}`;
    document.getElementById("posting-id").value = item.id;
    document.getElementById("input-from").value = item.from || "";
    document.getElementById("input-to").value = item.to || "";
    document.getElementById("input-content").value = item.content || "";
    document.getElementById("input-delivery-type").value = item.deliveryType || 0;
    document.getElementById("input-weight").value = item.weight || 1.0;
    document.getElementById("input-depth").value = item.depth || 15.0;
    document.getElementById("input-width").value = item.width || 20.0;
    document.getElementById("input-height").value = item.height || 10.0;
    document.getElementById("input-value").value = item.value || 0;
    document.getElementById("input-price").value = item.price || 50;

    clearValidationErrors();
    navigateTo("form-section");
}

// 8. Очищення повідомлень про помилки
function clearValidationErrors() {
    document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
    document.querySelectorAll(".has-error").forEach(el => el.classList.remove("has-error"));
}

// 9. Перевірка введених даних (валідація)
function validateForm() {
    let isValid = true;
    clearValidationErrors();

    const fromVal = document.getElementById("input-from").value.trim();
    const toVal = document.getElementById("input-to").value.trim();
    const contentVal = document.getElementById("input-content").value.trim();
    const weightVal = parseFloat(document.getElementById("input-weight").value);
    const depthVal = parseFloat(document.getElementById("input-depth").value);
    const widthVal = parseFloat(document.getElementById("input-width").value);
    const heightVal = parseFloat(document.getElementById("input-height").value);
    const valueVal = parseFloat(document.getElementById("input-value").value);
    const priceVal = parseFloat(document.getElementById("input-price").value);

    // Відправник
    if (!fromVal) {
        setError("input-from", "error-from", "Вкажіть відправника (поле обов'язкове)");
        isValid = false;
    } else if (fromVal.length < 2) {
        setError("input-from", "error-from", "Назва відправника має містити щонайменше 2 символи");
        isValid = false;
    }

    // Одержувач
    if (!toVal) {
        setError("input-to", "error-to", "Вкажіть одержувача (поле обов'язкове)");
        isValid = false;
    } else if (toVal.length < 2) {
        setError("input-to", "error-to", "Назва одержувача має містити щонайменше 2 символи");
        isValid = false;
    }

    // Опис вмісту
    if (!contentVal) {
        setError("input-content", "error-content", "Вкажіть опис вмісту відправлення");
        isValid = false;
    } else if (contentVal.length < 2) {
        setError("input-content", "error-content", "Опис занадто короткий");
        isValid = false;
    }

    // Вага
    if (isNaN(weightVal) || weightVal <= 0) {
        setError("input-weight", "error-weight", "Вага має бути більшою за 0");
        isValid = false;
    }

    // Габарити
    if (isNaN(depthVal) || depthVal <= 0) {
        setError("input-depth", "error-depth", "Довжина має бути більшою за 0");
        isValid = false;
    }
    if (isNaN(widthVal) || widthVal <= 0) {
        setError("input-width", "error-width", "Ширина має бути більшою за 0");
        isValid = false;
    }
    if (isNaN(heightVal) || heightVal <= 0) {
        setError("input-height", "error-height", "Висота має бути більшою за 0");
        isValid = false;
    }

    // Цінність та ціна
    if (isNaN(valueVal) || valueVal < 0) {
        setError("input-value", "error-value", "Цінність не може бути від'ємною");
        isValid = false;
    }
    if (isNaN(priceVal) || priceVal < 0) {
        setError("input-price", "error-price", "Вартість доставки не може бути від'ємною");
        isValid = false;
    }

    return isValid;
}

function setError(inputId, errorSpanId, message) {
    const input = document.getElementById(inputId);
    const span = document.getElementById(errorSpanId);
    if (input) input.classList.add("has-error");
    if (span) span.textContent = message;
}

// 10. Збереження форми (POST / PUT)
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        alert("Будь ласка, виправте виділені помилки перед збереженням!");
        return;
    }

    const idStr = document.getElementById("posting-id").value;
    const isEdit = Boolean(idStr);

    const payload = {
        from: document.getElementById("input-from").value.trim(),
        to: document.getElementById("input-to").value.trim(),
        content: document.getElementById("input-content").value.trim(),
        deliveryType: parseInt(document.getElementById("input-delivery-type").value, 10),
        weight: parseFloat(document.getElementById("input-weight").value),
        depth: parseFloat(document.getElementById("input-depth").value),
        width: parseFloat(document.getElementById("input-width").value),
        height: parseFloat(document.getElementById("input-height").value),
        value: parseFloat(document.getElementById("input-value").value),
        price: parseFloat(document.getElementById("input-price").value)
    };

    const saveBtn = document.getElementById("btn-save");
    saveBtn.disabled = true;
    saveBtn.textContent = "Збереження...";

    try {
        if (isEdit) {
            const editId = parseInt(idStr, 10);
            payload.id = editId;

            let success = false;
            try {
                const response = await fetch(`${API_BASE_URL}/${editId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (response.ok) success = true;
            } catch {
                // Сервер недоступний
            }

            // Оновлюємо локально
            const local = getLocalPostings();
            const idx = local.findIndex(x => x.id === editId);
            if (idx !== -1) {
                local[idx] = { ...local[idx], ...payload };
                saveLocalPostings(local);
            }

            alert(`Відправлення #${editId} успішно оновлено!`);
        } else {
            let created = null;
            try {
                const response = await fetch(API_BASE_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    created = await response.json();
                }
            } catch {
                // Сервер недоступний
            }

            // Додаємо локально
            const local = getLocalPostings();
            const newId = local.length > 0 ? Math.max(...local.map(x => x.id)) + 1 : 101;
            const newRecord = created || { id: newId, ...payload };
            if (!created) {
                local.push(newRecord);
                saveLocalPostings(local);
            }

            alert("Нове відправлення успішно створено!");
        }

        navigateTo("list-section");
    } catch (err) {
        alert("Помилка при збереженні: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Зберегти";
    }
}

// 11. Видалення запису (DELETE)
function promptDelete(id) {
    deleteTargetId = id;
    const item = currentPostings.find(x => x.id === id);
    const titleSpan = document.getElementById("delete-item-title");
    if (titleSpan) {
        titleSpan.textContent = item ? `#${item.id} (${item.content})` : `#${id}`;
    }

    const modal = document.getElementById("delete-modal");
    if (modal) modal.style.display = "flex";
}

function closeDeleteModal() {
    deleteTargetId = null;
    const modal = document.getElementById("delete-modal");
    if (modal) modal.style.display = "none";
}

async function confirmDelete() {
    if (!deleteTargetId) return;

    const id = deleteTargetId;
    closeDeleteModal();

    try {
        try {
            await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
        } catch {
            // Сервер недоступний
        }

        // Видаляємо локально
        const local = getLocalPostings().filter(x => x.id !== id);
        saveLocalPostings(local);

        alert(`Відправлення #${id} видалено.`);
        await loadPostings();
    } catch (err) {
        alert("Не вдалося видалити запис: " + err.message);
    }
}

// Початковий запуск при завантаженні сторінки
document.addEventListener("DOMContentLoaded", () => {
    checkApiConnection();
    navigateTo("home-section");
});
