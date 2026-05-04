/* ver-citas.js COMPLETO */

const firebaseConfig = {
  apiKey: "AIzaSyD4WCEUcsgfjK_LgNkY5rexqvPMxQ-RdEE",
  authDomain: "barberia2-bb033.firebaseapp.com",
  databaseURL: "https://barberia2-bb033-default-rtdb.firebaseio.com",
  projectId: "barberia2-bb033",
  storageBucket: "barberia2-bb033.firebasestorage.app",
  messagingSenderId: "763008264452",
  appId: "1:763008264452:web:4adb64267606266deb4851",
  measurementId: "G-QHN4PX48D4"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const appointmentsRef = db.ref("appointments");

const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterBarber = document.getElementById("filterBarber");
const filterDate = document.getElementById("filterDate");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const appointmentsView = document.getElementById("appointmentsView");
const resultsInfo = document.getElementById("resultsInfo");

const statTotal = document.getElementById("statTotal");
const statApproved = document.getElementById("statApproved");
const statPending = document.getElementById("statPending");
const statCancelled = document.getElementById("statCancelled");

const STORAGE_APPOINTMENT_ID = "lapinta_client_appointment_id";
const STORAGE_CLIENT_TOKEN = "lapinta_client_token";
const STORAGE_CLIENT_APPOINTMENTS = "lapinta_client_appointments";

let allAppointments = [];
let myAppointmentId = localStorage.getItem(STORAGE_APPOINTMENT_ID);
let myClientToken = localStorage.getItem(STORAGE_CLIENT_TOKEN);
let myAppointments = [];

function refreshMyAppointmentData() {
  myAppointmentId = localStorage.getItem(STORAGE_APPOINTMENT_ID);
  myClientToken = localStorage.getItem(STORAGE_CLIENT_TOKEN);

  try {
    myAppointments = JSON.parse(localStorage.getItem(STORAGE_CLIENT_APPOINTMENTS)) || [];
  } catch (error) {
    myAppointments = [];
  }

  if (myAppointmentId && myClientToken) {
    const exists = myAppointments.some(item => {
      return String(item.id) === String(myAppointmentId) &&
             String(item.token) === String(myClientToken);
    });

    if (!exists) {
      myAppointments.push({
        id: myAppointmentId,
        token: myClientToken
      });

      localStorage.setItem(STORAGE_CLIENT_APPOINTMENTS, JSON.stringify(myAppointments));
    }
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeStatus(status) {
  if (status === "approved") return "approved";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

function normalizeAppointment(id, app) {
  return {
    id,
    nombre: app?.nombre || "Sin nombre",
    telefono: app?.telefono || "",
    servicio: app?.servicio || "Sin servicio",
    barbero: app?.barbero || "No definido",
    fecha: app?.fecha || "",
    hora: app?.hora || "",
    duration: Number(app?.duration || 0),
    anonimo: Boolean(app?.anonimo),
    status: normalizeStatus(app?.status),
    clientToken: app?.clientToken || "",
    createdAt: app?.createdAt || "",
    updatedAt: app?.updatedAt || ""
  };
}

function isMine(app) {
  refreshMyAppointmentData();

  if (!app) return false;
  if (!app.clientToken) return false;

  return myAppointments.some(item => {
    return String(item.id) === String(app.id) &&
           String(item.token) === String(app.clientToken);
  });
}

function canModify(app) {
  if (!isMine(app)) return false;
  if (app.status !== "pending") return false;
  if (isPastAppointment(app.fecha, app.hora)) return false;

  return true;
}

function formatDateSafe(dateString) {
  if (!dateString) return "Sin fecha";

  const parts = String(dateString).split("-");
  if (parts.length !== 3) return dateString;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function to24Hour(time12) {
  if (!time12) return "00:00";

  const value = String(time12).trim();

  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":");
    return `${String(Number(h)).padStart(2, "0")}:${m}`;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return value;

  let hour = parseInt(match[1], 10);
  const minutes = match[2];
  const suffix = match[3].toUpperCase();

  if (suffix === "AM" && hour === 12) hour = 0;
  if (suffix === "PM" && hour !== 12) hour += 12;

  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

function formatTimeToInput(timeValue) {
  if (!timeValue) return "";

  const value = String(timeValue).trim();

  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":");
    return `${String(Number(h)).padStart(2, "0")}:${m}`;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return "";

  let hour = parseInt(match[1], 10);
  const minutes = match[2];
  const suffix = match[3].toUpperCase();

  if (suffix === "AM" && hour === 12) hour = 0;
  if (suffix === "PM" && hour !== 12) hour += 12;

  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

function formatTimeTo12Hour(time24) {
  if (!time24) return "";

  const [hourString, minuteString] = String(time24).split(":");
  let hour = Number(hourString);
  const minutes = minuteString || "00";

  if (Number.isNaN(hour)) return time24;

  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;

  if (hour === 0) hour = 12;

  return `${hour}:${minutes} ${suffix}`;
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isPastAppointment(fecha, hora) {
  if (!fecha || !hora) return false;

  const time24 = formatTimeToInput(hora) || hora;
  const dateTime = new Date(`${fecha}T${time24}:00`);

  if (Number.isNaN(dateTime.getTime())) return false;

  return dateTime.getTime() < Date.now();
}

function getStatusLabel(status) {
  if (status === "approved") return "Aprobada";
  if (status === "cancelled") return "Cancelada";
  return "Pendiente";
}

function getRelativeDateLabel(dateString) {
  const today = new Date();
  const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, month, day] = String(dateString).split("-").map(Number);
  const target = new Date(year, month - 1, day);

  const diffTime = target.getTime() - todayClean.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Citas de hoy";
  if (diffDays === 1) return "Citas de mañana";
  if (diffDays === 2) return "Citas de pasado mañana";

  return `Citas del ${formatDateSafe(dateString)}`;
}

function getRelativeDateSubtext(dateString) {
  const today = new Date();
  const todayClean = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [year, month, day] = String(dateString).split("-").map(Number);
  const target = new Date(year, month - 1, day);

  const diffTime = target.getTime() - todayClean.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Reservas programadas para hoy";
  if (diffDays === 1) return "Reservas programadas para mañana";
  if (diffDays === 2) return "Reservas programadas para pasado mañana";

  return `Fecha: ${formatDateSafe(dateString)}`;
}

function fillBarberFilter(appointments) {
  const currentValue = filterBarber.value;

  const barbers = [...new Set(
    appointments
      .map(app => app.barbero)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "es"));

  filterBarber.innerHTML =
    `<option value="all">Todos</option>` +
    barbers.map(barber => `<option value="${escapeHTML(barber)}">${escapeHTML(barber)}</option>`).join("");

  if (barbers.includes(currentValue)) {
    filterBarber.value = currentValue;
  } else {
    filterBarber.value = "all";
  }
}

function updateStats(appointments) {
  statTotal.textContent = appointments.length;
  statApproved.textContent = appointments.filter(app => app.status === "approved").length;
  statPending.textContent = appointments.filter(app => app.status === "pending").length;
  statCancelled.textContent = appointments.filter(app => app.status === "cancelled").length;
}

function getFilteredAppointments() {
  const search = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  const barber = filterBarber.value;
  const date = filterDate.value;

  return allAppointments
    .filter(app => {
      const publicName = app.anonimo ? "anónimo" : app.nombre;

      const matchesSearch =
        !search ||
        [
          app.nombre,
          publicName,
          app.telefono,
          app.servicio,
          app.barbero,
          app.fecha,
          app.hora
        ]
          .map(v => String(v || "").toLowerCase())
          .some(v => v.includes(search));

      const matchesStatus = status === "all" || app.status === status;
      const matchesBarber = barber === "all" || app.barbero === barber;
      const matchesDate = !date || app.fecha === date;

      return matchesSearch && matchesStatus && matchesBarber && matchesDate;
    })
    .sort((a, b) => {
      const aKey = `${a.fecha} ${to24Hour(a.hora)}`;
      const bKey = `${b.fecha} ${to24Hour(b.hora)}`;
      return aKey.localeCompare(bKey);
    });
}

function groupAppointmentsByDate(appointments) {
  const grouped = {};

  appointments.forEach(app => {
    if (!grouped[app.fecha]) grouped[app.fecha] = [];
    grouped[app.fecha].push(app);
  });

  return grouped;
}

function getActionsHTML(app) {
  if (canModify(app)) {
    return `
      <div class="client-actions-wrap">
        <button type="button" class="client-action-btn edit-client-btn" data-id="${escapeHTML(app.id)}">
          Editar
        </button>

        <button type="button" class="client-action-btn cancel-client-btn" data-id="${escapeHTML(app.id)}">
          Cancelar
        </button>
      </div>
    `;
  }

  if (isMine(app) && app.status === "approved") {
    return `<span class="client-note">Tu cita aprobada</span>`;
  }

  if (isMine(app) && app.status === "cancelled") {
    return `<span class="client-note">Tu cita cancelada</span>`;
  }

  if (isMine(app) && isPastAppointment(app.fecha, app.hora)) {
    return `<span class="client-note">Tu cita ya pasó</span>`;
  }

  return `<span class="client-note">Solo ver</span>`;
}

function renderGroupedAppointments(groupedAppointments) {
  const dates = Object.keys(groupedAppointments).sort();

  if (!dates.length) {
    appointmentsView.innerHTML = `
      <div class="empty-state">
        <h3>No hay citas para mostrar</h3>
        <p>No se encontraron citas con los filtros seleccionados.</p>
      </div>
    `;
    return;
  }

  let html = "";

  dates.forEach(date => {
    const items = groupedAppointments[date];

    html += `
      <div class="date-group">
        <div class="date-group-header">
          <h3>${escapeHTML(getRelativeDateLabel(date))}</h3>
          <p>${escapeHTML(getRelativeDateSubtext(date))}</p>
        </div>

        <div class="table-shell">
          <table class="appointments-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Barbero</th>
                <th>Hora</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              ${items.map(app => `
                <tr>
                  <td>
                    <span class="client-name">
                      ${escapeHTML(app.anonimo ? "Anónimo" : app.nombre)}
                      ${isMine(app) ? `<small class="mine-badge">Mi cita</small>` : ""}
                    </span>
                  </td>

                  <td>
                    <span class="service-name">${escapeHTML(app.servicio)}</span>
                  </td>

                  <td>${escapeHTML(app.barbero)}</td>
                  <td>${escapeHTML(app.hora)}</td>

                  <td>
                    <span class="status-pill status-${escapeHTML(app.status)}">
                      ${escapeHTML(getStatusLabel(app.status))}
                    </span>
                  </td>

                  <td>
                    ${getActionsHTML(app)}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="mobile-table-list">
          ${items.map(app => {
            let mobileStatusClass = "mobile-status-pending";
            if (app.status === "approved") mobileStatusClass = "mobile-status-approved";
            if (app.status === "cancelled") mobileStatusClass = "mobile-status-cancelled";

            return `
              <article class="mobile-row-card">
                <h4 class="mobile-service-title">
                  ${escapeHTML(app.servicio)}
                  ${isMine(app) ? `<small class="mine-badge mobile-mine-badge">Mi cita</small>` : ""}
                </h4>

                <div class="mobile-status-pill ${mobileStatusClass}">
                  ${escapeHTML(getStatusLabel(app.status))}
                </div>

                <div class="mobile-fields">
                  <div class="mobile-field-box">
                    <span class="mobile-field-label">Cliente</span>
                    <span class="mobile-field-value">${escapeHTML(app.anonimo ? "Anónimo" : app.nombre)}</span>
                  </div>

                  <div class="mobile-field-box">
                    <span class="mobile-field-label">Barbero</span>
                    <span class="mobile-field-value">${escapeHTML(app.barbero)}</span>
                  </div>

                  <div class="mobile-field-box">
                    <span class="mobile-field-label">Hora</span>
                    <span class="mobile-field-value">${escapeHTML(app.hora)}</span>
                  </div>

                  <div class="mobile-field-box">
                    <span class="mobile-field-label">Estado</span>
                    <span class="mobile-field-value">${escapeHTML(getStatusLabel(app.status))}</span>
                  </div>

                  <div class="mobile-field-box">
                    <span class="mobile-field-label">Acción</span>
                    <span class="mobile-field-value">${getActionsHTML(app)}</span>
                  </div>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `;
  });

  appointmentsView.innerHTML = html;
  attachActionEvents();
}

function renderAll() {
  refreshMyAppointmentData();

  const filtered = getFilteredAppointments();
  const grouped = groupAppointmentsByDate(filtered);

  resultsInfo.textContent = filtered.length === 1
    ? "1 cita encontrada"
    : `${filtered.length} citas encontradas`;

  renderGroupedAppointments(grouped);
}

function listenAppointments() {
  appointmentsRef.on("value", snapshot => {
    const data = snapshot.val() || {};
    allAppointments = Object.entries(data).map(([id, app]) => normalizeAppointment(id, app));

    updateStats(allAppointments);
    fillBarberFilter(allAppointments);
    renderAll();
  });
}

function clearFilters() {
  searchInput.value = "";
  filterStatus.value = "all";
  filterBarber.value = "all";
  filterDate.value = "";
  renderAll();
}

function attachActionEvents() {
  document.querySelectorAll(".edit-client-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      openEditModal(id);
    });
  });

  document.querySelectorAll(".cancel-client-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      cancelMyAppointment(id);
    });
  });
}

function getAppointmentById(id) {
  return allAppointments.find(app => String(app.id) === String(id));
}

function openEditModal(id) {
  const app = getAppointmentById(id);

  if (!app) {
    alert("No se encontró esta cita.");
    return;
  }

  if (!canModify(app)) {
    alert("No puedes modificar esta cita.");
    return;
  }

  const modal = document.getElementById("clientEditModal");

  document.getElementById("editAppointmentId").value = app.id;
  document.getElementById("editNombre").value = app.nombre || "";
  document.getElementById("editTelefono").value = app.telefono || "";
  document.getElementById("editServicio").value = app.servicio || "";
  document.getElementById("editBarbero").value = app.barbero || "";
  document.getElementById("editFecha").value = app.fecha || "";
  document.getElementById("editHora").value = formatTimeToInput(app.hora);

  document.getElementById("editFecha").min = getTodayInputValue();

  modal.classList.add("open");
}

function closeEditModal() {
  const modal = document.getElementById("clientEditModal");

  if (modal) {
    modal.classList.remove("open");
  }
}

async function saveEditAppointment(event) {
  event.preventDefault();

  const id = document.getElementById("editAppointmentId").value;
  const app = getAppointmentById(id);

  if (!app) {
    alert("No se encontró esta cita.");
    return;
  }

  if (!canModify(app)) {
    alert("No puedes modificar esta cita.");
    return;
  }

  const nombre = document.getElementById("editNombre").value.trim();
  const telefono = document.getElementById("editTelefono").value.trim();
  const servicio = document.getElementById("editServicio").value;
  const barbero = document.getElementById("editBarbero").value;
  const fecha = document.getElementById("editFecha").value;
  const horaInput = document.getElementById("editHora").value;

  if (!nombre || !telefono || !servicio || !barbero || !fecha || !horaInput) {
    alert("Completa todos los campos.");
    return;
  }

  const selectedDateTime = new Date(`${fecha}T${horaInput}:00`);

  if (selectedDateTime.getTime() < Date.now()) {
    alert("No puedes seleccionar una fecha u hora pasada.");
    return;
  }

  const updatedData = {
    nombre,
    telefono,
    servicio,
    barbero,
    fecha,
    hora: formatTimeTo12Hour(horaInput),
    status: "pending",
    updatedAt: Date.now()
  };

  try {
    await appointmentsRef.child(id).update(updatedData);
    closeEditModal();
    alert("Tu cita fue actualizada correctamente.");
  } catch (error) {
    console.error(error);
    alert("No se pudo actualizar la cita.");
  }
}

async function cancelMyAppointment(id) {
  const app = getAppointmentById(id);

  if (!app) {
    alert("No se encontró esta cita.");
    return;
  }

  if (!canModify(app)) {
    alert("No puedes cancelar esta cita.");
    return;
  }

  const confirmCancel = confirm("¿Seguro que deseas cancelar tu cita?");

  if (!confirmCancel) return;

  try {
    await appointmentsRef.child(id).update({
      status: "cancelled",
      cancelledAt: Date.now()
    });

    alert("Tu cita fue cancelada correctamente.");
  } catch (error) {
    console.error(error);
    alert("No se pudo cancelar la cita.");
  }
}

function createEditModal() {
  const modalHTML = `
    <style>
      .mine-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 8px;
        padding: 5px 9px;
        border-radius: 999px;
        background: rgba(31, 134, 255, 0.12);
        border: 1px solid rgba(31, 134, 255, 0.28);
        color: #d9ecff;
        font-size: 0.72rem;
        font-weight: 900;
        white-space: nowrap;
      }

      .mobile-mine-badge {
        margin-left: 0;
        margin-top: 8px;
        width: fit-content;
      }

      .client-note {
        color: #8ea2bf;
        font-weight: 800;
        font-size: 0.85rem;
        white-space: nowrap;
      }

      .client-actions-wrap {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .client-action-btn {
        min-height: 40px;
        padding: 9px 13px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.1);
        cursor: pointer;
        font-weight: 900;
        transition: 0.22s ease;
      }

      .client-action-btn:hover {
        transform: translateY(-2px);
      }

      .edit-client-btn {
        background: #1f86ff;
        color: #07111f;
      }

      .cancel-client-btn {
        background: rgba(229, 57, 53, 0.12);
        color: #ff9e99;
        border-color: rgba(229, 57, 53, 0.28);
      }

      .client-modal {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(0,0,0,0.72);
        z-index: 9999;
      }

      .client-modal.open {
        display: flex;
      }

      .client-modal-box {
        width: min(720px, 96vw);
        max-height: 92vh;
        overflow-y: auto;
        background: linear-gradient(180deg, #111a27, #0b111b);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 28px;
        padding: 24px;
        box-shadow: 0 28px 80px rgba(0,0,0,0.55);
      }

      .client-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }

      .client-modal-head h2 {
        color: #fff;
        font-size: 1.28rem;
        margin-bottom: 4px;
      }

      .client-modal-head p {
        color: #b8c6da;
        font-size: 0.95rem;
      }

      .client-modal-close {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.05);
        color: #fff;
        cursor: pointer;
        font-size: 1.25rem;
        font-weight: 900;
      }

      .client-edit-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }

      .client-edit-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .client-edit-group label {
        color: #fff;
        font-weight: 900;
        font-size: 0.92rem;
      }

      .client-edit-group input,
      .client-edit-group select {
        min-height: 52px;
        background: #0a1119;
        color: #fff;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 16px;
        padding: 14px 16px;
        outline: none;
      }

      .client-edit-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 18px;
      }

      .client-save-btn,
      .client-close-btn {
        min-height: 50px;
        padding: 12px 20px;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 900;
        border: 1px solid transparent;
      }

      .client-save-btn {
        background: #1f86ff;
        color: #07111f;
      }

      .client-close-btn {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.1);
        color: #fff;
      }

      @media (max-width: 640px) {
        .client-edit-grid {
          grid-template-columns: 1fr;
        }

        .client-save-btn,
        .client-close-btn {
          width: 100%;
        }

        .client-action-btn {
          width: 100%;
        }

        .client-actions-wrap {
          display: grid;
          grid-template-columns: 1fr;
          width: 100%;
        }
      }
    </style>

    <div class="client-modal" id="clientEditModal">
      <div class="client-modal-box">
        <div class="client-modal-head">
          <div>
            <h2>Editar mi cita</h2>
            <p>Solo puedes modificar la cita guardada como tuya en este dispositivo.</p>
          </div>

          <button type="button" class="client-modal-close" id="closeEditModalBtn">×</button>
        </div>

        <form id="clientEditForm">
          <input type="hidden" id="editAppointmentId" />

          <div class="client-edit-grid">
            <div class="client-edit-group">
              <label for="editNombre">Nombre</label>
              <input type="text" id="editNombre" required />
            </div>

            <div class="client-edit-group">
              <label for="editTelefono">Teléfono</label>
              <input type="tel" id="editTelefono" required />
            </div>

            <div class="client-edit-group">
              <label for="editServicio">Servicio</label>
              <select id="editServicio" required>
                <option value="">Seleccionar servicio</option>
                <option value="Corte">Corte</option>
                <option value="Corte y barba">Corte y barba</option>
                <option value="Barba">Barba</option>
                <option value="Cerquillo">Cerquillo</option>
                <option value="Tinte">Tinte</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div class="client-edit-group">
              <label for="editBarbero">Barbero</label>
              <select id="editBarbero" required>
                <option value="">Seleccionar barbero</option>
                <option value="La Pinta">La Pinta</option>
                <option value="Barbero 1">Barbero 1</option>
                <option value="Barbero 2">Barbero 2</option>
              </select>
            </div>

            <div class="client-edit-group">
              <label for="editFecha">Fecha</label>
              <input type="date" id="editFecha" required />
            </div>

            <div class="client-edit-group">
              <label for="editHora">Hora</label>
              <input type="time" id="editHora" required />
            </div>
          </div>

          <div class="client-edit-actions">
            <button type="submit" class="client-save-btn">Guardar cambios</button>
            <button type="button" class="client-close-btn" id="cancelEditModalBtn">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  document.getElementById("clientEditForm").addEventListener("submit", saveEditAppointment);
  document.getElementById("closeEditModalBtn").addEventListener("click", closeEditModal);
  document.getElementById("cancelEditModalBtn").addEventListener("click", closeEditModal);

  document.getElementById("clientEditModal").addEventListener("click", (e) => {
    if (e.target.id === "clientEditModal") {
      closeEditModal();
    }
  });
}

searchInput.addEventListener("input", renderAll);
filterStatus.addEventListener("change", renderAll);
filterBarber.addEventListener("change", renderAll);
filterDate.addEventListener("change", renderAll);
clearFiltersBtn.addEventListener("click", clearFilters);

refreshMyAppointmentData();
createEditModal();
listenAppointments();
