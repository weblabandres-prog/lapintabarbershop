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

let allAppointments = [];

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
    status: normalizeStatus(app?.status)
  };
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
              </tr>
            </thead>
            <tbody>
              ${items.map(app => `
                <tr>
                  <td>
                    <span class="client-name">${escapeHTML(app.anonimo ? "Anónimo" : app.nombre)}</span>
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
                <h4 class="mobile-service-title">${escapeHTML(app.servicio)}</h4>

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
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `;
  });

  appointmentsView.innerHTML = html;
}

function renderAll() {
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

searchInput.addEventListener("input", renderAll);
filterStatus.addEventListener("change", renderAll);
filterBarber.addEventListener("change", renderAll);
filterDate.addEventListener("change", renderAll);
clearFiltersBtn.addEventListener("click", clearFilters);

listenAppointments();
