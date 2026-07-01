import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const exportSelectedNotesButton = document.getElementById("exportSelectedNotesButton");
const importNotesInput = document.getElementById("importNotesInput");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const syncStatus = document.getElementById("syncStatus");
const emojiButtons = document.querySelectorAll(".emoji-button");

// This key is used to save and load notes from localStorage.
const storageKey = "taliaWikiNotes";
const darkModeKey = "taliaWikiDarkMode";

// Firebase connects Talia Wiki to cloud sync and Google login.
const firebaseConfig = {
  apiKey: "AIzaSyBQyCF57AQ7dV0zAj6zBYKKY3qFodmewuE",
  authDomain: "talia-wiki.firebaseapp.com",
  projectId: "talia-wiki",
  storageBucket: "talia-wiki.firebasestorage.app",
  messagingSenderId: "428841207090",
  appId: "1:428841207090:web:7e74db919915ac780c032b",
  measurementId: "G-FH872LW2R6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const database = getFirestore(app);
const storage = getStorage(app);

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
notes = notes.map(normalizeNote);

// This keeps track of which note is being edited.
let noteBeingEdited = null;

// This keeps the current attachment while a note is being edited.
let currentAttachment = null;

// This keeps track of note cards selected for export.
let selectedNoteIds = [];

// These keep track of the current cloud sync state.
let currentUser = null;
let unsubscribeCloudNotes = null;
let isApplyingCloudNotes = false;
let isFirstCloudLoad = true;

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

// Make older saved notes match the newest note format.
function normalizeNote(note, index) {
  const fallbackDate = note.id || Date.now() + (index || 0);

  return {
    id: String(note.id || Date.now() + (index || 0)),
    title: note.title || "Untitled Note",
    category: note.category || "Coding",
    text: note.text || "",
    favorite: note.favorite || false,
    attachment: note.attachment || null,
    createdAt: note.createdAt || fallbackDate,
    updatedAt: note.updatedAt || fallbackDate
  };
}

// Show a friendly cloud sync message.
function updateSyncStatus(message) {
  syncStatus.textContent = message;
}

// Get the Firestore spot where this user's notes are saved.
function getUserNotesCollection() {
  return collection(database, "users", currentUser.uid, "notes");
}

// Make file names safe for Firebase Storage paths.
function getSafeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

// Check whether an attachment is an image, even if it came from an older backup.
function isImageAttachment(attachment) {
  if (!attachment) {
    return false;
  }

  const hasImageType = attachment.type && attachment.type.startsWith("image/");
  const hasImageData = attachment.data && attachment.data.startsWith("data:image/");
  const hasImageUrl = attachment.url && attachment.type && attachment.type.startsWith("image/");

  return hasImageType || hasImageData || hasImageUrl;
}

// Upload one attachment to Firebase Storage and return the link for the note.
async function uploadAttachmentToCloud(file, noteId) {
  const safeFileName = getSafeFileName(file.name);
  const attachmentPath = "users/" + currentUser.uid + "/attachments/" + noteId + "/" + Date.now() + "-" + safeFileName;
  const attachmentRef = ref(storage, attachmentPath);

  await uploadBytes(attachmentRef, file, { contentType: file.type });

  return {
    name: file.name,
    type: file.type,
    url: await getDownloadURL(attachmentRef),
    path: attachmentPath
  };
}

// Turn an older localStorage attachment into a Firebase Storage attachment.
async function uploadSavedAttachmentToCloud(attachment, noteId) {
  if (!attachment || !attachment.data || attachment.url) {
    return attachment;
  }

  const response = await fetch(attachment.data);
  const attachmentBlob = await response.blob();
  const safeFileName = getSafeFileName(attachment.name || "attachment");
  const attachmentPath = "users/" + currentUser.uid + "/attachments/" + noteId + "/" + Date.now() + "-" + safeFileName;
  const attachmentRef = ref(storage, attachmentPath);

  await uploadBytes(attachmentRef, attachmentBlob, { contentType: attachment.type });

  return {
    name: attachment.name || "attachment",
    type: attachment.type || attachmentBlob.type,
    url: await getDownloadURL(attachmentRef),
    path: attachmentPath
  };
}

// Save the current notes array to localStorage and Firebase when signed in.
function saveNotes() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(notes));
  } catch (error) {
    alert("This file is too large to save in your browser. Try a smaller image or PDF.");
  }

  if (currentUser && !isApplyingCloudNotes) {
    syncNotesToCloud();
  }
}

