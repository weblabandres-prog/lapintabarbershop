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
const shopStatusRef = db.ref("shopStatus");
const customClosuresRef = db.ref("customClosures");
const servicesRef = db.ref("services");

const bookingForm = document.getElementById("bookingForm");
const fechaInput = document.getElementById("fecha");
const horaInput = document.getElementById("hora");
const hoursGrid = document.getElementById("hoursGrid");
const appointmentsList = document.getElementById("appointmentsList");
const bookingSummary = document.getElementById("bookingSummary");

const nombreInput = document.getElementById("nombre");
const telefonoInput = document.getElementById("telefono");
const servicioInput = document.getElementById("servicio");
const barberoInput = document.getElementById("barbero");
const anonimoInput = document.getElementById("anonimo");

const metodoEfectivoInput = document.getElementById("metodo_efectivo");
const metodoTransferenciaInput = document.getElementById("metodo_transferencia");
const paymentTransferInfo = document.getElementById("paymentTransferInfo");
const cuentaBanreservasInput = document.getElementById("cuenta_banreservas");
const cuentaPopularInput = document.getElementById("cuenta_popular");

const menuToggle = document.getElementById("menuToggle");
const navPanel = document.getElementById("navPanel");

const btnAprobarMenu = document.getElementById("btnAprobarMenu");
const btnAprobarHero = document.getElementById("btnAprobarHero");
const logoSecret = document.getElementById("logoSecret");

let appointments = [];
let servicesData = {};
let shopIsOpen = true;
let tuesdayForcedOpen = false;
let extendedHours = false;
let customClosures = {};

const EMAILJS_PUBLIC_KEY = "TXQSraRTJ0Ro5hhuk";
const EMAILJS_SERVICE_ID = "service_15uyzin";
const EMAILJS_TEMPLATE_ID = "template_zck2x4i";
const BARBER_EMAIL = "castrovictory1@gmail.com";

