// Get the important page elements.
const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteCategory = document.getElementById("noteCategory");
const noteText = document.getElementById("noteText");
const notesContainer = document.getElementById("notesContainer");
const emptyMessage = document.getElementById("emptyMessage");
const searchInput = document.getElementById("searchInput");
const saveButton = document.getElementById("saveButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const noteFile = document.getElementById("noteFile");
const attachmentStatus = document.getElementById("attachmentStatus");
const removeAttachmentButton = document.getElementById("removeAttachmentButton");
const sortSelect = document.getElementById("sortSelect");
const templateSelect = document.getElementById("templateSelect");
const applyTemplateButton = document.getElementById("applyTemplateButton");
const darkModeToggle = document.getElementById("darkModeToggle");
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeImageModal = document.getElementById("closeImageModal");
const exportNotesButton = document.getElementById("exportNotesButton");
const importNotesInput = document.getElementById("importNotesInput");
const emojiButtons = document.querySelectorAll(".emoji-button");

// This key is used to save and load notes from localStorage.
const storageKey = "taliaWikiNotes";
const darkModeKey = "taliaWikiDarkMode";

// These templates can be inserted into the note box when selected.
const noteTemplates = {
  clientNote:
    "Client Note\n\n" +
    "Client:\n" +
    "Shape:\n" +
    "Length:\n" +
    "Products Used:\n" +
    "Design:\n" +
    "Retention:\n" +
    "Fill Due:"
};

// Load existing notes, or start with an empty list if no notes exist yet.
let notes = JSON.parse(localStorage.getItem(storageKey)) || [];

// Add newer fields to older notes so every note has the same shape.
notes = notes.map(function (note) {
  const fallbackDate = note.id || Date.now();

  return {
    id: note.id || Date.now(),
    title: note.title,
    category: note.category,
    text: note.text,
    favorite: note.favorite || false,
    attachment: note.attachment || null,
    createdAt: note.createdAt || fallbackDate,
    updatedAt: note.updatedAt || fallbackDate
  };
});

// This keeps track of which note is being edited.
let noteBeingEdited = null;

// This keeps the current attachment while a note is being edited.
let currentAttachment = null;

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

// Save the current notes array to localStorage.
function saveNotes() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(notes));
  } catch (error) {
    alert("This file is too large to save in your browser. Try a smaller image or PDF.");
  }
}

// Turn the selected image or PDF into text that localStorage can save.
function readAttachmentFile(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      resolve(currentAttachment);
      return;
    }

    const maxFileSize = 2 * 1024 * 1024;

    if (file.size > maxFileSize) {
      reject("Please choose a file smaller than 2MB.");
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", function () {
      resolve({
        name: file.name,
        type: file.type,
        data: reader.result
      });
    });

    reader.addEventListener("error", function () {
      reject("That file could not be added. Please try another one.");
    });

    reader.readAsDataURL(file);
  });
}

// Format dates for the created and last edited labels.
function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// Make a category name safe to use as a CSS class.
function getCategoryClass(category) {
  return "category-" + category.toLowerCase().replace(/\s+/g, "-");
}

// Create a backup file that can be saved to iCloud Drive or another device.
function exportNotes() {
  const backup = {
    app: "Talia Wiki",
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notes
  };

  const backupText = JSON.stringify(backup, null, 2);
  const backupFile = new Blob([backupText], { type: "application/json" });
  const downloadLink = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  downloadLink.href = URL.createObjectURL(backupFile);
  downloadLink.download = "talia-wiki-backup-" + dateStamp + ".json";
  downloadLink.click();
  URL.revokeObjectURL(downloadLink.href);
}

// Read a backup file and restore the notes inside this browser.
function importNotes(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", function () {
    try {
      const backup = JSON.parse(reader.result);
      const importedNotes = Array.isArray(backup) ? backup : backup.notes;

      if (!Array.isArray(importedNotes)) {
        alert("That backup file does not look like a Talia Wiki backup.");
        return;
      }

      const shouldReplace = confirm("Import these notes? This will replace the notes currently saved in this browser.");

      if (!shouldReplace) {
        return;
      }

      notes = importedNotes.map(function (note) {
        const fallbackDate = note.id || Date.now();

        return {
          id: note.id || Date.now(),
          title: note.title || "Untitled Note",
          category: note.category || "Coding",
          text: note.text || "",
          favorite: note.favorite || false,
          attachment: note.attachment || null,
          createdAt: note.createdAt || fallbackDate,
          updatedAt: note.updatedAt || fallbackDate
        };
      });

      saveNotes();
      displayNotes();
      alert("Notes imported successfully.");
    } catch (error) {
      alert("That backup file could not be imported. Please choose a valid Talia Wiki backup.");
    }

    importNotesInput.value = "";
  });

  reader.readAsText(file);
}