// Save the selected image or PDF locally, or upload it to Firebase when signed in.
function readAttachmentFile(file, noteId) {
  return new Promise(async function (resolve, reject) {
    if (!file) {
      resolve(currentAttachment);
      return;
    }

    const maxFileSize = 4 * 1024 * 1024;

    if (file.size > maxFileSize) {
      reject("Please choose a file smaller than 4MB.");
      return;
    }

    if (currentUser) {
      try {
        resolve(await uploadAttachmentToCloud(file, noteId));
      } catch (error) {
        reject("That file could not sync to Firebase. Please try again.");
      }

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
function exportNotes(notesToExport, fileLabel) {
  if (notesToExport.length === 0) {
    alert("Please select at least one note to export.");
    return;
  }

  const backup = {
    app: "Talia Wiki",
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notesToExport
  };

  const backupText = JSON.stringify(backup, null, 2);
  const backupFile = new Blob([backupText], { type: "application/json" });
  const downloadLink = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  downloadLink.href = URL.createObjectURL(backupFile);
  downloadLink.download = "talia-wiki-" + fileLabel + "-" + dateStamp + ".json";
  downloadLink.click();
  URL.revokeObjectURL(downloadLink.href);
}

// Export only the notes that are checked.
function exportSelectedNotes() {
  const selectedNotes = notes.filter(function (note) {
    return selectedNoteIds.includes(note.id);
  });

  exportNotes(selectedNotes, "selected-notes");
}

// Give imported notes fresh IDs when adding them to existing notes.
function copyImportedNotes(importedNotes) {
  return importedNotes.map(function (note, index) {
    const fallbackDate = note.id || Date.now();

    return {
      id: String(Date.now() + index),
      title: note.title || "Untitled Note",
      category: note.category || "Coding",
      text: note.text || "",
      favorite: note.favorite || false,
      attachment: note.attachment || null,
      createdAt: note.createdAt || fallbackDate,
      updatedAt: note.updatedAt || fallbackDate
    };
  });
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

      const shouldImport = confirm("Import these notes? Click OK to continue.");

      if (!shouldImport) {
        return;
      }

      const shouldReplace = confirm("Click OK to replace your current notes. Click Cancel to add the imported notes to your current notes.");
      const cleanedImportedNotes = importedNotes.map(function (note) {
        const fallbackDate = note.id || Date.now();

        return {
          id: String(note.id || Date.now()),
          title: note.title || "Untitled Note",
          category: note.category || "Coding",
          text: note.text || "",
          favorite: note.favorite || false,
          attachment: note.attachment || null,
          createdAt: note.createdAt || fallbackDate,
          updatedAt: note.updatedAt || fallbackDate
        };
      });

      if (shouldReplace) {
        notes = cleanedImportedNotes;
      } else {
        notes = copyImportedNotes(importedNotes).concat(notes);
      }

      selectedNoteIds = [];
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

// Merge local notes with cloud notes without making duplicates.
function mergeNotes(cloudNotes, localNotes) {
  const mergedNotes = new Map();

  cloudNotes.concat(localNotes).forEach(function (note) {
    const cleanNote = normalizeNote(note);
    const savedNote = mergedNotes.get(cleanNote.id);

    if (!savedNote || cleanNote.updatedAt > savedNote.updatedAt) {
      mergedNotes.set(cleanNote.id, cleanNote);
    }
  });

  return Array.from(mergedNotes.values());
}

// Prepare a note before it goes to Firestore.
async function prepareNoteForCloud(note) {
  const cleanNote = normalizeNote(note);

  if (cleanNote.attachment && cleanNote.attachment.data && !cleanNote.attachment.url) {
    cleanNote.attachment = await uploadSavedAttachmentToCloud(cleanNote.attachment, cleanNote.id);
  }

  return cleanNote;
}

// Copy the current note list into Firebase for the signed-in user.
async function syncNotesToCloud() {
  if (!currentUser) {
    return;
  }

  try {
    updateSyncStatus("Syncing your notes...");

    const notesCollection = getUserNotesCollection();
    const cloudSnapshot = await getDocs(notesCollection);
    const savedNoteIds = notes.map(function (note) {
      return String(note.id);
    });

    for (const note of notes) {
      const cloudNote = await prepareNoteForCloud(note);
      const noteRef = doc(database, "users", currentUser.uid, "notes", cloudNote.id);

      await setDoc(noteRef, cloudNote);
    }

    for (const cloudDoc of cloudSnapshot.docs) {
      if (!savedNoteIds.includes(cloudDoc.id)) {
        await deleteDoc(cloudDoc.ref);
      }
    }

    updateSyncStatus("Synced with Google as " + currentUser.displayName + ".");
  } catch (error) {
    updateSyncStatus("Could not sync yet. Check your Firebase rules and try again.");
  }
}

// Watch Firebase for note changes from your other devices.
function watchCloudNotes() {
  if (unsubscribeCloudNotes) {
    unsubscribeCloudNotes();
  }

  isFirstCloudLoad = true;
  unsubscribeCloudNotes = onSnapshot(getUserNotesCollection(), function (snapshot) {
    const cloudNotes = snapshot.docs.map(function (cloudDoc) {
      return normalizeNote({
        id: cloudDoc.id,
        ...cloudDoc.data()
      });
    });

    if (isFirstCloudLoad) {
      isFirstCloudLoad = false;
      const mergedNotes = mergeNotes(cloudNotes, notes);

      isApplyingCloudNotes = true;
      notes = mergedNotes;
      localStorage.setItem(storageKey, JSON.stringify(notes));
      displayNotes();
      isApplyingCloudNotes = false;

      if (mergedNotes.length !== cloudNotes.length) {
        syncNotesToCloud();
      } else {
        updateSyncStatus("Synced with Google as " + currentUser.displayName + ".");
      }

      return;
    }

    isApplyingCloudNotes = true;
    notes = cloudNotes;
    localStorage.setItem(storageKey, JSON.stringify(notes));
    displayNotes();
    updateSyncStatus("Synced with Google as " + currentUser.displayName + ".");
    isApplyingCloudNotes = false;
  }, function () {
    updateSyncStatus("Firebase is connected, but the rules need permission for your account.");
  });
}

// Create one note card and add the note information inside it.
function createNoteCard(note) {
  const card = document.createElement("article");
  card.className = "note-card";

  if (note.favorite) {
    card.classList.add("favorite");
  }

  const selectLabel = document.createElement("label");
  selectLabel.className = "select-note-label";

  const selectCheckbox = document.createElement("input");
  selectCheckbox.type = "checkbox";
  selectCheckbox.checked = selectedNoteIds.includes(note.id);
  selectCheckbox.addEventListener("change", function () {
    if (selectCheckbox.checked) {
      selectedNoteIds.push(note.id);
    } else {
      selectedNoteIds = selectedNoteIds.filter(function (selectedId) {
        return selectedId !== note.id;
      });
    }
  });

  const selectText = document.createElement("span");
  selectText.textContent = "Select for export";

  selectLabel.append(selectCheckbox, selectText);

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

  if (isImageAttachment(note.attachment)) {
    attachmentElement = document.createElement("img");
    attachmentElement.className = "note-image";
    attachmentElement.src = note.attachment.url || note.attachment.data;
    attachmentElement.alt = note.attachment.name;
    attachmentElement.title = "Click to view full image";
    attachmentElement.addEventListener("click", function () {
      openImageModal(note.attachment.url || note.attachment.data, note.attachment.name);
    });
  } else if (note.attachment) {
    attachmentElement = document.createElement("a");
    attachmentElement.className = "pdf-link";
    attachmentElement.href = note.attachment.url || note.attachment.data;
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
  card.append(selectLabel, title, category, dates, text);

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
  const noteId = noteBeingEdited || String(Date.now());
  const savedAt = Date.now();

  try {
    attachment = await readAttachmentFile(noteFile.files[0], noteId);
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
          updatedAt: savedAt
        };
      }

      return note;
    });
  } else {
    const newNote = {
      id: noteId,
      title: noteTitle.value.trim(),
      category: noteCategory.value,
      text: noteText.value.trim(),
      favorite: false,
      attachment: attachment,
      createdAt: savedAt,
      updatedAt: savedAt
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
      note.updatedAt = Date.now();
    }

    return note;
  });

  saveNotes();
  displayNotes();
}

// Delete one note and update localStorage.
function deleteNote(noteId) {
  const noteToDelete = notes.find(function (note) {
    return note.id === noteId;
  });

  notes = notes.filter(function (note) {
    return note.id !== noteId;
  });

  if (noteBeingEdited === noteId) {
    resetForm();
  }

  selectedNoteIds = selectedNoteIds.filter(function (selectedId) {
    return selectedId !== noteId;
  });

  saveNotes();
  displayNotes();

  if (currentUser && noteToDelete && noteToDelete.attachment && noteToDelete.attachment.path) {
    deleteObject(ref(storage, noteToDelete.attachment.path)).catch(function () {});
  }
}

// Stop editing without saving changes.
cancelEditButton.addEventListener("click", resetForm);

// Export all saved notes to a backup file.
exportNotesButton.addEventListener("click", function () {
  exportNotes(notes, "all-notes");
});

// Export only checked notes to a backup file.
exportSelectedNotesButton.addEventListener("click", exportSelectedNotes);

// Import notes from a backup file.
importNotesInput.addEventListener("change", function () {
  importNotes(importNotesInput.files[0]);
});

// Sign in with Google so notes can sync across devices.
signInButton.addEventListener("click", function () {
  signInWithPopup(auth, googleProvider).catch(function () {
    updateSyncStatus("Google sign-in did not finish. Please try again.");
  });
});

// Sign out when you do not want this browser connected to cloud sync.
signOutButton.addEventListener("click", function () {
  signOut(auth);
});

// Update the page when the Google login state changes.
onAuthStateChanged(auth, function (user) {
  currentUser = user;

  if (user) {
    signInButton.style.display = "none";
    signOutButton.style.display = "inline-flex";
    updateSyncStatus("Signed in as " + user.displayName + ". Loading your cloud notes...");
    watchCloudNotes();
  } else {
    if (unsubscribeCloudNotes) {
      unsubscribeCloudNotes();
      unsubscribeCloudNotes = null;
    }

    signInButton.style.display = "inline-flex";
    signOutButton.style.display = "none";
    updateSyncStatus("Sign in with Google to sync notes across your devices.");
  }
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
