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

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();

  if (["approved", "aprobada", "aprobado", "confirmada", "confirmado"].includes(value)) {
    return "approved";
  }

  if (["cancelled", "canceled", "cancelada", "cancelado"].includes(value)) {
    return "cancelled";
  }

  return "pending";
}

function getStatusLabel(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "approved") return "Aprobada";
  if (normalized === "cancelled") return "Cancelada";
  return "Pendiente";
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "approved") return "status-approved";
  if (normalized === "cancelled") return "status-cancelled";
  return "status-pending";
}

function getAppointmentFields(item) {
  return {
    nombre: item?.nombre || item?.cliente || item?.name || "Anónimo",
    telefono: item?.telefono || item?.phone || "No disponible",
    servicio: item?.servicio || item?.service || "No especificado",
    barbero: item?.barbero || item?.barber || "No asignado",
    fecha: item?.fecha || item?.date || "",
    hora: item?.hora || item?.time || "",
    estado: item?.estado || item?.status || "pending",
    duration: item?.duration || 0
  };
}

function formatDateLong(dateStr) {
  if (!dateStr) return "Sin fecha";

  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function parseAppointmentDateTime(dateStr, timeStr) {
  if (!dateStr) return null;

  const safeDate = String(dateStr).trim();
  const safeTime = String(timeStr || "").trim().toUpperCase();

  if (!safeDate) return null;

  if (!safeTime) {
    const dt = new Date(`${safeDate}T23:59:59`);
    return isNaN(dt.getTime()) ? null : dt;
  }

  if (/^([01]?\d|2[0-3]):([0-5]\d)$/.test(safeTime)) {
    const dt = new Date(`${safeDate}T${safeTime}:00`);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const match12h = safeTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12h) {
    let hour = parseInt(match12h[1], 10);
    const minute = match12h[2];
    const period = match12h[3];

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    const hh = String(hour).padStart(2, "0");
    const dt = new Date(`${safeDate}T${hh}:${minute}:00`);
    return isNaN(dt.getTime()) ? null : dt;
  }

  return null;
}

function isAppointmentExpired(item) {
  const { fecha, hora } = getAppointmentFields(item);
  const dt = parseAppointmentDateTime(fecha, hora);

  if (!dt) return false;

  return dt.getTime() < Date.now();
}

function populateBarberFilter(appointments) {
  if (!filterBarber) return;

  const currentValue = filterBarber.value || "all";

  const barbers = [
    ...new Set(
      appointments
        .map((item) => getAppointmentFields(item).barbero)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "es"));

  filterBarber.innerHTML = `<option value="all">Todos</option>`;

  barbers.forEach((barber) => {
    const option = document.createElement("option");
    option.value = barber;
    option.textContent = barber;
    filterBarber.appendChild(option);
  });

  const exists = [...filterBarber.options].some((opt) => opt.value === currentValue);
  filterBarber.value = exists ? currentValue : "all";
}

function getFilteredAppointments() {
  const search = (searchInput?.value || "").trim().toLowerCase();
  const selectedStatus = filterStatus?.value || "all";
  const selectedBarber = filterBarber?.value || "all";
  const selectedDate = filterDate?.value || "";

  return allAppointments.filter((item) => {
    const fields = getAppointmentFields(item);

    const searchTarget = [
      fields.nombre,
      fields.telefono,
      fields.servicio,
      fields.barbero
    ].join(" ").toLowerCase();

    const matchesSearch = !search || searchTarget.includes(search);
    const matchesStatus =
      selectedStatus === "all" ||
      normalizeStatus(fields.estado) === selectedStatus;
    const matchesBarber =
      selectedBarber === "all" || fields.barbero === selectedBarber;
    const matchesDate =
      !selectedDate || fields.fecha === selectedDate;

    return matchesSearch && matchesStatus && matchesBarber && matchesDate;
  });
}

function groupByDate(appointments) {
  const groups = {};

  appointments.forEach((item) => {
    const { fecha } = getAppointmentFields(item);
    const dateKey = fecha || "Sin fecha";

    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  });

  Object.keys(groups).forEach((dateKey) => {
    groups[dateKey].sort((a, b) => {
      const aFields = getAppointmentFields(a);
      const bFields = getAppointmentFields(b);

      const aDate = parseAppointmentDateTime(aFields.fecha, aFields.hora);
      const bDate = parseAppointmentDateTime(bFields.fecha, bFields.hora);

      return (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
    });
  });

  return Object.keys(groups)
    .sort((a, b) => {
      if (a === "Sin fecha") return 1;
      if (b === "Sin fecha") return -1;
      return new Date(a) - new Date(b);
    })
    .map((date) => ({
      date,
      items: groups[date]
    }));
}

function renderAppointments() {
  if (!appointmentsView || !resultsInfo) return;

  const filtered = getFilteredAppointments();

  resultsInfo.textContent =
    filtered.length === 1
      ? "Se encontró 1 cita."
      : `Se encontraron ${filtered.length} citas.`;

  if (!filtered.length) {
    appointmentsView.innerHTML = `
      <div class="empty-state">
        No hay citas para mostrar con esos filtros.
      </div>
    `;
    return;
  }

  const groups = groupByDate(filtered);

  appointmentsView.innerHTML = groups.map((group) => {
    const desktopRows = group.items.map((item) => {
      const fields = getAppointmentFields(item);

      return `
        <tr>
          <td><span class="client-name">${escapeHtml(fields.nombre)}</span></td>
          <td>${escapeHtml(fields.telefono)}</td>
          <td><span class="service-name">${escapeHtml(fields.servicio)}</span></td>
          <td>${escapeHtml(fields.barbero)}</td>
          <td>${escapeHtml(fields.hora || "Sin hora")}</td>
          <td>
            <span class="status-pill ${getStatusClass(fields.estado)}">
              ${getStatusLabel(fields.estado)}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    const mobileRows = group.items.map((item) => {
      const fields = getAppointmentFields(item);
      const normalizedStatus = normalizeStatus(fields.estado);

      let mobileStatusClass = "mobile-status-pending";
      if (normalizedStatus === "approved") mobileStatusClass = "mobile-status-approved";
      if (normalizedStatus === "cancelled") mobileStatusClass = "mobile-status-cancelled";

      return `
        <article class="mobile-row-card">
          <h4 class="mobile-service-title">${escapeHtml(fields.servicio)}</h4>

          <div class="mobile-status-pill ${mobileStatusClass}">
            ${getStatusLabel(fields.estado)}
          </div>

          <div class="mobile-fields">
            <div class="mobile-field-box">
              <span class="mobile-field-label">Cliente</span>
              <span class="mobile-field-value">${escapeHtml(fields.nombre)}</span>
            </div>

            <div class="mobile-field-box">
              <span class="mobile-field-label">Barbero</span>
              <span class="mobile-field-value">${escapeHtml(fields.barbero)}</span>
            </div>

            <div class="mobile-field-box">
              <span class="mobile-field-label">Hora</span>
              <span class="mobile-field-value">${escapeHtml(fields.hora || "Sin hora")}</span>
            </div>

            <div class="mobile-field-box">
              <span class="mobile-field-label">Duración</span>
              <span class="mobile-field-value">${fields.duration ? `${fields.duration} min` : "No definida"}</span>
            </div>
          </div>
        </article>
      `;
    }).join("");

    return `
      <div class="date-group">
        <div class="date-group-header">
          <h3>${escapeHtml(formatDateLong(group.date))}</h3>
          <p>${group.items.length} cita(s)</p>
        </div>

        <div class="table-shell">
          <table class="appointments-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Servicio</th>
                <th>Barbero</th>
                <th>Hora</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${desktopRows}
            </tbody>
          </table>
        </div>

        <div class="mobile-table-list">
          ${mobileRows}
        </div>
      </div>
    `;
  }).join("");
}

function updateStats(appointments) {
  if (statTotal) statTotal.textContent = appointments.length;

  if (statApproved) {
    statApproved.textContent = appointments.filter(
      (item) => normalizeStatus(getAppointmentFields(item).estado) === "approved"
    ).length;
  }

  if (statPending) {
    statPending.textContent = appointments.filter(
      (item) => normalizeStatus(getAppointmentFields(item).estado) === "pending"
    ).length;
  }

  if (statCancelled) {
    statCancelled.textContent = appointments.filter(
      (item) => normalizeStatus(getAppointmentFields(item).estado) === "cancelled"
    ).length;
  }
}

async function loadAppointments() {
  try {
    const snapshot = await appointmentsRef.once("value");
    const data = snapshot.val() || {};

    allAppointments = Object.keys(data)
      .map((id) => ({
        id,
        ...data[id]
      }))
      .filter((item) => !isAppointmentExpired(item));

    populateBarberFilter(allAppointments);
    updateStats(allAppointments);
    renderAppointments();
  } catch (error) {
    console.error("Error al cargar citas:", error);

    if (resultsInfo) {
      resultsInfo.textContent = "Error al cargar citas.";
    }

    if (appointmentsView) {
      appointmentsView.innerHTML = `
        <div class="empty-state">
          Error al cargar citas.
        </div>
      `;
    }
  }
}

function setupEvents() {
  if (searchInput) searchInput.addEventListener("input", renderAppointments);
  if (filterStatus) filterStatus.addEventListener("change", renderAppointments);
  if (filterBarber) filterBarber.addEventListener("change", renderAppointments);
  if (filterDate) filterDate.addEventListener("change", renderAppointments);

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (filterStatus) filterStatus.value = "all";
      if (filterBarber) filterBarber.value = "all";
      if (filterDate) filterDate.value = "";
      renderAppointments();
    });
  }
}

function listenRealtime() {
  appointmentsRef.on("value", async () => {
    await loadAppointments();
  });
}

(async function init() {
  setupEvents();
  await loadAppointments();
  listenRealtime();

  setInterval(async () => {
    await loadAppointments();
  }, 60000);
})();
