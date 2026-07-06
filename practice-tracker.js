// Acrylic Practice Tracker
// This page saves practice sessions in localStorage so they stay after refreshing.

const storageKey = "taliaPracticeSets";
const darkModeKey = "taliaWikiDarkMode";

// Page elements.
const startSetButton = document.getElementById("startSetButton");
const timerSection = document.getElementById("timerSection");
const finishSection = document.getElementById("finishSection");
const timerDisplay = document.getElementById("timerDisplay");
const timerStatus = document.getElementById("timerStatus");
const pauseButton = document.getElementById("pauseButton");
const resumeButton = document.getElementById("resumeButton");
const cancelButton = document.getElementById("cancelButton");
const finishButton = document.getElementById("finishButton");
const completedTime = document.getElementById("completedTime");
const personalBestMessage = document.getElementById("personalBestMessage");
const saveSetButton = document.getElementById("saveSetButton");
const discardSetButton = document.getElementById("discardSetButton");
const darkModeToggle = document.getElementById("darkModeToggle");

const averageTime = document.getElementById("averageTime");
const totalSets = document.getElementById("totalSets");
const fastestTime = document.getElementById("fastestTime");
const lastSetTime = document.getElementById("lastSetTime");
const totalPracticeTime = document.getElementById("totalPracticeTime");
const currentStreak = document.getElementById("currentStreak");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");
const progressChart = document.getElementById("progressChart");
const progressEmpty = document.getElementById("progressEmpty");
const milestoneList = document.getElementById("milestoneList");

let practiceSets = JSON.parse(localStorage.getItem(storageKey)) || [];
let timerInterval = null;
let timerStartedAt = null;
let pausedAt = null;
let pausedMilliseconds = 0;
let finishedMilliseconds = 0;

// Save the current practice history.
function savePracticeSets() {
  localStorage.setItem(storageKey, JSON.stringify(practiceSets));
}

// Format milliseconds as 00:00:00.
function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

// Format long total practice time in a friendly way.
function formatPracticeTotal(milliseconds) {
  if (milliseconds <= 0) {
    return "--";
  }

  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return minutes + " min";
  }

  return hours + " hr " + minutes + " min";
}

// Get a readable date from a saved timestamp.
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// Get a readable time from a saved timestamp.
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

// Calculate the current timer time, including paused time.
function getCurrentTimerMilliseconds() {
  if (!timerStartedAt) {
    return 0;
  }

  const now = pausedAt || Date.now();
  return now - timerStartedAt - pausedMilliseconds;
}

// Update the timer numbers on screen.
function updateTimerDisplay() {
  timerDisplay.textContent = formatDuration(getCurrentTimerMilliseconds());
}

// Reset the timer state back to zero.
function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerStartedAt = null;
  pausedAt = null;
  pausedMilliseconds = 0;
  finishedMilliseconds = 0;
  timerDisplay.textContent = "00:00:00";
  timerStatus.textContent = "Timer is running.";
  pauseButton.classList.remove("hidden");
  resumeButton.classList.add("hidden");
}

// Start a new practice set timer.
function startTimer() {
  resetTimer();
  timerStartedAt = Date.now();
  timerSection.classList.remove("hidden");
  finishSection.classList.add("hidden");
  startSetButton.disabled = true;
  startSetButton.textContent = "Set in Progress";
  timerInterval = setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();
}

// Pause the current timer.
function pauseTimer() {
  if (!timerStartedAt || pausedAt) {
    return;
  }

  pausedAt = Date.now();
  clearInterval(timerInterval);
  timerStatus.textContent = "Timer paused.";
  pauseButton.classList.add("hidden");
  resumeButton.classList.remove("hidden");
  updateTimerDisplay();
}