if (typeof emailjs !== "undefined") {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

function getServiceDuration(serviceName) {
  if (!serviceName) return 60;
  const serviceObj = Object.values(servicesData).find(s => s.nombre === serviceName);
  return serviceObj && serviceObj.duracion ? Number(serviceObj.duracion) : 60;
}

function getServicePrice(serviceName) {
  if (!serviceName) return 0;
  const serviceObj = Object.values(servicesData).find(s => s.nombre === serviceName);
  return serviceObj && serviceObj.precio ? Number(serviceObj.precio) : 0;
}

const normalWorkingDays = {
  0: null,
  1: { start: "8:00 AM", end: "8:00 PM", breaks: ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM"] },
  2: null,
  3: { start: "8:00 AM", end: "8:00 PM", breaks: ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM"] },
  4: { start: "8:00 AM", end: "8:00 PM", breaks: ["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM"] },
  5: { start: "8:00 AM", end: "9:00 PM", breaks: [] },
  6: { start: "8:00 AM", end: "9:00 PM", breaks: [] }
};

const extendedWorkingDays = {
  0: null,
  1: { start: "8:00 AM", end: "10:00 PM", breaks: [] },
  2: null,
  3: { start: "8:00 AM", end: "10:00 PM", breaks: [] },
  4: { start: "8:00 AM", end: "10:00 PM", breaks: [] },
  5: { start: "8:00 AM", end: "10:00 PM", breaks: [] },
  6: { start: "8:00 AM", end: "10:00 PM", breaks: [] }
};

const normalTuesdaySchedule = {
  start: "8:00 AM",
  end: "8:00 PM",
  breaks: []
};

const extendedTuesdaySchedule = {
  start: "8:00 AM",
  end: "10:00 PM",
  breaks: []
};

function normalizeStatus(status) {
  if (status === "approved") return "approved";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

function generateApproveToken() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getBaseUrl() {
  return "https://weblabandres-prog.github.io/lapintabarbershop";
}

function buildApproveLink(appointmentId, approveToken) {
  if (!appointmentId || !approveToken) {
    return `${getBaseUrl()}/aprobar.html`;
  }
  return `${getBaseUrl()}/aprobar.html?id=${encodeURIComponent(appointmentId)}&token=${encodeURIComponent(approveToken)}`;
}

function showApproveButtons() {
  if (btnAprobarMenu) btnAprobarMenu.style.display = "inline-flex";
  if (btnAprobarHero) btnAprobarHero.style.display = "inline-flex";
}

function hideApproveButtons() {
  if (btnAprobarMenu) btnAprobarMenu.style.display = "none";
  if (btnAprobarHero) btnAprobarHero.style.display = "none";
}

function goToApprovePage() {
  window.location.href = "aprobar.html";
}

function bindHiddenApproveButtons() {
  if (btnAprobarMenu) {
    btnAprobarMenu.addEventListener("click", function (e) {
      e.preventDefault();
      goToApprovePage();
    });
  }

  if (btnAprobarHero) {
    btnAprobarHero.addEventListener("click", function (e) {
      e.preventDefault();
      goToApprovePage();
    });
  }
}

function bindSecretShortcut() {
  if (!logoSecret) return;

  let tapCount = 0;
  let tapTimer = null;
  let lastTriggerTime = 0;

  function resetTaps() {
    tapCount = 0;
    if (tapTimer) {
      clearTimeout(tapTimer);
      tapTimer = null;
    }
  }

  function registerTap(e) {
    const now = Date.now();

    if (now - lastTriggerTime < 350) return;
    lastTriggerTime = now;

    if (e) e.preventDefault();

    tapCount++;

    if (tapTimer) clearTimeout(tapTimer);

    tapTimer = setTimeout(() => {
      resetTaps();
    }, 2000);

    if (tapCount >= 5) {
      resetTaps();
      showApproveButtons();

      setTimeout(() => {
        goToApprovePage();
      }, 150);
    }
  }

  logoSecret.addEventListener("click", registerTap);
}

function parseAnyTimeToMinutes(timeStr) {
  if (!timeStr) return NaN;

  const value = String(timeStr).trim().toUpperCase();

  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
    if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
    return (h * 60) + m;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  if (!match) return NaN;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3];

  if (Number.isNaN(hour) || Number.isNaN(minute)) return NaN;
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return NaN;

  if (suffix === "AM" && hour === 12) hour = 0;
  if (suffix === "PM" && hour !== 12) hour += 12;

  return (hour * 60) + minute;
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
    duration: app?.duration || getServiceDuration(app?.servicio) || 60,
    precio: app?.precio || 0,
    slots: Array.isArray(app?.slots) ? app.slots : [],
    anonimo: Boolean(app?.anonimo),
    metodoPago: app?.metodoPago || "",
    status: normalizeStatus(app?.status),
    approveToken: app?.approveToken || "",
    createdAt: app?.createdAt || new Date().toISOString()
  };
}

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateSafe(dateString) {
  if (!dateString) return "Sin fecha";

  const parts = String(dateString).split("-");
  if (parts.length !== 3) return dateString;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function formatDateISOForSubject(dateString) {
  if (!dateString) return "";
  return String(dateString);
}

function restarDiasAFecha(fechaISO, dias) {
  if (!fechaISO) return fechaISO;

  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);
  fecha.setDate(fecha.getDate() - dias);

  const nuevoYear = fecha.getFullYear();
  const nuevoMonth = String(fecha.getMonth() + 1).padStart(2, "0");
  const nuevoDay = String(fecha.getDate()).padStart(2, "0");

  return `${nuevoYear}-${nuevoMonth}-${nuevoDay}`;
}

function diferenciaDiasDesdeHoy(fechaISO) {
  if (!fechaISO) return 0;

  const hoy = new Date();
  const hoyLimpio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);

  const diffMs = fecha.getTime() - hoyLimpio.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function necesitaPublicarseDosDiasAntes(fechaISO) {
  return diferenciaDiasDesdeHoy(fechaISO) > 15;
}

function setMinDate() {
  if (!fechaInput) return;
  fechaInput.min = getTodayISO();
}

function convertToMinutes(timeStr) {
  const minutes = parseAnyTimeToMinutes(timeStr);
  return Number.isNaN(minutes) ? 0 : minutes;
}

function convertToTime(minutes) {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${String(mins).padStart(2, "0")} ${ampm}`;
}

function generateTimeSlots(start, end, interval = 30) {
  const slots = [];
  let current = convertToMinutes(start);
  const finish = convertToMinutes(end);

  while (current < finish) {
    slots.push(convertToTime(current));
    current += interval;
  }

  return slots;
}

function getDayFromDate(dateString) {
  return new Date(dateString + "T00:00:00").getDay();
}

function normalizeCustomClosure(block, fallbackDate = "") {
  if (!block || typeof block !== "object") return null;

  const fecha = block.fecha || block.date || fallbackDate || "";
  const start = block.start || block.inicio || block.startTime || "";
  const end = block.end || block.fin || block.endTime || "";
  const reason = block.reason || block.motivo || "";

  if (!fecha || !start || !end) return null;

  const startMinutes = parseAnyTimeToMinutes(start);
  const endMinutes = parseAnyTimeToMinutes(end);

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return null;
  if (startMinutes >= endMinutes) return null;

  return {
    fecha,
    start,
    end,
    reason,
    type: "timeBlock"
  };
}

function getCustomClosuresForDate(dateString) {
  if (!dateString || !customClosures) return [];

  const closures = [];

  Object.entries(customClosures).forEach(([key, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;

    const normalized = normalizeCustomClosure(value, key === dateString ? dateString : "");
    if (normalized && normalized.fecha === dateString) {
      closures.push(normalized);
    }
  });

  return closures.sort((a, b) => convertToMinutes(a.start) - convertToMinutes(b.start));
}

function getTimeBlocksForDate(dateString) {
  return getCustomClosuresForDate(dateString).filter(block => block.type === "timeBlock");
}

function getEarlyClosingForDate() {
  return null;
}

function rangesOverlapMinutes(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function isSlotBlockedByCustomClosure(date, startSlot, serviceName) {
  const blocks = getTimeBlocksForDate(date);
  if (!blocks.length) return false;

  const neededBlocks = getServiceBlocks(serviceName);
  const slotStartMinutes = convertToMinutes(startSlot);
  const slotEndMinutes = slotStartMinutes + (neededBlocks * 30);

  return blocks.some(block => {
    const blockStartMinutes = convertToMinutes(block.start);
    const blockEndMinutes = convertToMinutes(block.end);

    if (slotStartMinutes >= blockStartMinutes && slotStartMinutes <= blockEndMinutes) {
      return true;
    }

    return rangesOverlapMinutes(
      slotStartMinutes,
      slotEndMinutes,
      blockStartMinutes,
      blockEndMinutes
    );
  });
}

function getActiveCustomClosureForNow(dateString) {
  const blocks = getTimeBlocksForDate(dateString);
  if (!blocks.length) return null;

  const now = new Date();
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();

  return blocks.find(block => {
    const blockStartMinutes = convertToMinutes(block.start);
    const blockEndMinutes = convertToMinutes(block.end);

    return currentMinutes >= blockStartMinutes && currentMinutes <= blockEndMinutes;
  }) || null;
}

function applySpecialClosingToConfig(dateString, config) {
  return config;
}

function getWorkingConfigByDate(dateString) {
  if (!dateString) return null;

  const day = getDayFromDate(dateString);
  let config = null;

  if (day === 2) {
    if (!tuesdayForcedOpen) return null;
    config = extendedHours ? extendedTuesdaySchedule : normalTuesdaySchedule;
  } else {
    const source = extendedHours ? extendedWorkingDays : normalWorkingDays;
    config = source[day] || null;
  }

  if (!config) return null;

  return applySpecialClosingToConfig(dateString, config);
}

function getServiceBlocks(serviceName) {
  return Math.ceil(getServiceDuration(serviceName) / 30);
}

function shouldShowSlot(slot, serviceName) {
  if (serviceName && serviceName.toLowerCase().includes("niño")) return true;
  return convertToMinutes(slot) % 60 === 0;
}

function isPastDateTime(date, slot) {
  if (!date || !slot) return false;

  const now = new Date();
  const selectedDate = new Date(date + "T00:00:00");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (selectedDate.getTime() !== today.getTime()) {
    return false;
  }

  const slotMinutes = convertToMinutes(slot);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slotMinutes <= currentMinutes;
}

function isSlotAvailable(date, barber, startSlot, serviceName, list) {
  const config = getWorkingConfigByDate(date);
  if (!config) return false;

  const slots = generateTimeSlots(config.start, config.end, 30);
  const breaks = config.breaks || [];
  const neededBlocks = getServiceBlocks(serviceName);
  const startIndex = slots.indexOf(startSlot);

  if (startIndex === -1) return false;
  if (isPastDateTime(date, startSlot)) return false;
  if (isSlotBlockedByCustomClosure(date, startSlot, serviceName)) return false;

  for (let i = 0; i < neededBlocks; i++) {
    const currentSlot = slots[startIndex + i];

    if (!currentSlot || breaks.includes(currentSlot)) return false;
    if (date === getTodayISO() && isPastDateTime(date, currentSlot)) return false;

    for (const app of list) {
      if (app.status === "cancelled") continue;

      if (
        app.fecha === date &&
        app.barbero === barber &&
        Array.isArray(app.slots) &&
        app.slots.includes(currentSlot)
      ) {
        return false;
      }
    }
  }

  return true;
}

function getCuentaTransferenciaSeleccionada() {
  if (cuentaPopularInput?.checked) return "Popular - Ahorro - 853557841";
  return "Banreservas - Ahorro - 960200381";
}

function getMetodoPagoSeleccionado() {
  if (metodoTransferenciaInput?.checked) {
    return `Transferencia | ${getCuentaTransferenciaSeleccionada()}`;
  }
  return "Efectivo";
}

function updatePaymentMethodUI() {
  if (!paymentTransferInfo) return;

  if (metodoTransferenciaInput?.checked) {
    paymentTransferInfo.classList.remove("hidden");
  } else {
    paymentTransferInfo.classList.add("hidden");
  }
}

function limpiarTelefono(valor) {
  return String(valor || "").replace(/[^\d+]/g, "");
}

function normalizarTelefono(valor) {
  let limpio = limpiarTelefono(valor).trim();

  if (!limpio) return "";

  if (limpio.includes("+")) {
    limpio = "+" + limpio.replace(/\+/g, "");
  }

  return limpio;
}

function telefonoValido(phone) {
  const valor = normalizarTelefono(phone);

  if (!valor) return false;

  if (/^(809|829|849)\d{7}$/.test(valor)) return true;
  if (/^\+1\d{10}$/.test(valor)) return true;
  if (/^\d{10}$/.test(valor)) return true;
  if (/^\+\d{8,15}$/.test(valor)) return true;

  return false;
}

function telefonoParaGuardar(valor) {
  return normalizarTelefono(valor);
}

function configurarInputTelefono() {
  if (!telefonoInput) return;

  telefonoInput.setAttribute("inputmode", "tel");
  telefonoInput.setAttribute("maxlength", "16");
  telefonoInput.setAttribute("autocomplete", "tel");
  telefonoInput.setAttribute("placeholder", "Número obligatorio");

  telefonoInput.addEventListener("input", () => {
    let valor = telefonoInput.value;
    valor = valor.replace(/[^\d+]/g, "");

    if (valor.includes("+")) {
      valor = "+" + valor.replace(/\+/g, "");
    }

    telefonoInput.value = valor.slice(0, 16);
    updateSummary();
  });

  telefonoInput.addEventListener("blur", () => {
    const valor = telefonoInput.value.trim();

    if (!valor) return;

    if (!telefonoValido(valor)) {
      telefonoInput.setCustomValidity("Ingresa un número válido. Ejemplo: 8493767710, 3055551234 o +34612345678");
    } else {
      telefonoInput.setCustomValidity("");
    }

    telefonoInput.reportValidity();
  });

  telefonoInput.addEventListener("focus", () => {
    telefonoInput.setCustomValidity("");
  });
}

function renderHours() {
  if (!hoursGrid) return;

  hoursGrid.innerHTML = "";

  const selectedDate = fechaInput?.value || "";
  const selectedBarber = barberoInput?.value || "";
  const selectedService = servicioInput?.value || "";

  if (!selectedDate) {
    hoursGrid.innerHTML = '<p style="color:#93a3bd; grid-column: 1/-1;">Selecciona primero una fecha.</p>';
    return;
  }

  if (!selectedBarber) {
    hoursGrid.innerHTML = '<p style="color:#93a3bd; grid-column: 1/-1;">Selecciona primero un barbero.</p>';
    return;
  }

  if (!selectedService) {
    hoursGrid.innerHTML = '<p style="color:#93a3bd; grid-column: 1/-1;">Selecciona primero un servicio.</p>';
    return;
  }

  const config = getWorkingConfigByDate(selectedDate);

  if (!config) {
    hoursGrid.innerHTML = '<p style="color:#93a3bd; grid-column: 1/-1;">Este día está cerrado.</p>';
    return;
  }

  const timeBlocks = getTimeBlocksForDate(selectedDate);

  if (timeBlocks.length) {
    const info = document.createElement("div");
    info.style.color = "#93a3bd";
    info.style.gridColumn = "1 / -1";
    info.style.marginBottom = "10px";
    info.style.lineHeight = "1.6";

    const detail = timeBlocks
      .map(block => `${block.start} - ${block.end}${block.reason ? ` (${block.reason})` : ""}`)
      .join(" | ");

    info.textContent = `Bloques cerrados para esta fecha: ${detail}`;
    hoursGrid.appendChild(info);
  }

  const allSlots = generateTimeSlots(config.start, config.end, 30);
  const visibleSlots = allSlots.filter(slot => shouldShowSlot(slot, selectedService));

  if (selectedService.toLowerCase().includes("niño")) {
    const info = document.createElement("p");
    info.style.color = "#93a3bd";
    info.style.gridColumn = "1 / -1";
    info.style.marginBottom = "8px";
    info.textContent = "Corte de niño usa media hora.";
    hoursGrid.appendChild(info);
  }

  let availableCount = 0;

  visibleSlots.forEach(slot => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("hour-btn");
    btn.textContent = slot;

    const available = isSlotAvailable(
      selectedDate,
      selectedBarber,
      slot,
      selectedService,
      appointments
    );

    if (!available) {
      btn.classList.add("disabled");
      btn.disabled = true;
      btn.title = "Hora no disponible";
    } else {
      availableCount++;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".hour-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (horaInput) horaInput.value = slot;
        updateSummary();
      });
    }

    hoursGrid.appendChild(btn);
  });

  if (!availableCount) {
    const empty = document.createElement("p");
    empty.style.color = "#93a3bd";
    empty.style.gridColumn = "1 / -1";
    empty.style.marginTop = "10px";
    empty.textContent = "No quedan horarios disponibles para esta selección.";
    hoursGrid.appendChild(empty);
  }
}

function updateSummary() {
  if (!bookingSummary) return;

  const nombre = nombreInput?.value.trim() || "-";
  const telefono = telefonoInput?.value.trim() || "-";
  const servicio = servicioInput?.value || "-";
  const barbero = barberoInput?.value || "-";
  const fecha = fechaInput?.value ? formatDateSafe(fechaInput.value) : "-";
  const hora = horaInput?.value || "-";

  const duration = getServiceDuration(servicio);
  const precio = getServicePrice(servicio);

  const anonimo = anonimoInput?.checked ? "Sí" : "No";
  const nombrePublico = anonimo === "Sí" ? "Anónimo" : nombre;
  const metodoPago = getMetodoPagoSeleccionado() || "-";
  const estadoBarberia = shopIsOpen ? "Abierta" : "Cerrada";

  bookingSummary.innerHTML = `
    <p><strong>Nombre real:</strong> ${nombre}</p>
    <p><strong>Nombre en público:</strong> ${nombrePublico}</p>
    <p><strong>Teléfono:</strong> ${telefono}</p>
    <p><strong>Servicio:</strong> ${servicio}</p>
    <p><strong>Precio:</strong> ${precio ? `RD$${precio}` : "-"}</p>
    <p><strong>Barbero:</strong> ${barbero}</p>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Hora:</strong> ${hora}</p>
    <p><strong>Duración:</strong> ${duration} minutos</p>
    <p><strong>Anónimo en público:</strong> ${anonimo}</p>
    <p><strong>Método de pago:</strong> ${metodoPago}</p>
    <p><strong>Estado barbería:</strong> ${estadoBarberia}</p>
  `;
}

function renderAppointments() {
  if (!appointmentsList) return;

  const publicStatTotal = document.getElementById("publicStatTotal");
  const publicStatApproved = document.getElementById("publicStatApproved");
  const publicStatPending = document.getElementById("publicStatPending");
  const todayISO = getTodayISO();

  const publicAppointments = appointments.filter(app => {
    if (app.status === "cancelled") return false;
    const agendaVisibleDate = app.agendaDesde || app.fecha;
    return agendaVisibleDate <= todayISO;
  });

  const orderedAppointments = [...publicAppointments].sort((a, b) => {
    const aValue = `${a.fecha} ${to24Hour(a.hora)}`;
    const bValue = `${b.fecha} ${to24Hour(b.hora)}`;
    return aValue.localeCompare(bValue);
  });

  const approvedCount = orderedAppointments.filter(app => app.status === "approved").length;
  const pendingCount = orderedAppointments.filter(app => app.status === "pending").length;

  if (publicStatTotal) publicStatTotal.textContent = orderedAppointments.length;
  if (publicStatApproved) publicStatApproved.textContent = approvedCount;
  if (publicStatPending) publicStatPending.textContent = pendingCount;

  appointmentsList.innerHTML = "";

  if (!orderedAppointments.length) {
    appointmentsList.innerHTML = `
      <div class="public-empty-state">
        <h3>No hay citas agendadas</h3>
        <p>Cuando entren nuevas reservas aparecerán aquí automáticamente.</p>
      </div>
    `;
    return;
  }

  orderedAppointments.forEach(app => {
    const item = document.createElement("article");
    item.classList.add("appointment-item");

    const publicStatus =
      app.status === "approved"
        ? '<span class="public-status approved">Aprobada</span>'
        : '<span class="public-status pending">Pendiente</span>';

    const publicName = app.anonimo === true ? "Anónimo" : (app.nombre || "Cliente");
    const price = app.precio || getServicePrice(app.servicio);

    item.innerHTML = `
      <div class="appointment-top">
        <div class="appointment-title-box">
          <h3>${escapeHTML(app.servicio)}</h3>
          <div class="appointment-subtitle">Reserva pública visible para clientes</div>
        </div>
        ${publicStatus}
      </div>

      <div class="appointment-meta-grid">
        <div class="appointment-meta-card">
          <span>Cliente</span>
          <strong>${escapeHTML(publicName)}</strong>
        </div>

        <div class="appointment-meta-card">
          <span>Barbero</span>
          <strong>${escapeHTML(app.barbero)}</strong>
        </div>

        <div class="appointment-meta-card">
          <span>Fecha</span>
          <strong>${escapeHTML(formatDateSafe(app.fecha))}</strong>
        </div>

        <div class="appointment-meta-card">
          <span>Hora</span>
          <strong>${escapeHTML(app.hora)}</strong>
        </div>

        <div class="appointment-meta-card">
          <span>Duración</span>
          <strong>${escapeHTML(String(app.duration))} min</strong>
        </div>

        <div class="appointment-meta-card">
          <span>Precio</span>
          <strong>RD$${escapeHTML(String(price))}</strong>
        </div>
      </div>
    `;

    appointmentsList.appendChild(item);
  });
}

function listenAppointments() {
  appointmentsRef.on("value", snapshot => {
    const data = snapshot.val() || {};
    appointments = Object.entries(data).map(([id, app]) => normalizeAppointment(id, app));

    if (appointmentsList) renderAppointments();
    renderHours();
    updateSummary();
  });
}

function listenShopStatus() {
  shopStatusRef.on("value", snapshot => {
    const data = snapshot.val() || {};
    shopIsOpen = data.isOpen !== false;
    tuesdayForcedOpen = data.tuesdayOpen === true;
    extendedHours = data.extendedHours === true;

    updateShopStatusBadge();
    renderHours();
    updateSummary();
  });
}

function listenCustomClosures() {
  customClosuresRef.on("value", snapshot => {
    customClosures = snapshot.val() || {};
    renderHours();
    updateShopStatusBadge();
    updateSummary();
  });
}

function listenServices() {
  servicesRef.on("value", snapshot => {
    servicesData = snapshot.val() || {};
    updateSummary();
    renderHours();
    if (appointmentsList) renderAppointments();
  });
}

async function sendAppointmentEmail(appointment, appointmentId) {
  if (typeof emailjs === "undefined") {
    throw new Error("EmailJS no está cargado.");
  }

  const approvalLink = buildApproveLink(appointmentId, appointment.approveToken);

  const templateParams = {
    to_email: BARBER_EMAIL,
    nombre: appointment.nombre || "",
    telefono: appointment.telefono || "",
    servicio: appointment.servicio || "",
    barbero: appointment.barbero || "",
    fecha: formatDateSafe(appointment.fecha) || "",
    fecha_iso: formatDateISOForSubject(appointment.fecha) || "",
    hora: appointment.hora || "",
    duration: `${appointment.duration || 0} min`,
    precio: `RD$${appointment.precio || getServicePrice(appointment.servicio)}`,
    metodo_pago: appointment.metodoPago || "Efectivo",
    approval_link: approvalLink
  };

  return emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams
  );
}

function formatStatusTime(time24or12) {
  if (!time24or12) return "";

  if (/AM|PM/i.test(time24or12)) {
    return time24or12;
  }

  const [hourStr, minute] = time24or12.split(":");
  let hour = parseInt(hourStr, 10);
  const suffix = hour >= 12 ? "PM" : "AM";

  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return `${hour}:${minute} ${suffix}`;
}

function getNextOpenInfoFromDate(baseDate = new Date()) {
  const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + i);

    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, "0");
    const dayNum = String(nextDate.getDate()).padStart(2, "0");
    const iso = `${year}-${month}-${dayNum}`;

    const config = getWorkingConfigByDate(iso);

    if (config) {
      const dayName = dayNames[nextDate.getDay()];
      return {
        dayName,
        open: formatStatusTime(config.start)
      };
    }
  }

  return null;
}

/*
  CAMBIO IMPORTANTE:
  La portada ahora sigue la lógica del admin para el estado general.
  Solo mostrará "cerrado" si:
  - el switch general está cerrado
  - es martes y martes no está habilitado
  - hay un bloque de horas activo en este momento
*/
function getShopStatus() {
  const now = new Date();
  const todayISO = getTodayISO();
  const todayDay = getDayFromDate(todayISO);

  if (!shopIsOpen) {
    return {
      type: "closed",
      text: "Cerrado • Puedes agendar para otro día u hora disponible",
      showBanner: true
    };
  }

  if (todayDay === 2 && !tuesdayForcedOpen) {
    return {
      type: "closed",
      text: "Martes cerrado • Puedes agendar para otro día u hora disponible",
      showBanner: true
    };
  }

  const activeBlock = getActiveCustomClosureForNow(todayISO);
  if (activeBlock) {
    return {
      type: "closed",
      text: `Cerrado por bloque de horas • Volvemos a las ${formatStatusTime(activeBlock.end)}`,
      showBanner: true
    };
  }

  const config = getWorkingConfigByDate(todayISO);

  if (config) {
    return {
      type: "open",
      text: `Abierto hoy • ${config.start} - ${config.end}`,
      showBanner: false
    };
  }

  return {
    type: "open",
    text: "Abierta • Puedes agendar tu cita",
    showBanner: false
  };
}

function updateShopStatusBadge() {
  const badge = document.getElementById("shopStatusBadge");
  const closedBanner = document.getElementById("shopClosedBanner");

  if (!badge) return;

  const status = getShopStatus();

  badge.classList.remove("open", "break", "closed");
  badge.classList.add(status.type);
  badge.textContent = status.text;

  if (closedBanner) {
    closedBanner.classList.toggle("show", status.showBanner === true);
  }
}

function applyServiceFromURL() {
  if (!servicioInput) return;

  const params = new URLSearchParams(window.location.search);
  const servicioURL = params.get("servicio");

  if (servicioURL) {
    servicioInput.value = servicioURL;
  }
}

function isAppointmentPast(app) {
  if (!app?.fecha || !app?.hora) return false;

  const dateTime = new Date(`${app.fecha}T${to24Hour(app.hora)}:00`);
  if (Number.isNaN(dateTime.getTime())) return false;

  return dateTime.getTime() < Date.now();
}

async function cleanupPastAppointments() {
  try {
    const snapshot = await appointmentsRef.once("value");
    const data = snapshot.val() || {};
    const updates = {};

    Object.entries(data).forEach(([id, app]) => {
      if (isAppointmentPast(app)) {
        updates[id] = null;
      }
    });

    if (Object.keys(updates).length > 0) {
      await appointmentsRef.update(updates);
      console.log("Citas pasadas eliminadas:", Object.keys(updates).length);
    }
  } catch (error) {
    console.error("Error eliminando citas pasadas:", error);
  }
}

if (bookingForm) {
  bookingForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const telefonoLimpio = telefonoParaGuardar(telefonoInput?.value || "");
    const nombre = nombreInput?.value.trim() || "";

    if (!nombre) {
      alert("Por favor escribe tu nombre.");
      nombreInput?.focus();
      return;
    }

    if (!telefonoLimpio) {
      alert("Por favor escribe tu número de teléfono.");
      telefonoInput?.focus();
      return;
    }

    if (!telefonoValido(telefonoLimpio)) {
      alert("Ingresa un número válido. Ejemplo RD: 8493767710, USA: 3055551234, Europa: +34612345678");
      telefonoInput?.focus();
      return;
    }

    if (telefonoInput) {
      telefonoInput.value = telefonoLimpio;
      telefonoInput.setCustomValidity("");
    }

    if (!horaInput?.value) {
      alert("Por favor selecciona una hora disponible.");
      return;
    }

    const selectedService = servicioInput?.value || "";
    const selectedDate = fechaInput?.value || "";
    const selectedBarber = barberoInput?.value || "";
    const selectedHour = horaInput?.value || "";

    const mostrarEnAgendaDosDiasAntes = necesitaPublicarseDosDiasAntes(selectedDate);
    const agendaDesde = mostrarEnAgendaDosDiasAntes
      ? restarDiasAFecha(selectedDate, 2)
      : selectedDate;

    if (!selectedService || !selectedDate || !selectedBarber) {
      alert("Completa todos los campos requeridos.");
      return;
    }

    if (!isSlotAvailable(selectedDate, selectedBarber, selectedHour, selectedService, appointments)) {
      alert("Esa hora ya no está disponible. Por favor elige otra.");
      renderHours();
      return;
    }

    const config = getWorkingConfigByDate(selectedDate);

    if (!config) {
      alert("Ese día no está disponible.");
      return;
    }

    const slots = generateTimeSlots(config.start, config.end, 30);
    const neededBlocks = getServiceBlocks(selectedService);
    const startIndex = slots.indexOf(selectedHour);

    if (startIndex === -1) {
      alert("La hora seleccionada no es válida.");
      renderHours();
      return;
    }

    const reservedSlots = [];
    for (let i = 0; i < neededBlocks; i++) {
      if (slots[startIndex + i]) {
        reservedSlots.push(slots[startIndex + i]);
      }
    }

    const newAppointment = {
      nombre: nombre,
      telefono: telefonoLimpio,
      servicio: selectedService,
      barbero: selectedBarber,
      fecha: selectedDate,
      agendaDesde: agendaDesde,
      mostrarEnAgendaDosDiasAntes: mostrarEnAgendaDosDiasAntes,
      hora: selectedHour,
      duration: getServiceDuration(selectedService),
      precio: getServicePrice(selectedService),
      slots: reservedSlots,
      anonimo: anonimoInput?.checked || false,
      metodoPago: getMetodoPagoSeleccionado(),
      status: "pending",
      approveToken: generateApproveToken(),
      createdAt: new Date().toISOString()
    };

    const submitButton = bookingForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "Confirmar cita";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Procesando...";
      }

      const newRef = appointmentsRef.push();
      await newRef.set(newAppointment);

      const appointmentId = newRef.key;

      try {
        await sendAppointmentEmail(newAppointment, appointmentId);

        if (mostrarEnAgendaDosDiasAntes) {
          alert(
            `✅ Cita agendada correctamente. Se envió el correo y la cita quedó pendiente de aprobación. Tu cita está pautada para el ${formatDateSafe(selectedDate)} y aparecerá en la agenda desde el ${formatDateSafe(agendaDesde)}, porque fue reservada con más de 15 días de anticipación.`
          );
        } else {
          alert("✅ Cita agendada correctamente. Se envió el correo y la cita quedó pendiente de aprobación.");
        }
      } catch (emailError) {
        console.error("Error enviando correo:", emailError);

        if (mostrarEnAgendaDosDiasAntes) {
          alert(
            `✅ La cita fue agendada y quedó pendiente de aprobación, pero el correo no se pudo enviar. Tu cita está pautada para el ${formatDateSafe(selectedDate)} y aparecerá en la agenda desde el ${formatDateSafe(agendaDesde)}, porque fue reservada con más de 15 días de anticipación.`
          );
        } else {
          alert(
            "✅ La cita fue agendada y quedó pendiente de aprobación, pero el correo no se pudo enviar: " +
            (emailError?.text || emailError?.message || "Error desconocido")
          );
        }
      }

      bookingForm.reset();
      if (horaInput) horaInput.value = "";
      if (metodoEfectivoInput) metodoEfectivoInput.checked = true;
      if (cuentaBanreservasInput) cuentaBanreservasInput.checked = true;

      updatePaymentMethodUI();
      updateSummary();
      renderHours();
    } catch (firebaseError) {
      console.error("Error guardando cita:", firebaseError);
      alert("No se pudo guardar la cita en Firebase.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

if (menuToggle && navPanel) {
  menuToggle.addEventListener("click", function () {
    navPanel.classList.toggle("open");
    menuToggle.classList.toggle("active");

    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
  });

  navPanel.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function () {
      navPanel.classList.remove("open");
      menuToggle.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", function (e) {
    if (
      window.innerWidth <= 1100 &&
      !navPanel.contains(e.target) &&
      !menuToggle.contains(e.target)
    ) {
      navPanel.classList.remove("open");
      menuToggle.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

document.querySelectorAll(".select-service-btn").forEach(btn => {
  btn.addEventListener("click", function (e) {
    if (!servicioInput) return;

    e.preventDefault();
    servicioInput.value = this.getAttribute("data-service") || "";

    if (horaInput) horaInput.value = "";

    renderHours();
    updateSummary();

    const target =
      document.getElementById("bookingForm") ||
      document.getElementById("reservas") ||
      bookingForm;

    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

fechaInput?.addEventListener("change", () => {
  if (horaInput) horaInput.value = "";
  renderHours();
  updateSummary();
});

barberoInput?.addEventListener("change", () => {
  if (horaInput) horaInput.value = "";
  renderHours();
  updateSummary();
});

servicioInput?.addEventListener("change", () => {
  if (horaInput) horaInput.value = "";
  renderHours();
  updateSummary();
});

[nombreInput].forEach(input => {
  input?.addEventListener("input", updateSummary);
});

anonimoInput?.addEventListener("change", updateSummary);

metodoEfectivoInput?.addEventListener("change", () => {
  updatePaymentMethodUI();
  updateSummary();
});

metodoTransferenciaInput?.addEventListener("change", () => {
  updatePaymentMethodUI();
  updateSummary();
});

cuentaBanreservasInput?.addEventListener("change", updateSummary);
cuentaPopularInput?.addEventListener("change", updateSummary);

applyServiceFromURL();
setMinDate();
hideApproveButtons();
bindHiddenApproveButtons();
bindSecretShortcut();
configurarInputTelefono();
listenAppointments();
listenShopStatus();
listenCustomClosures();
listenServices();
updatePaymentMethodUI();
renderHours();
updateSummary();
updateShopStatusBadge();
cleanupPastAppointments();

setInterval(() => {
  updateShopStatusBadge();

  const selectedDate = fechaInput?.value || "";
  const selectedBarber = barberoInput?.value || "";
  const selectedService = servicioInput?.value || "";
  const selectedHour = horaInput?.value || "";

  cleanupPastAppointments();

  if (!selectedDate || !selectedBarber || !selectedService) return;

  if (selectedDate === getTodayISO()) {
    renderHours();

    if (
      selectedHour &&
      !isSlotAvailable(selectedDate, selectedBarber, selectedHour, selectedService, appointments)
    ) {
      if (horaInput) horaInput.value = "";
      updateSummary();
    }
  }
}, 30000);

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
