// Client Appointment Tracker
// Appointments are saved in localStorage so they stay after refreshing the page.

const appointmentStorageKey = "taliaClientAppointments";
const darkModeKey = "taliaWikiDarkMode";
const businessName = "Nailed by Brenaé";
const policyReminder =
  "Please arrive with bare nails. Additional services cannot be added during the appointment. I do not work over another nail technician’s work.";

// Page elements.
const appointmentForm = document.getElementById("appointmentForm");
const formTitle = document.getElementById("formTitle");
const clientName = document.getElementById("clientName");
const clientPhone = document.getElementById("clientPhone");
const appointmentDate = document.getElementById("appointmentDate");
const appointmentTime = document.getElementById("appointmentTime");
const appointmentDuration = document.getElementById("appointmentDuration");
const customDurationWrap = document.getElementById("customDurationWrap");
const customDuration = document.getElementById("customDuration");
const estimatedEndTime = document.getElementById("estimatedEndTime");
const serviceType = document.getElementById("serviceType");
const setLength = document.getElementById("setLength");
const setShape = document.getElementById("setShape");
const depositAmount = document.getElementById("depositAmount");
const totalPrice = document.getElementById("totalPrice");
const remainingBalancePreview = document.getElementById("remainingBalancePreview");
const depositStatus = document.getElementById("depositStatus");
const depositMethod = document.getElementById("depositMethod");
const depositPaidDate = document.getElementById("depositPaidDate");
const appointmentStatus = document.getElementById("appointmentStatus");
const appointmentNotes = document.getElementById("appointmentNotes");
const saveAppointmentButton = document.getElementById("saveAppointmentButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const appointmentSearch = document.getElementById("appointmentSearch");
const statusFilter = document.getElementById("statusFilter");
const depositFilter = document.getElementById("depositFilter");
const paymentFilter = document.getElementById("paymentFilter");
const dateFilter = document.getElementById("dateFilter");
const sortAppointments = document.getElementById("sortAppointments");
const listViewButton = document.getElementById("listViewButton");
const calendarViewButton = document.getElementById("calendarViewButton");
const appointmentsList = document.getElementById("appointmentsList");
const calendarView = document.getElementById("calendarView");
const emptyAppointments = document.getElementById("emptyAppointments");
const copyStatus = document.getElementById("copyStatus");
const darkModeToggle = document.getElementById("darkModeToggle");

const upcomingCount = document.getElementById("upcomingCount");
const todayCount = document.getElementById("todayCount");
const completedCount = document.getElementById("completedCount");
const expectedTotal = document.getElementById("expectedTotal");

let appointments = JSON.parse(localStorage.getItem(appointmentStorageKey)) || [];
let appointmentBeingEdited = null;
let currentView = "list";

// Save appointments to localStorage.
function saveAppointments() {
  localStorage.setItem(appointmentStorageKey, JSON.stringify(appointments));
}

// Keep older statuses working with the new status list.
function normalizeStatus(status) {
  const statusMap = {
    Booked: "Awaiting Deposit",
    "No Show": "No-show",
    "No show": "No-show"
  };

  return statusMap[status] || status || "Inquiry";
}

// Get remaining balance and keep it from going below zero.
function calculateBalance(total, deposit) {
  return Math.max(0, (Number(total) || 0) - (Number(deposit) || 0));
}

// Get the saved duration in minutes.
function getDurationMinutes(appointment) {
  if (appointment.duration === "custom") {
    return Number(appointment.customDuration) || 60;
  }

  return Number(appointment.duration) || 60;
}

// Make sure older saved appointments have every field.
function normalizeAppointment(appointment) {
  const normalizedDeposit = Number(appointment.deposit) || 0;
  const normalizedTotal = Number(appointment.totalPrice) || 0;
  const normalizedStatus = normalizeStatus(appointment.status);
  const guessedDepositStatus = appointment.depositStatus || (normalizedDeposit > 0 ? "Paid" : "Unpaid");

  return {
    ...appointment,
    id: String(appointment.id || Date.now()),
    clientName: appointment.clientName || "Unnamed Client",
    clientPhone: appointment.clientPhone || "",
    date: appointment.date || "",
    time: appointment.time || "",
    duration: appointment.duration || "120",
    customDuration: appointment.customDuration || "",
    service: appointment.service || "Appointment",
    length: appointment.length || "",
    shape: appointment.shape || "",
    deposit: normalizedDeposit,
    totalPrice: normalizedTotal,
    depositStatus: guessedDepositStatus,
    depositMethod: appointment.depositMethod || "",
    depositPaidDate: appointment.depositPaidDate || "",
    status: normalizedStatus,
    notes: appointment.notes || "",
    createdAt: appointment.createdAt || Date.now(),
    updatedAt: appointment.updatedAt || appointment.createdAt || Date.now()
  };
}

appointments = appointments.map(normalizeAppointment);
saveAppointments();

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

// Format duration text for appointment cards.
function formatDuration(minutes) {
  const durationMinutes = Number(minutes) || 60;
  const hours = Math.floor(durationMinutes / 60);
  const remainingMinutes = durationMinutes % 60;

  if (hours === 0) {
    return remainingMinutes + " min";
  }

  if (remainingMinutes === 0) {
    return hours + (hours === 1 ? " hour" : " hours");
  }

  return hours + " hr " + remainingMinutes + " min";
}

// Create a Date object for sorting appointments.
function getAppointmentDateTime(appointment) {
  if (!appointment.date || !appointment.time) {
    return new Date(0);
  }

  return new Date(appointment.date + "T" + appointment.time);
}

// Estimate appointment end time from the start time and duration.
function getEstimatedEndTime(appointment) {
  if (!appointment.time) {
    return "Choose a time";
  }

  const start = getAppointmentDateTime(appointment);
  const end = new Date(start.getTime() + getDurationMinutes(appointment) * 60000);

  return end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

// Check whether an appointment is today.
function isToday(appointment) {
  const today = new Date().toISOString().slice(0, 10);
  return appointment.date === today;
}

// Check whether an appointment is still upcoming.
function isUpcoming(appointment) {
  const appointmentDateTime = getAppointmentDateTime(appointment);
  const inactiveStatuses = ["Completed", "Cancelled", "No-show"];

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
    if (appointment.status === "Cancelled" || appointment.status === "No-show") {
      return sum;
    }

    return sum + calculateBalance(appointment.totalPrice, appointment.deposit);
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
  const selectedDeposit = depositFilter.value;
  const selectedPayment = paymentFilter.value;
  const selectedDate = dateFilter.value;
  const selectedSort = sortAppointments.value;

  let visibleAppointments = appointments.filter(function (appointment) {
    const balance = calculateBalance(appointment.totalPrice, appointment.deposit);
    const matchesSearch =
      appointment.clientName.toLowerCase().includes(searchText) ||
      appointment.clientPhone.toLowerCase().includes(searchText) ||
      appointment.service.toLowerCase().includes(searchText);
    const matchesStatus = selectedStatus === "all" || appointment.status === selectedStatus;
    const matchesDeposit = selectedDeposit === "all" || appointment.depositStatus === selectedDeposit;
    const matchesDate = !selectedDate || appointment.date === selectedDate;
    const matchesPayment =
      selectedPayment === "all" ||
      (selectedPayment === "paid" && balance === 0) ||
      (selectedPayment === "balance" && balance > 0);

    return matchesSearch && matchesStatus && matchesDeposit && matchesDate && matchesPayment;
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

// Create the confirmation text that can be copied to a client.
function buildConfirmationMessage(appointment) {
  const balance = calculateBalance(appointment.totalPrice, appointment.deposit);

  return (
    "Hi " + appointment.clientName + "! Your appointment with " + businessName + " is confirmed.\n\n" +
    "Date: " + formatAppointmentDate(appointment.date) + "\n" +
    "Time: " + formatAppointmentTime(appointment.time) + "\n" +
    "Service: " + appointment.service + "\n" +
    "Length: " + (appointment.length || "Not sure yet") + "\n" +
    "Shape: " + (appointment.shape || "Not sure yet") + "\n" +
    "Deposit paid: " + (appointment.depositStatus === "Paid" ? formatMoney(appointment.deposit) : "Not paid yet") + "\n" +
    "Remaining balance: " + formatMoney(balance) + "\n\n" +
    policyReminder
  );
}

// Create the reminder text that can be copied to a client.
function buildReminderMessage(appointment) {
  const balance = calculateBalance(appointment.totalPrice, appointment.deposit);

  return (
    "Hi " + appointment.clientName + "! This is your reminder for your appointment with " + businessName + ".\n\n" +
    "Date: " + formatAppointmentDate(appointment.date) + "\n" +
    "Time: " + formatAppointmentTime(appointment.time) + "\n" +
    "Remaining balance: " + formatMoney(balance) + "\n\n" +
    policyReminder
  );
}

// Copy text, using a fallback for browsers that do not support clipboard permissions.
async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = text;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand("copy");
    tempTextArea.remove();
  }

  copyStatus.textContent = successMessage;
}

// Show appointment cards.
function renderAppointments() {
  const visibleAppointments = getVisibleAppointments();
  appointmentsList.innerHTML = "";
  calendarView.innerHTML = "";
  emptyAppointments.classList.toggle("hidden", visibleAppointments.length > 0);

  visibleAppointments.forEach(function (appointment) {
    const appointmentCard = document.createElement("article");
    const balance = calculateBalance(appointment.totalPrice, appointment.deposit);
    const endTime = getEstimatedEndTime(appointment);

    appointmentCard.className = "appointment-item";
    appointmentCard.innerHTML =
      "<div class='appointment-topline'>" +
      "<div>" +
      "<h3>" + escapeText(appointment.clientName) + "</h3>" +
      "<span class='appointment-contact'>" + escapeText(appointment.clientPhone || "No contact added") + "</span>" +
      "</div>" +
      "<div class='badge-group'>" +
      "<span class='status-pill " + getStatusClass(appointment.status) + "'>" + escapeText(appointment.status) + "</span>" +
      "<span class='deposit-pill " + (appointment.depositStatus === "Paid" ? "deposit-paid" : "deposit-unpaid") + "'>" +
      "Deposit " + escapeText(appointment.depositStatus) +
      "</span>" +
      "</div>" +
      "</div>" +
      "<div class='appointment-details'>" +
      "<div class='appointment-detail'><span>Date</span><strong>" + formatAppointmentDate(appointment.date) + "</strong></div>" +
      "<div class='appointment-detail'><span>Time</span><strong>" + formatAppointmentTime(appointment.time) + " - " + endTime + "</strong></div>" +
      "<div class='appointment-detail'><span>Duration</span><strong>" + formatDuration(getDurationMinutes(appointment)) + "</strong></div>" +
      "<div class='appointment-detail'><span>Service</span><strong>" + escapeText(appointment.service) + "</strong></div>" +
      "<div class='appointment-detail'><span>Length</span><strong>" + escapeText(appointment.length || "Not sure yet") + "</strong></div>" +
      "<div class='appointment-detail'><span>Shape</span><strong>" + escapeText(appointment.shape || "Not sure yet") + "</strong></div>" +
      "<div class='appointment-detail'><span>Deposit</span><strong>" + formatMoney(appointment.deposit) + "</strong></div>" +
      "<div class='appointment-detail'><span>Deposit Method</span><strong>" + escapeText(appointment.depositMethod || "Not paid yet") + "</strong></div>" +
      "<div class='appointment-detail'><span>Deposit Paid Date</span><strong>" + (appointment.depositPaidDate ? formatAppointmentDate(appointment.depositPaidDate) : "Not paid yet") + "</strong></div>" +
      "<div class='appointment-detail'><span>Balance</span><strong>" + formatMoney(balance) + "</strong></div>" +
      "</div>" +
      (appointment.notes ? "<p class='appointment-notes'>" + escapeText(appointment.notes) + "</p>" : "") +
      "<div class='appointment-actions'>" +
      "<button type='button' class='appointment-card-button mark-deposit-button' data-id='" + appointment.id + "'>Mark Deposit Paid</button>" +
      "<button type='button' class='appointment-card-button complete-appointment-button' data-id='" + appointment.id + "'>Mark Completed</button>" +
      "<button type='button' class='appointment-card-button reschedule-appointment-button' data-id='" + appointment.id + "'>Reschedule</button>" +
      "<button type='button' class='appointment-card-button copy-confirmation-button' data-id='" + appointment.id + "'>Copy Confirmation Message</button>" +
      "<button type='button' class='appointment-card-button copy-reminder-button' data-id='" + appointment.id + "'>Copy Reminder Message</button>" +
      "<button type='button' class='appointment-card-button edit-appointment-button' data-id='" + appointment.id + "'>Edit</button>" +
      "<button type='button' class='appointment-card-button delete-appointment-button' data-id='" + appointment.id + "'>Delete</button>" +
      "</div>";

    appointmentsList.appendChild(appointmentCard);
  });

  renderCalendar(visibleAppointments);
}

// Show appointments grouped by date for calendar view.
function renderCalendar(visibleAppointments) {
  const appointmentsByDate = {};

  visibleAppointments.forEach(function (appointment) {
    if (!appointmentsByDate[appointment.date]) {
      appointmentsByDate[appointment.date] = [];
    }

    appointmentsByDate[appointment.date].push(appointment);
  });

  Object.keys(appointmentsByDate).sort().forEach(function (date) {
    const dayBlock = document.createElement("section");
    const dayAppointments = appointmentsByDate[date].sort(function (a, b) {
      return getAppointmentDateTime(a) - getAppointmentDateTime(b);
    });

    dayBlock.className = "calendar-day";
    dayBlock.innerHTML = "<h3>" + formatAppointmentDate(date) + "</h3>";

    dayAppointments.forEach(function (appointment) {
      const balance = calculateBalance(appointment.totalPrice, appointment.deposit);
      const calendarItem = document.createElement("button");

      calendarItem.type = "button";
      calendarItem.className = "calendar-appointment";
      calendarItem.dataset.id = appointment.id;
      calendarItem.innerHTML =
        "<strong>" + formatAppointmentTime(appointment.time) + " - " + getEstimatedEndTime(appointment) + "</strong>" +
        "<span>" + escapeText(appointment.clientName) + " · " + escapeText(appointment.service) + "</span>" +
        "<small>" + escapeText(appointment.status) + " · Balance " + formatMoney(balance) + "</small>";

      dayBlock.appendChild(calendarItem);
    });

    calendarView.appendChild(dayBlock);
  });
}

// Render everything that depends on appointment data.
function renderPage() {
  renderDashboard();
  renderAppointments();
  updateView();
}

// Update the automatic remaining balance and estimated end time in the form.
function updateFormCalculations() {
  const balance = calculateBalance(totalPrice.value, depositAmount.value);
  const durationValue = appointmentDuration.value;
  const formAppointment = {
    date: appointmentDate.value || "2026-01-01",
    time: appointmentTime.value,
    duration: durationValue,
    customDuration: customDuration.value
  };

  remainingBalancePreview.textContent = formatMoney(balance);
  estimatedEndTime.textContent = getEstimatedEndTime(formAppointment);
  customDurationWrap.classList.toggle("hidden", durationValue !== "custom");
}

// Reset the form back to add mode.
function resetForm() {
  appointmentForm.reset();
  appointmentDuration.value = "120";
  appointmentStatus.value = "Inquiry";
  appointmentBeingEdited = null;
  formTitle.textContent = "Add Appointment";
  saveAppointmentButton.textContent = "Save Appointment";
  cancelEditButton.style.display = "none";
  updateFormCalculations();
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
  appointmentDuration.value = appointment.duration;
  customDuration.value = appointment.customDuration;
  serviceType.value = appointment.service;
  setLength.value = appointment.length;
  setShape.value = appointment.shape;
  depositAmount.value = appointment.deposit || "";
  totalPrice.value = appointment.totalPrice || "";
  depositStatus.value = appointment.depositStatus;
  depositMethod.value = appointment.depositMethod;
  depositPaidDate.value = appointment.depositPaidDate;
  appointmentStatus.value = appointment.status;
  appointmentNotes.value = appointment.notes;
  formTitle.textContent = "Edit Appointment";
  saveAppointmentButton.textContent = "Update Appointment";
  cancelEditButton.style.display = "inline-flex";
  updateFormCalculations();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Update one saved appointment with a small set of changes.
function updateAppointment(appointmentId, updates) {
  appointments = appointments.map(function (appointment) {
    if (appointment.id !== appointmentId) {
      return appointment;
    }

    return {
      ...appointment,
      ...updates,
      updatedAt: Date.now()
    };
  });

  saveAppointments();
  renderPage();
}

// Mark deposit paid and confirm the appointment.
function markDepositPaid(appointmentId) {
  const today = new Date().toISOString().slice(0, 10);

  updateAppointment(appointmentId, {
    depositStatus: "Paid",
    depositPaidDate: today,
    status: "Confirmed"
  });
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

// Switch between list and calendar views.
function updateView() {
  const isListView = currentView === "list";

  appointmentsList.classList.toggle("hidden", !isListView);
  calendarView.classList.toggle("hidden", isListView);
  listViewButton.classList.toggle("active", isListView);
  calendarViewButton.classList.toggle("active", !isListView);
}

appointmentForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const now = Date.now();
  const existingAppointment = appointments.find(function (appointment) {
    return appointment.id === appointmentBeingEdited;
  });
  const statusValue = appointmentStatus.value;
  const depositStatusValue = depositStatus.value;
  const appointmentData = {
    ...(existingAppointment || {}),
    id: appointmentBeingEdited || String(now),
    clientName: clientName.value.trim(),
    clientPhone: clientPhone.value.trim(),
    date: appointmentDate.value,
    time: appointmentTime.value,
    duration: appointmentDuration.value,
    customDuration: customDuration.value,
    service: serviceType.value,
    length: setLength.value,
    shape: setShape.value,
    deposit: Number(depositAmount.value) || 0,
    totalPrice: Number(totalPrice.value) || 0,
    depositStatus: depositStatusValue,
    depositMethod: depositStatusValue === "Paid" ? depositMethod.value : "",
    depositPaidDate: depositStatusValue === "Paid" ? depositPaidDate.value : "",
    status: statusValue,
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
depositFilter.addEventListener("change", renderAppointments);
paymentFilter.addEventListener("change", renderAppointments);
dateFilter.addEventListener("change", renderAppointments);
sortAppointments.addEventListener("change", renderAppointments);

[appointmentDate, appointmentTime, appointmentDuration, customDuration, depositAmount, totalPrice].forEach(function (input) {
  input.addEventListener("input", updateFormCalculations);
  input.addEventListener("change", updateFormCalculations);
});

depositStatus.addEventListener("change", function () {
  if (depositStatus.value === "Paid" && !depositPaidDate.value) {
    depositPaidDate.value = new Date().toISOString().slice(0, 10);
  }

  if (depositStatus.value === "Paid" && appointmentStatus.value === "Awaiting Deposit") {
    appointmentStatus.value = "Confirmed";
  }
});

listViewButton.addEventListener("click", function () {
  currentView = "list";
  updateView();
});

calendarViewButton.addEventListener("click", function () {
  currentView = "calendar";
  updateView();
});

appointmentsList.addEventListener("click", function (event) {
  const clickedButton = event.target.closest("button[data-id]");

  if (!clickedButton) {
    return;
  }

  const appointmentId = clickedButton.dataset.id;
  const appointment = appointments.find(function (savedAppointment) {
    return savedAppointment.id === appointmentId;
  });

  if (!appointment) {
    return;
  }

  if (clickedButton.classList.contains("mark-deposit-button")) {
    markDepositPaid(appointmentId);
  } else if (clickedButton.classList.contains("complete-appointment-button")) {
    updateAppointment(appointmentId, { status: "Completed" });
  } else if (clickedButton.classList.contains("reschedule-appointment-button")) {
    updateAppointment(appointmentId, { status: "Rescheduled" });
    startEditingAppointment(appointmentId);
  } else if (clickedButton.classList.contains("copy-confirmation-button")) {
    copyText(buildConfirmationMessage(appointment), "Confirmation message copied.");
  } else if (clickedButton.classList.contains("copy-reminder-button")) {
    copyText(buildReminderMessage(appointment), "Reminder message copied.");
  } else if (clickedButton.classList.contains("edit-appointment-button")) {
    startEditingAppointment(appointmentId);
  } else if (clickedButton.classList.contains("delete-appointment-button")) {
    deleteAppointment(appointmentId);
  }
});

calendarView.addEventListener("click", function (event) {
  const calendarAppointment = event.target.closest(".calendar-appointment");

  if (calendarAppointment) {
    startEditingAppointment(calendarAppointment.dataset.id);
  }
});

darkModeToggle.addEventListener("click", function () {
  setDarkMode(!document.body.classList.contains("dark-mode"));
});

// Load saved dark mode choice and appointments when the page opens.
setDarkMode(localStorage.getItem(darkModeKey) !== "false");
resetForm();
renderPage();