// Resume a paused timer.
function resumeTimer() {
  if (!pausedAt) {
    return;
  }

  pausedMilliseconds += Date.now() - pausedAt;
  pausedAt = null;
  timerStatus.textContent = "Timer is running.";
  pauseButton.classList.remove("hidden");
  resumeButton.classList.add("hidden");
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

// Cancel the active set without saving.
function cancelTimer() {
  resetTimer();
  timerSection.classList.add("hidden");
  finishSection.classList.add("hidden");
  startSetButton.disabled = false;
  startSetButton.textContent = "Start Set";
}

// Find the fastest saved set before the newest finished set is saved.
function getPreviousBest() {
  if (practiceSets.length === 0) {
    return null;
  }

  return Math.min(...practiceSets.map(function (practiceSet) {
    return practiceSet.duration;
  }));
}

// Finish the timer and show the save screen.
function finishTimer() {
  finishedMilliseconds = getCurrentTimerMilliseconds();
  const previousBest = getPreviousBest();

  clearInterval(timerInterval);
  timerInterval = null;
  completedTime.textContent = formatDuration(finishedMilliseconds);
  timerSection.classList.add("hidden");
  finishSection.classList.remove("hidden");

  if (previousBest && finishedMilliseconds < previousBest) {
    const improvement = previousBest - finishedMilliseconds;
    personalBestMessage.innerHTML =
      "<strong>New Personal Best</strong>" +
      "<p>Previous best: " + formatDuration(previousBest) + "</p>" +
      "<p>New best: " + formatDuration(finishedMilliseconds) + "</p>" +
      "<p>Improved by: " + formatDuration(improvement) + "</p>";
    personalBestMessage.classList.remove("hidden");
  } else {
    personalBestMessage.classList.add("hidden");
    personalBestMessage.innerHTML = "";
  }
}

// Save the finished set to localStorage.
function saveFinishedSet() {
  const now = Date.now();

  practiceSets.unshift({
    id: String(now),
    completedAt: now,
    duration: finishedMilliseconds
  });

  savePracticeSets();
  cancelTimer();
  renderTracker();
}

// Calculate all stats used by the dashboard.
function calculateStats() {
  const durations = practiceSets.map(function (practiceSet) {
    return practiceSet.duration;
  });

  const totalDuration = durations.reduce(function (sum, duration) {
    return sum + duration;
  }, 0);

  return {
    totalSets: practiceSets.length,
    average: durations.length ? totalDuration / durations.length : 0,
    fastest: durations.length ? Math.min(...durations) : 0,
    last: durations.length ? practiceSets[0].duration : 0,
    totalDuration: totalDuration,
    streak: calculateCurrentStreak()
  };
}

// Count how many consecutive days have at least one saved set.
function calculateCurrentStreak() {
  if (practiceSets.length === 0) {
    return 0;
  }

  const completedDays = new Set(practiceSets.map(function (practiceSet) {
    return new Date(practiceSet.completedAt).toDateString();
  }));

  let streak = 0;
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
    const checkedDate = new Date(today);
    checkedDate.setDate(today.getDate() - dayOffset);

    if (completedDays.has(checkedDate.toDateString())) {
      streak += 1;
    } else if (dayOffset === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

// Update the dashboard stat cards.
function renderDashboard() {
  const stats = calculateStats();

  averageTime.textContent = stats.average ? formatDuration(stats.average) : "--";
  totalSets.textContent = stats.totalSets;
  fastestTime.textContent = stats.fastest ? formatDuration(stats.fastest) : "--";
  lastSetTime.textContent = stats.last ? formatDuration(stats.last) : "--";
  totalPracticeTime.textContent = formatPracticeTotal(stats.totalDuration);
  currentStreak.textContent = stats.streak + (stats.streak === 1 ? " day" : " days");
}

// Draw a simple progress list where shorter bars mean faster sets.
function renderProgress() {
  progressChart.innerHTML = "";
  progressEmpty.classList.toggle("hidden", practiceSets.length > 0);

  if (practiceSets.length === 0) {
    return;
  }

  const chronologicalSets = [...practiceSets].reverse();
  const longestDuration = Math.max(...chronologicalSets.map(function (practiceSet) {
    return practiceSet.duration;
  }));

  chronologicalSets.forEach(function (practiceSet) {
    const row = document.createElement("div");
    const widthPercent = Math.max(8, (practiceSet.duration / longestDuration) * 100);

    row.className = "progress-row";
    row.innerHTML =
      "<span class='progress-date'>" + formatDate(practiceSet.completedAt) + "</span>" +
      "<span class='progress-track'><span class='progress-fill' style='width: " + widthPercent + "%'></span></span>" +
      "<span class='progress-time'>" + formatDuration(practiceSet.duration) + "</span>";

    progressChart.appendChild(row);
  });
}

// Show milestone checklist states.
function renderMilestones() {
  const stats = calculateStats();
  const milestones = [
    {
      title: "First Set Completed",
      detail: "Save your first acrylic practice set.",
      complete: stats.totalSets >= 1
    },
    {
      title: "10 Total Sets",
      detail: "Complete 10 practice sets.",
      complete: stats.totalSets >= 10
    },
    {
      title: "25 Practice Hours",
      detail: "Reach 25 total hours of practice.",
      complete: stats.totalDuration >= 25 * 60 * 60 * 1000
    },
    {
      title: "Fastest Set Under 2 Hours",
      detail: "Finish one set under 2 hours.",
      complete: stats.fastest > 0 && stats.fastest < 2 * 60 * 60 * 1000
    },
    {
      title: "Average Set Time Under 2 hr 30 min",
      detail: "Bring your average below 2 hours and 30 minutes.",
      complete: stats.average > 0 && stats.average < 2.5 * 60 * 60 * 1000
    }
  ];

  milestoneList.innerHTML = "";

  milestones.forEach(function (milestone) {
    const milestoneItem = document.createElement("div");
    milestoneItem.className = "milestone-item" + (milestone.complete ? " complete" : "");
    milestoneItem.innerHTML =
      "<span class='milestone-check'>✓</span>" +
      "<div class='milestone-copy'>" +
      "<span class='milestone-title'>" + milestone.title + "</span>" +
      "<span class='milestone-detail'>" + milestone.detail + "</span>" +
      "</div>";

    milestoneList.appendChild(milestoneItem);
  });
}

// Show saved sets with delete buttons.
function renderHistory() {
  historyList.innerHTML = "";
  historyEmpty.classList.toggle("hidden", practiceSets.length > 0);

  practiceSets.forEach(function (practiceSet) {
    const historyItem = document.createElement("article");
    historyItem.className = "history-item";
    historyItem.innerHTML =
      "<div class='history-details'>" +
      "<div><span>Date completed</span><strong>" + formatDate(practiceSet.completedAt) + "</strong></div>" +
      "<div><span>Time completed</span><strong>" + formatTime(practiceSet.completedAt) + "</strong></div>" +
      "<div><span>Set duration</span><strong>" + formatDuration(practiceSet.duration) + "</strong></div>" +
      "</div>" +
      "<button type='button' class='history-delete-button' data-id='" + practiceSet.id + "'>Delete</button>";

    historyList.appendChild(historyItem);
  });
}

// Delete a saved set and refresh all stats.
function deletePracticeSet(setId) {
  practiceSets = practiceSets.filter(function (practiceSet) {
    return practiceSet.id !== setId;
  });

  savePracticeSets();
  renderTracker();
}

// Render every section that depends on saved practice sets.
function renderTracker() {
  renderDashboard();
  renderProgress();
  renderMilestones();
  renderHistory();
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

startSetButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", pauseTimer);
resumeButton.addEventListener("click", resumeTimer);
cancelButton.addEventListener("click", cancelTimer);
finishButton.addEventListener("click", finishTimer);
saveSetButton.addEventListener("click", saveFinishedSet);
discardSetButton.addEventListener("click", cancelTimer);

historyList.addEventListener("click", function (event) {
  const deleteButton = event.target.closest(".history-delete-button");

  if (deleteButton) {
    deletePracticeSet(deleteButton.dataset.id);
  }
});

darkModeToggle.addEventListener("click", function () {
  setDarkMode(!document.body.classList.contains("dark-mode"));
});

// Load saved dark mode choice and saved practice sessions when the page opens.
setDarkMode(localStorage.getItem(darkModeKey) !== "false");
renderTracker();