// Create one note card and add the note information inside it.
function createNoteCard(note) {
  const card = document.createElement("article");
  card.className = "note-card";

  if (note.favorite) {
    card.classList.add("favorite");
  }

  const title = document.createElement("h3");
  title.textContent = note.title;

  const category = document.createElement("span");
  category.className = "category-pill " + getCategoryClass(note.category);
  category.textContent = note.category;

  const dates = document.createElement("div");
  dates.className = "note-dates";

  const createdDate = document.createElement("span");
  createdDate.textContent = "Created: " + formatDate(note.createdAt);

  const editedDate = document.createElement("span");
  editedDate.textContent = "Last edited: " + formatDate(note.updatedAt);

  dates.append(createdDate, editedDate);

  const text = document.createElement("p");
  text.textContent = note.text;

  let attachmentElement = null;

  if (note.attachment && note.attachment.type && note.attachment.type.startsWith("image/")) {
    attachmentElement = document.createElement("img");
    attachmentElement.className = "note-image";
    attachmentElement.src = note.attachment.data;
    attachmentElement.alt = note.attachment.name;
    attachmentElement.title = "Click to view full image";
    attachmentElement.addEventListener("click", function () {
      openImageModal(note.attachment.data, note.attachment.name);
    });
  } else if (note.attachment) {
    attachmentElement = document.createElement("a");
    attachmentElement.className = "pdf-link";
    attachmentElement.href = note.attachment.data;
    attachmentElement.target = "_blank";
    attachmentElement.textContent = "Open PDF: " + note.attachment.name;
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const favoriteButton = document.createElement("button");
  favoriteButton.className = "card-button favorite-button";
  favoriteButton.type = "button";

  if (note.favorite) {
    favoriteButton.classList.add("active");
    favoriteButton.textContent = "Favorited 💗";
  } else {
    favoriteButton.textContent = "Favorite";
  }

  favoriteButton.addEventListener("click", function () {
    toggleFavorite(note.id);
  });

  const editButton = document.createElement("button");
  editButton.className = "card-button edit-button";
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", function () {
    startEditNote(note.id);
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "card-button delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", function () {
    deleteNote(note.id);
  });

  actions.append(favoriteButton, editButton, deleteButton);
  card.append(title, category, dates, text);

  if (attachmentElement) {
    card.appendChild(attachmentElement);
  }

  card.appendChild(actions);
  return card;
}

// Open an uploaded image at full size without cropping it.
function openImageModal(imageSource, imageName) {
  modalImage.src = imageSource;
  modalImage.alt = imageName;
  imageModal.classList.add("open");
  imageModal.setAttribute("aria-hidden", "false");
}

// Close the full image viewer.
function closeImageViewer() {
  imageModal.classList.remove("open");
  imageModal.setAttribute("aria-hidden", "true");
  modalImage.src = "";
  modalImage.alt = "";
}

// Sort notes based on the selected option, while keeping favorites pinned first.
function sortNotes(noteList) {
  return noteList.sort(function (firstNote, secondNote) {
    const firstFavorite = firstNote.favorite ? 1 : 0;
    const secondFavorite = secondNote.favorite ? 1 : 0;

    if (firstFavorite !== secondFavorite) {
      return secondFavorite - firstFavorite;
    }

    if (sortSelect.value === "oldest") {
      return firstNote.createdAt - secondNote.createdAt;
    }

    if (sortSelect.value === "az") {
      return firstNote.title.localeCompare(secondNote.title);
    }

    if (sortSelect.value === "favorites") {
      return secondNote.updatedAt - firstNote.updatedAt;
    }

    return secondNote.createdAt - firstNote.createdAt;
  });
}

// Display notes on the page and filter them when the user searches.
function displayNotes() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  const filteredNotes = notes.filter(function (note) {
    const titleMatch = note.title.toLowerCase().includes(searchTerm);
    const categoryMatch = note.category.toLowerCase().includes(searchTerm);
    const textMatch = note.text.toLowerCase().includes(searchTerm);
    const attachmentMatch = note.attachment && note.attachment.name.toLowerCase().includes(searchTerm);

    return titleMatch || categoryMatch || textMatch || attachmentMatch;
  });

  notesContainer.innerHTML = "";

  sortNotes(filteredNotes).forEach(function (note) {
    notesContainer.appendChild(createNoteCard(note));
  });

  if (filteredNotes.length === 0) {
    emptyMessage.style.display = "block";
  } else {
    emptyMessage.style.display = "none";
  }
}

// Add a new note, or update the note being edited.
noteForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  let attachment;

  try {
    attachment = await readAttachmentFile(noteFile.files[0]);
  } catch (message) {
    alert(message);
    return;
  }

  if (noteBeingEdited) {
    notes = notes.map(function (note) {
      if (note.id === noteBeingEdited) {
        return {
          id: note.id,
          title: noteTitle.value.trim(),
          category: noteCategory.value,
          text: noteText.value.trim(),
          favorite: note.favorite,
          attachment: attachment,
          createdAt: note.createdAt,
          updatedAt: Date.now()
        };
      }

      return note;
    });
  } else {
    const newNote = {
      id: Date.now(),
      title: noteTitle.value.trim(),
      category: noteCategory.value,
      text: noteText.value.trim(),
      favorite: false,
      attachment: attachment,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    notes.unshift(newNote);
  }

  resetForm();
  saveNotes();
  displayNotes();
});

