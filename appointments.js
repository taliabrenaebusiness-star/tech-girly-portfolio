// Client Appointment Tracker
// Appointments are saved in localStorage so they stay after refreshing the page.

const appointmentStorageKey = "taliaClientAppointments";
const darkModeKey = "taliaWikiDarkMode";

// Page elements.
const appointmentForm = document.getElementById("appointmentForm");
const formTitle = document.getElementById("formTitle");
const clientName = document.getElementById("clientName");
const clientPhone = document.getElementById("clientPhone");
const appointmentDate = document.getElementById("appointmentDate");
const appointmentTime = document.getElementById("appointmentTime");
const serviceType = document.getElementById("serviceType");
const setLength = document.getElementById("setLength");
const setShape = document.getElementById("setShape");
const depositAmount = document.getElementById("depositAmount");
const totalPrice = document.getElementById("totalPrice");
const appointmentStatus = document.getElementById("appointmentStatus");
const appointmentNotes = document.getElementById("appointmentNotes");
const saveAppointmentButton = document.getElementById("saveAppointmentButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const appointmentSearch = document.getElementById("appointmentSearch");
const statusFilter = document.getElementById("statusFilter");
const sortAppointments = document.getElementById("sortAppointments");
const appointmentsList = document.getElementById("appointmentsList");
const emptyAppointments = document.getElementById("emptyAppointments");
const darkModeToggle = document.getElementById("darkModeToggle");

const upcomingCount = document.getElementById("upcomingCount");
const todayCount = document.getElementById("todayCount");
const completedCount = document.getElementById("completedCount");
const expectedTotal = document.getElementById("expectedTotal");

let appointments = JSON.parse(localStorage.getItem(appointmentStorageKey)) || [];
let appointmentBeingEdited = null;

// Save appointments to localStorage.
function saveAppointments() {
  localStorage.setItem(appointmentStorageKey, JSON.stringify(appointments));
}

// Make sure older saved appointments have every field.
function normalizeAppointment(appointment) {
  return {
    id: String(appointment.id || Date.now()),
    clientName: appointment.clientName || "Unnamed Client",
    clientPhone: appointment.clientPhone || "",
    date: appointment.date || "",
    time: appointment.time || "",
    service: appointment.service || "Appointment",
    length: appointment.length || "",
    shape: appointment.shape || "",
    deposit: Number(appointment.deposit) || 0,
    totalPrice: Number(appointment.totalPrice) || 0,
    status: appointment.status || "Booked",
    notes: appointment.notes || "",
    createdAt: appointment.createdAt || Date.now(),
    updatedAt: appointment.updatedAt || appointment.createdAt || Date.now()
  };
}

appointments = appointments.map(normalizeAppointment);

// Format currency for dashboard and appointment cards.
function formatMoney(amount) {
  return "$" + Number(amount || 0).toLocaleString();
}

// Keep typed client text safe when it is displayed inside appointment cards.
function escapeText(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Format the appointment date in a friendly way.
function formatAppointmentDate(dateValue) {
  if (!dateValue) {
    return "No date";
  }

  return new Date(dateValue + "T00:00:00").toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// Format time from 24-hour input into a friendly display.
function formatAppointmentTime(timeValue) {
  if (!timeValue) {
    return "No time";
  }

  return new Date("2026-01-01T" + timeValue).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

// Create a Date object for sorting appointments.
function getAppointmentDateTime(appointment) {
  if (!appointment.date || !appointment.time) {
    return new Date(0);
  }

  return new Date(appointment.date + "T" + appointment.time);
}

// Check whether an appointment is today.
function isToday(appointment) {
  const today = new Date().toISOString().slice(0, 10);
  return appointment.date === today;
}

// Check whether an appointment is still upcoming.
function isUpcoming(appointment) {
  const appointmentDateTime = getAppointmentDateTime(appointment);
  const inactiveStatuses = ["Completed", "Cancelled", "No Show"];

  return appointmentDateTime >= new Date() && !inactiveStatuses.includes(appointment.status);
}

// Update dashboard numbers.
function renderDashboard() {
  const upcoming = appointments.filter(isUpcoming).length;
  const today = appointments.filter(isToday).length;
  const completed = appointments.filter(function (appointment) {
    return appointment.status === "Completed";
  }).length;
  const expected = appointments.reduce(function (sum, appointment) {
    if (appointment.status === "Cancelled" || appointment.status === "No Show") {
      return sum;
    }

    return sum + appointment.totalPrice;
  }, 0);

  upcomingCount.textContent = upcoming;
  todayCount.textContent = today;
  completedCount.textContent = completed;
  expectedTotal.textContent = formatMoney(expected);
}

// Get appointments after search, filter, and sort.
function getVisibleAppointments() {
  const searchText = appointmentSearch.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  const selectedSort = sortAppointments.value;

  let visibleAppointments = appointments.filter(function (appointment) {
    const matchesSearch =
      appointment.clientName.toLowerCase().includes(searchText) ||
      appointment.clientPhone.toLowerCase().includes(searchText) ||
      appointment.service.toLowerCase().includes(searchText);
    const matchesStatus = selectedStatus === "all" || appointment.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (selectedSort === "client") {
    visibleAppointments.sort(function (a, b) {
      return a.clientName.localeCompare(b.clientName);
    });
  } else if (selectedSort === "newest") {
    visibleAppointments.sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
  } else {
    visibleAppointments.sort(function (a, b) {
      const now = new Date();
      const aTime = getAppointmentDateTime(a);
      const bTime = getAppointmentDateTime(b);
      const aIsUpcoming = aTime >= now;
      const bIsUpcoming = bTime >= now;

      if (aIsUpcoming && !bIsUpcoming) {
        return -1;
      }

      if (!aIsUpcoming && bIsUpcoming) {
        return 1;
      }

      return aIsUpcoming ? aTime - bTime : bTime - aTime;
    });
  }

  return visibleAppointments;
}

// Create a status class for each appointment pill.
function getStatusClass(status) {
  return "status-" + status.toLowerCase().replace(/\s+/g, "-");
}

// Show appointment cards.
function renderAppointments() {
  const visibleAppointments = getVisibleAppointments();
  appointmentsList.innerHTML = "";
  emptyAppointments.classList.toggle("hidden", visibleAppointments.length > 0);

  visibleAppointments.forEach(function (appointment) {
    const appointmentCard = document.createElement("article");
    const balance = Math.max(0, appointment.totalPrice - appointment.deposit);

    appointmentCard.className = "appointment-item";
    appointmentCard.innerHTML =
      "<div class='appointment-topline'>" +
      "<div>" +
      "<h3>" + escapeText(appointment.clientName) + "</h3>" +
      "<span class='appointment-contact'>" + escapeText(appointment.clientPhone || "No contact added") + "</span>" +
      "</div>" +
      "<span class='status-pill " + getStatusClass(appointment.status) + "'>" + escapeText(appointment.status) + "</span>" +
      "</div>" +
      "<div class='appointment-details'>" +
      "<div class='appointment-detail'><span>Date</span><strong>" + formatAppointmentDate(appointment.date) + "</strong></div>" +
      "<div class='appointment-detail'><span>Time</span><strong>" + formatAppointmentTime(appointment.time) + "</strong></div>" +
      "<div class='appointment-detail'><span>Service</span><strong>" + escapeText(appointment.service) + "</strong></div>" +
      "<div class='appointment-detail'><span>Length</span><strong>" + escapeText(appointment.length || "Not sure yet") + "</strong></div>" +
      "<div class='appointment-detail'><span>Shape</span><strong>" + escapeText(appointment.shape || "Not sure yet") + "</strong></div>" +
      "<div class='appointment-detail'><span>Balance</span><strong>" + formatMoney(balance) + "</strong></div>" +
      "</div>" +
      (appointment.notes ? "<p class='appointment-notes'>" + escapeText(appointment.notes) + "</p>" : "") +
      "<div class='appointment-actions'>" +
      "<button type='button' class='appointment-card-button edit-appointment-button' data-id='" + appointment.id + "'>Edit</button>" +
      "<button type='button' class='appointment-card-button delete-appointment-button' data-id='" + appointment.id + "'>Delete</button>" +
      "</div>";

    appointmentsList.appendChild(appointmentCard);
  });
}

// Render everything that depends on appointment data.
function renderPage() {
  renderDashboard();
  renderAppointments();
}

// Reset the form back to add mode.
function resetForm() {
  appointmentForm.reset();
  appointmentBeingEdited = null;
  formTitle.textContent = "Add Appointment";
  saveAppointmentButton.textContent = "Save Appointment";
  cancelEditButton.style.display = "none";
}

// Fill the form when editing an appointment.
function startEditingAppointment(appointmentId) {
  const appointment = appointments.find(function (savedAppointment) {
    return savedAppointment.id === appointmentId;
  });

  if (!appointment) {
    return;
  }

  appointmentBeingEdited = appointmentId;
  clientName.value = appointment.clientName;
  clientPhone.value = appointment.clientPhone;
  appointmentDate.value = appointment.date;
  appointmentTime.value = appointment.time;
  serviceType.value = appointment.service;
  setLength.value = appointment.length;
  setShape.value = appointment.shape;
  depositAmount.value = appointment.deposit || "";
  totalPrice.value = appointment.totalPrice || "";
  appointmentStatus.value = appointment.status;
  appointmentNotes.value = appointment.notes;
  formTitle.textContent = "Edit Appointment";
  saveAppointmentButton.textContent = "Update Appointment";
  cancelEditButton.style.display = "inline-flex";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delete an appointment and refresh the page.
function deleteAppointment(appointmentId) {
  appointments = appointments.filter(function (appointment) {
    return appointment.id !== appointmentId;
  });

  saveAppointments();
  renderPage();

  if (appointmentBeingEdited === appointmentId) {
    resetForm();
  }
}

// Turn dark mode on or off and save the choice.
function setDarkMode(isDarkMode) {
  document.body.classList.toggle("dark-mode", isDarkMode);
  localStorage.setItem(darkModeKey, isDarkMode);

  if (isDarkMode) {
    darkModeToggle.setAttribute("aria-label", "Turn dark mode off");
  } else {
    darkModeToggle.setAttribute("aria-label", "Turn dark mode on");
  }
}

appointmentForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const now = Date.now();
  const existingAppointment = appointments.find(function (appointment) {
    return appointment.id === appointmentBeingEdited;
  });
  const appointmentData = {
    id: appointmentBeingEdited || String(now),
    clientName: clientName.value.trim(),
    clientPhone: clientPhone.value.trim(),
    date: appointmentDate.value,
    time: appointmentTime.value,
    service: serviceType.value,
    length: setLength.value,
    shape: setShape.value,
    deposit: Number(depositAmount.value) || 0,
    totalPrice: Number(totalPrice.value) || 0,
    status: appointmentStatus.value,
    notes: appointmentNotes.value.trim(),
    createdAt: existingAppointment ? existingAppointment.createdAt : now,
    updatedAt: now
  };

  if (appointmentBeingEdited) {
    appointments = appointments.map(function (appointment) {
      return appointment.id === appointmentBeingEdited ? appointmentData : appointment;
    });
  } else {
    appointments.unshift(appointmentData);
  }

  saveAppointments();
  resetForm();
  renderPage();
});

cancelEditButton.addEventListener("click", resetForm);
appointmentSearch.addEventListener("input", renderAppointments);
statusFilter.addEventListener("change", renderAppointments);
sortAppointments.addEventListener("change", renderAppointments);

appointmentsList.addEventListener("click", function (event) {
  const editButton = event.target.closest(".edit-appointment-button");
  const deleteButton = event.target.closest(".delete-appointment-button");

  if (editButton) {
    startEditingAppointment(editButton.dataset.id);
  }

  if (deleteButton) {
    deleteAppointment(deleteButton.dataset.id);
  }
});

darkModeToggle.addEventListener("click", function () {
  setDarkMode(!document.body.classList.contains("dark-mode"));
});

// Load saved dark mode choice and appointments when the page opens.
setDarkMode(localStorage.getItem(darkModeKey) !== "false");
renderPage();
