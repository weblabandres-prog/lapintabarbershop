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

const appointmentsView = document.getElementById("appointmentsView");
const resultsInfo = document.getElementById("resultsInfo");

const statTotal = document.getElementById("statTotal");
const statApproved = document.getElementById("statApproved");
const statPending = document.getElementById("statPending");
const statCancelled = document.getElementById("statCancelled");

const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterBarber = document.getElementById("filterBarber");
const filterDate = document.getElementById("filterDate");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

let appointments = [];

function normalizeStatus(status) {
  if (status === "approved") return "approved";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

function normalizeAppointment(id, app) {
  return {
    id,
    nombre: app?.nombre || "",
    telefono: app?.telefono || "",
    servicio: app?.servicio || "",
    barbero: app?.barbero || "",
    fecha: app?.fecha || "",
    agendaDesde: app?.agendaDesde || app?.fecha || "",
    mostrarEnAgendaDosDiasAntes: Boolean(app?.mostrarEnAgendaDosDiasAntes),
    hora: app?.hora || "",
    duration: Number(app?.duration || 0),
    anonimo: Boolean(app?.anonimo),
    metodoPago: app?.metodoPago || "",
    status: normalizeStatus(app?.status),
    createdAt: app?.createdAt || ""
  };
}

function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToISO(baseISO, daysToAdd) {
  const [year, month, day] = String(baseISO).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysToAdd);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function to24Hour(time12) {
  if (!time12) return "00:00";

  const match = String(time12).match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return time12;

  let hour = parseInt(match[1], 10);
  const minutes = match[2];
  const suffix = match[3].toUpperCase();

  if (suffix === "AM" && hour === 12) hour = 0;
  if (suffix === "PM" && hour !== 12) hour += 12;

  return `${String(hour).padStart(2, "0")}:${minutes}`;
}

function formatDateLong(dateString) {
  if (!dateString) return "Sin fecha";

  const [year, month, day] = String(dateString).split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function getDateTitle(dateString) {
  const today = getTodayISO();
  const tomorrow = addDaysToISO(today, 1);

  if (dateString === today) return "Hoy";
  if (dateString === tomorrow) return "Mañana";

  return formatDateLong(dateString);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getStatusClass(status) {
  if (status === "approved") return "status-approved";
  if (status === "cancelled") return "status-cancelled";
  return "status-pending";
}

function getStatusLabel(status) {
  if (status === "approved") return "Aprobada";
  if (status === "cancelled") return "Cancelada";
  return "Pendiente";
}

function yaDebeAparecerEnAgenda(appointment) {
  const hoy = getTodayISO();

  if (!appointment.fecha) return false;

  if (appointment.mostrarEnAgendaDosDiasAntes === true) {
    const visibleDesde = appointment.agendaDesde || appointment.fecha;
    return visibleDesde <= hoy;
  }

  return true;
}

function updateStats(list) {
  statTotal.textContent = list.length;
  statApproved.textContent = list.filter(item => item.status === "approved").length;
  statPending.textContent = list.filter(item => item.status === "pending").length;
  statCancelled.textContent = list.filter(item => item.status === "cancelled").length;
}

function populateBarberFilter(list) {
  const currentValue = filterBarber.value;
  const barberos = [...new Set(list.map(item => item.barbero).filter(Boolean))].sort();

  filterBarber.innerHTML = '<option value="all">Todos</option>';

  barberos.forEach(barbero => {
    const option = document.createElement("option");
    option.value = barbero;
    option.textContent = barbero;
    filterBarber.appendChild(option);
  });

  if ([...filterBarber.options].some(opt => opt.value === currentValue)) {
    filterBarber.value = currentValue;
  } else {
    filterBarber.value = "all";
  }
}

function getFilteredAppointments() {
  const search = (searchInput.value || "").trim().toLowerCase();
  const status = filterStatus.value || "all";
  const barber = filterBarber.value || "all";
  const date = filterDate.value || "";

  return appointments
    .filter(item => {
      const nombreVisible = item.anonimo ? "anónimo" : item.nombre;
      const visibleEnAgenda = yaDebeAparecerEnAgenda(item);

      const matchesSearch =
        !search ||
        [
          item.nombre,
          nombreVisible,
          item.telefono,
          item.servicio,
          item.barbero,
          item.fecha,
          item.hora
        ].some(field => String(field || "").toLowerCase().includes(search));

      const matchesStatus = status === "all" || item.status === status;
      const matchesBarber = barber === "all" || item.barbero === barber;
      const matchesDate = !date || item.fecha === date;

      return visibleEnAgenda && matchesSearch && matchesStatus && matchesBarber && matchesDate;
    })
    .sort((a, b) => {
      const aKey = `${a.fecha} ${to24Hour(a.hora)}`;
      const bKey = `${b.fecha} ${to24Hour(b.hora)}`;
      return aKey.localeCompare(bKey);
    });
}

function groupAppointmentsByDate(list) {
  const groups = {};

  list.forEach(item => {
    if (!groups[item.fecha]) {
      groups[item.fecha] = [];
    }
    groups[item.fecha].push(item);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  return sortedDates.map(date => ({
    date,
    title: getDateTitle(date),
    longDate: formatDateLong(date),
    items: groups[date]
  }));
}

function renderGroupedAppointments(list) {
  appointmentsView.innerHTML = "";

  if (!list.length) {
    appointmentsView.innerHTML = `
      <div class="empty-state">
        No hay citas que coincidan con los filtros actuales.
      </div>
    `;
    resultsInfo.textContent = "No se encontraron citas.";
    return;
  }

  const grouped = groupAppointmentsByDate(list);
  resultsInfo.textContent = `${list.length} cita(s) encontradas, organizadas por fecha.`;

  grouped.forEach(group => {
    const section = document.createElement("section");
    section.className = "date-group";

    const rowsHTML = group.items.map(item => {
      const clientName = item.anonimo ? "Anónimo" : (item.nombre || "Cliente");

      return `
        <tr>
          <td><span class="client-name">${escapeHTML(clientName)}</span></td>
          <td><span class="service-name">${escapeHTML(item.servicio || "-")}</span></td>
          <td>${escapeHTML(item.barbero || "-")}</td>
          <td>${escapeHTML(item.hora || "-")}</td>
          <td>${escapeHTML(String(item.duration || 0))} min</td>
          <td>
            <span class="status-pill ${getStatusClass(item.status)}">
              ${escapeHTML(getStatusLabel(item.status))}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    const mobileCardsHTML = group.items.map(item => {
      const clientName = item.anonimo ? "Anónimo" : (item.nombre || "Cliente");

      return `
        <article class="mobile-row-card">
          <div class="mobile-row-top">
            <h4>${escapeHTML(item.servicio || "-")}</h4>
            <span class="status-pill ${getStatusClass(item.status)}">
              ${escapeHTML(getStatusLabel(item.status))}
            </span>
          </div>

          <div class="mobile-row-grid">
            <div class="mobile-info">
              <span>Cliente</span>
              <strong>${escapeHTML(clientName)}</strong>
            </div>

            <div class="mobile-info">
              <span>Barbero</span>
              <strong>${escapeHTML(item.barbero || "-")}</strong>
            </div>

            <div class="mobile-info">
              <span>Hora</span>
              <strong>${escapeHTML(item.hora || "-")}</strong>
            </div>

            <div class="mobile-info">
              <span>Duración</span>
              <strong>${escapeHTML(String(item.duration || 0))} min</strong>
            </div>
          </div>
        </article>
      `;
    }).join("");

    section.innerHTML = `
      <div class="date-group-header">
        <h3>${escapeHTML(group.title)}</h3>
        <p>${escapeHTML(group.longDate)}</p>
      </div>

      <div class="table-shell">
        <table class="appointments-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Barbero</th>
              <th>Hora</th>
              <th>Duración</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>

      <div class="mobile-table-list">
        ${mobileCardsHTML}
      </div>
    `;

    appointmentsView.appendChild(section);
  });
}

function renderAll() {
  const filtered = getFilteredAppointments();
  updateStats(filtered);
  renderGroupedAppointments(filtered);
}

function clearFilters() {
  searchInput.value = "";
  filterStatus.value = "all";
  filterBarber.value = "all";
  filterDate.value = "";
  renderAll();
}

appointmentsRef.on("value", snapshot => {
  const data = snapshot.val() || {};
  appointments = Object.entries(data).map(([id, app]) => normalizeAppointment(id, app));
  populateBarberFilter(appointments);
  renderAll();
});

searchInput.addEventListener("input", renderAll);
filterStatus.addEventListener("change", renderAll);
filterBarber.addEventListener("change", renderAll);
filterDate.addEventListener("change", renderAll);
clearFiltersBtn.addEventListener("click", clearFilters);