// Fill the form with a note's information so it can be edited.
function startEditNote(noteId) {
  const noteToEdit = notes.find(function (note) {
    return note.id === noteId;
  });

  if (!noteToEdit) {
    return;
  }

  noteBeingEdited = noteId;
  noteTitle.value = noteToEdit.title;
  noteCategory.value = noteToEdit.category;
  noteText.value = noteToEdit.text;
  currentAttachment = noteToEdit.attachment || null;
  updateAttachmentStatus();
  saveButton.textContent = "Update Note 💗";
  cancelEditButton.style.display = "inline-block";
  noteTitle.focus();
}

// Put the form back into add-note mode.
function resetForm() {
  noteBeingEdited = null;
  currentAttachment = null;
  noteForm.reset();
  updateAttachmentStatus();
  saveButton.textContent = "Save Note 🎀";
  cancelEditButton.style.display = "none";
  noteTitle.focus();
}

// Show which attachment is currently selected or saved with the note.
function updateAttachmentStatus() {
  if (noteFile.files[0]) {
    attachmentStatus.textContent = "Selected: " + noteFile.files[0].name;
    removeAttachmentButton.style.display = "inline-block";
  } else if (currentAttachment) {
    attachmentStatus.textContent = "Current attachment: " + currentAttachment.name;
    removeAttachmentButton.style.display = "inline-block";
  } else {
    attachmentStatus.textContent = "";
    removeAttachmentButton.style.display = "none";
  }
}

// Favorite notes are pinned to the top of the saved notes list.
function toggleFavorite(noteId) {
  notes = notes.map(function (note) {
    if (note.id === noteId) {
      note.favorite = !note.favorite;
    }

    return note;
  });

  saveNotes();
  displayNotes();
}

// Delete one note and update localStorage.
function deleteNote(noteId) {
  notes = notes.filter(function (note) {
    return note.id !== noteId;
  });

  if (noteBeingEdited === noteId) {
    resetForm();
  }

  saveNotes();
  displayNotes();
}

// Stop editing without saving changes.
cancelEditButton.addEventListener("click", resetForm);

// Export all saved notes to a backup file.
exportNotesButton.addEventListener("click", exportNotes);

// Import notes from a backup file.
importNotesInput.addEventListener("change", function () {
  importNotes(importNotesInput.files[0]);
});

// Close the full image viewer when clicking the close button.
closeImageModal.addEventListener("click", closeImageViewer);

// Close the full image viewer when clicking outside the image.
imageModal.addEventListener("click", function (event) {
  if (event.target === imageModal) {
    closeImageViewer();
  }
});

// Close the full image viewer with the Escape key.
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && imageModal.classList.contains("open")) {
    closeImageViewer();
  }
});

// Insert the selected template only when the button is clicked.
applyTemplateButton.addEventListener("click", function () {
  const template = noteTemplates[templateSelect.value];

  if (!template) {
    alert("Please choose a template first.");
    return;
  }

  if (noteText.value.trim() === "") {
    noteText.value = template;
  } else {
    noteText.value += "\n\n" + template;
  }

  noteText.focus();
});

// Add the clicked emoji to the note textarea.
emojiButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const emoji = button.textContent;
    const start = noteText.selectionStart;
    const end = noteText.selectionEnd;
    const beforeText = noteText.value.slice(0, start);
    const afterText = noteText.value.slice(end);

    noteText.value = beforeText + emoji + afterText;
    noteText.focus();
    noteText.selectionStart = start + emoji.length;
    noteText.selectionEnd = start + emoji.length;
  });
});

// Update the attachment message when a file is selected.
noteFile.addEventListener("change", updateAttachmentStatus);

// Remove the selected or saved attachment from the form.
removeAttachmentButton.addEventListener("click", function () {
  currentAttachment = null;
  noteFile.value = "";
  updateAttachmentStatus();
});

// Switch dark mode on and off when the toggle is clicked.
darkModeToggle.addEventListener("click", function () {
  const shouldUseDarkMode = !document.body.classList.contains("dark-mode");
  setDarkMode(shouldUseDarkMode);
});

// Update the notes list every time the user types in the search bar.
searchInput.addEventListener("input", displayNotes);

// Re-sort notes when the sort dropdown changes.
sortSelect.addEventListener("change", displayNotes);

// Load the saved dark mode choice.
setDarkMode(localStorage.getItem(darkModeKey) === "true");

// Show saved notes as soon as the page loads.
displayNotes();
