import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getFirestore, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDownloadURL, getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Firebase is only used to save the generated set to the existing Talia Wiki notes.
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
const database = getFirestore(app);
const storage = getStorage(app);

// Page elements.
const generatorForm = document.getElementById("generatorForm");
const occasionInput = document.getElementById("occasion");
const vibeInput = document.getElementById("vibe");
const lengthInput = document.getElementById("length");
const shapeInput = document.getElementById("shape");
const designLevelInput = document.getElementById("designLevel");
const presetSwatches = document.getElementById("presetSwatches");
const customSwatches = document.getElementById("customSwatches");
const colorPaletteTray = document.getElementById("colorPaletteTray");
const selectedColorSummary = document.getElementById("selectedColorSummary");
const customColorPicker = document.getElementById("customColorPicker");
const paletteName = document.getElementById("paletteName");
const savePaletteButton = document.getElementById("savePaletteButton");
const saveGeneratedPaletteButton = document.getElementById("saveGeneratedPaletteButton");
const savedPalettes = document.getElementById("savedPalettes");
const finalImageInput = document.getElementById("finalImage");
const imagePreview = document.getElementById("imagePreview");
const saveStatus = document.getElementById("saveStatus");

const resultCard = document.getElementById("resultCard");
const setName = document.getElementById("setName");
const difficultyBadge = document.getElementById("difficultyBadge");
const emptyResult = document.getElementById("emptyResult");
const resultContent = document.getElementById("resultContent");
const palettePreview = document.getElementById("palettePreview");
const estimatedTime = document.getElementById("estimatedTime");
const estimatedPrice = document.getElementById("estimatedPrice");
const difficultyText = document.getElementById("difficultyText");
const fingerBreakdown = document.getElementById("fingerBreakdown");
const productsNeeded = document.getElementById("productsNeeded");
const techniqueTips = document.getElementById("techniqueTips");
const clientMessage = document.getElementById("clientMessage");
const imagePrompt = document.getElementById("imagePrompt");
const copyPromptButton = document.getElementById("copyPromptButton");
const copyClientButton = document.getElementById("copyClientButton");
const saveToWikiButton = document.getElementById("saveToWikiButton");

const storageKey = "taliaWikiNotes";
const paletteStorageKey = "taliaNailPalettes";
let currentUser = null;
let currentSet = null;
let selectedColors = [];
let customColors = [];
let generatedPalette = [];

const levelDetails = {
  simple: {
    time: "1.5 - 2 hours",
    price: "$55 - $70",
    difficulty: "Beginner friendly",
    accentCount: 2
  },
  medium: {
    time: "2 - 2.5 hours",
    price: "$70 - $90",
    difficulty: "Intermediate",
    accentCount: 4
  },
  detailed: {
    time: "2.5 - 3.5 hours",
    price: "$90 - $120",
    difficulty: "Advanced",
    accentCount: 6
  },
  extra: {
    time: "3.5 - 4.5 hours",
    price: "$120 - $160",
    difficulty: "Expert glam",
    accentCount: 8
  }
};

const vibeWords = {
  "soft coquette": ["sweet", "ribboned", "delicate"],
  "clean girl": ["glossy", "fresh", "minimal"],
  "luxury baddie": ["expensive", "glam", "high-shine"],
  "romantic glam": ["dreamy", "soft", "sparkling"],
  "y2k girly": ["playful", "glossy", "cute"],
  "minimal chic": ["sleek", "balanced", "elevated"],
  "bold editorial": ["dramatic", "artistic", "statement"]
};

const colorMap = {
  baby: "#ffc1dd",
  pink: "#ff69b4",
  nude: "#e8b6a7",
  white: "#fff7fb",
  chrome: "#d9d9e8",
  silver: "#c8c7d7",
  gold: "#f7cf6d",
  red: "#e64f73",
  black: "#1b1018",
  blue: "#9fc9ff",
  purple: "#c899ff",
  lavender: "#d8b5ff",
  green: "#98e6c4",
  brown: "#9a6048",
  clear: "#f7edf3",
  milky: "#fff1f8"
};

const presetColors = [
  { id: "white", name: "White", hex: "#fff9fb" },
  { id: "milky-white", name: "Milky White", hex: "#fff1f6" },
  { id: "black", name: "Black", hex: "#171017" },
  { id: "nude", name: "Nude", hex: "#d6a18f" },
  { id: "baby-pink", name: "Baby Pink", hex: "#ffc1dd" },
  { id: "hot-pink", name: "Hot Pink", hex: "#ff4da6" },
  { id: "dusty-rose", name: "Dusty Rose", hex: "#c97991" },
  { id: "red", name: "Red", hex: "#d9284f" },
  { id: "yellow", name: "Yellow", hex: "#f9d35f" },
  { id: "sage-green", name: "Sage Green", hex: "#a8c9a3" },
  { id: "emerald", name: "Emerald", hex: "#1e8b68" },
  { id: "baby-blue", name: "Baby Blue", hex: "#a8d8ff" },
  { id: "brown", name: "Brown", hex: "#8a5a44" }
];

const starterPalettes = [
  {
    id: "soft-pink",
    name: "🌸 Soft Pink",
    colors: [
      { name: "Baby Pink", hex: "#ffc1dd" },
      { name: "Milky White", hex: "#fff1f6" },
      { name: "Dusty Rose", hex: "#c97991" }
    ]
  },
  {
    id: "teddy-nude",
    name: "🧸 Teddy Nude",
    colors: [
      { name: "Nude", hex: "#d6a18f" },
      { name: "Brown", hex: "#8a5a44" },
      { name: "Milky White", hex: "#fff1f6" }
    ]
  },
  {
    id: "chrome-dreams",
    name: "✨ Chrome Dreams",
    colors: [
      { name: "Milky White", hex: "#fff1f6" },
      { name: "Silver Chrome", hex: "#d9d9e8" },
      { name: "Baby Pink", hex: "#ffc1dd" }
    ]
  },
  {
    id: "cherry-red",
    name: "🍒 Cherry Red",
    colors: [
      { name: "Red", hex: "#d9284f" },
      { name: "Black", hex: "#171017" },
      { name: "Milky White", hex: "#fff1f6" }
    ]
  },
  {
    id: "bridal",
    name: "💍 Bridal",
    colors: [
      { name: "White", hex: "#fff9fb" },
      { name: "Milky White", hex: "#fff1f6" },
      { name: "Nude", hex: "#d6a18f" }
    ]
  },
  {
    id: "christmas",
    name: "🎄 Christmas",
    colors: [
      { name: "Red", hex: "#d9284f" },
      { name: "Emerald", hex: "#1e8b68" },
      { name: "Gold", hex: "#f7cf6d" }
    ]
  },
  {
    id: "vacation",
    name: "🌴 Vacation",
    colors: [
      { name: "Baby Blue", hex: "#a8d8ff" },
      { name: "Yellow", hex: "#f9d35f" },
      { name: "Hot Pink", hex: "#ff4da6" }
    ]
  }
];

const autoPalettes = [
  [
    { name: "Baby Pink", hex: "#ffc1dd" },
    { name: "Nude", hex: "#d6a18f" },
    { name: "Milky White", hex: "#fff1f6" },
    { name: "Silver Chrome", hex: "#d9d9e8" }
  ],
  [
    { name: "Dusty Rose", hex: "#c97991" },
    { name: "Brown", hex: "#8a5a44" },
    { name: "Nude", hex: "#d6a18f" },
    { name: "Gold", hex: "#f7cf6d" }
  ],
  [
    { name: "Sage Green", hex: "#a8c9a3" },
    { name: "Milky White", hex: "#fff1f6" },
    { name: "Baby Pink", hex: "#ffc1dd" },
    { name: "Pearl White", hex: "#fff9fb" }
  ],
  [
    { name: "Red", hex: "#d9284f" },
    { name: "Black", hex: "#171017" },
    { name: "Milky White", hex: "#fff1f6" },
    { name: "Hot Pink", hex: "#ff4da6" }
  ]
];

// Track Google login so saved generator notes can sync to Firebase too.
onAuthStateChanged(auth, function (user) {
  currentUser = user;
});

// Get all checked add-ons from the form.
function getSelectedAddOns() {
  return Array.from(document.querySelectorAll(".addons-fieldset input:checked")).map(function (checkbox) {
    return checkbox.value;
  });
}

// Add list items to a result list.
function fillList(listElement, items) {
  listElement.innerHTML = "";

  items.forEach(function (item) {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    listElement.appendChild(listItem);
  });
}

// Load saved palettes, or add starter examples the first time.
function getSavedPalettes() {
  const saved = JSON.parse(localStorage.getItem(paletteStorageKey));

  if (saved && Array.isArray(saved)) {
    return saved;
  }

  localStorage.setItem(paletteStorageKey, JSON.stringify(starterPalettes));
  return starterPalettes;
}

// Save the palette list to localStorage.
function setSavedPalettes(palettes) {
  localStorage.setItem(paletteStorageKey, JSON.stringify(palettes));
}

// Turn selected colors into readable text.
function getColorText(colors) {
  return colors.map(function (color) {
    return color.name;
  }).join(", ");
}

// Keep each selected color unique by id.
function isColorSelected(colorId) {
  return selectedColors.some(function (color) {
    return color.id === colorId;
  });
}

// Match saved colors back to preset swatches when possible.
function findPresetColor(savedColor) {
  return presetColors.find(function (presetColor) {
    return presetColor.name === savedColor.name || presetColor.hex.toLowerCase() === savedColor.hex.toLowerCase();
  });
}

// Select or deselect one color.
function toggleColor(color) {
  if (isColorSelected(color.id)) {
    selectedColors = selectedColors.filter(function (selectedColor) {
      return selectedColor.id !== color.id;
    });
  } else {
    selectedColors.push(color);
  }

  generatedPalette = [];
  renderColorStudio();
}

// Create one clickable color swatch.
function createColorSwatch(color, options) {
  const swatch = document.createElement("button");
  swatch.type = "button";
  swatch.className = "color-swatch";
  swatch.style.setProperty("--swatch-color", color.hex);

  if (isColorSelected(color.id)) {
    swatch.classList.add("selected");
  }

  const dot = document.createElement("span");
  dot.className = "swatch-color";

  const name = document.createElement("span");
  name.textContent = color.name;

  swatch.append(dot, name);

  if (options && options.removable) {
    const removeButton = document.createElement("span");
    removeButton.className = "remove-custom-color";
    removeButton.textContent = "×";
    removeButton.addEventListener("click", function (event) {
      event.stopPropagation();
      removeCustomColor(color.id);
    });
    swatch.appendChild(removeButton);
  }

  swatch.addEventListener("click", function () {
    toggleColor(color);
  });

  return swatch;
}

// Show selected colors as large circular palette dots beside the plus button.
function renderPaletteTray() {
  const addColorControl = colorPaletteTray.querySelector(".add-color-control");

  colorPaletteTray.querySelectorAll(".palette-tray-color").forEach(function (dot) {
    dot.remove();
  });

  selectedColors.forEach(function (color) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "palette-tray-color selected";
    dot.style.setProperty("--swatch-color", color.hex);
    dot.title = "Remove " + color.name;
    dot.addEventListener("click", function () {
      toggleColor(color);
    });

    colorPaletteTray.insertBefore(dot, addColorControl);
  });
}

// Show the selected colors, preset swatches, and custom swatches.
function renderColorStudio() {
  presetSwatches.innerHTML = "";
  customSwatches.innerHTML = "";

  presetColors.forEach(function (color) {
    presetSwatches.appendChild(createColorSwatch(color));
  });

  customColors.forEach(function (color) {
    customSwatches.appendChild(createColorSwatch(color, { removable: true }));
  });

  if (selectedColors.length === 0) {
    selectedColorSummary.textContent = "No colors selected yet. I can create a matching palette for you.";
  } else {
    selectedColorSummary.textContent = "Selected: " + getColorText(selectedColors);
  }

  renderPaletteTray();
}

// Add one custom color from the native color picker.
function addCustomColor(hexValue) {
  const customColor = {
    id: "custom-" + Date.now(),
    name: "Custom " + hexValue.toUpperCase(),
    hex: hexValue
  };

  customColors.push(customColor);
  selectedColors.push(customColor);
  generatedPalette = [];
  renderColorStudio();
}

// Remove a custom color from both custom and selected colors.
function removeCustomColor(colorId) {
  customColors = customColors.filter(function (color) {
    return color.id !== colorId;
  });

  selectedColors = selectedColors.filter(function (color) {
    return color.id !== colorId;
  });

  renderColorStudio();
}

// Render saved palettes with load, rename, and delete actions.
function renderSavedPalettes() {
  const palettes = getSavedPalettes();
  savedPalettes.innerHTML = "";

  palettes.forEach(function (palette) {
    const paletteCard = document.createElement("article");
    paletteCard.className = "palette-chip";

    const label = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = palette.name;

    const miniPalette = document.createElement("div");
    miniPalette.className = "mini-palette";

    palette.colors.forEach(function (color) {
      const dot = document.createElement("span");
      dot.className = "mini-dot";
      dot.style.backgroundColor = color.hex;
      miniPalette.appendChild(dot);
    });

    label.append(title, miniPalette);

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.textContent = "Load";
    loadButton.addEventListener("click", function () {
      loadPalette(palette);
    });

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "Rename";
    renameButton.addEventListener("click", function () {
      renamePalette(palette.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      deletePalette(palette.id);
    });

    paletteCard.append(label, loadButton, renameButton, deleteButton);
    savedPalettes.appendChild(paletteCard);
  });
}

// Save a selected or generated palette.
function savePalette(colorsToSave, fallbackName) {
  if (colorsToSave.length === 0) {
    saveStatus.textContent = "Choose colors or generate a palette first.";
    return;
  }

  const palettes = getSavedPalettes();
  const newPalette = {
    id: "palette-" + Date.now(),
    name: paletteName.value.trim() || fallbackName,
    colors: colorsToSave.map(function (color) {
      return {
        name: color.name,
        hex: color.hex
      };
    })
  };

  palettes.unshift(newPalette);
  setSavedPalettes(palettes);
  paletteName.value = "";
  renderSavedPalettes();
  saveStatus.textContent = "Palette saved.";
}

// Load a saved palette into the current selected colors.
function loadPalette(palette) {
  customColors = [];
  selectedColors = palette.colors.map(function (color, index) {
    const presetColor = findPresetColor(color);

    if (presetColor) {
      return presetColor;
    }

    const loadedCustomColor = {
      id: "loaded-custom-" + palette.id + "-" + index,
      name: color.name,
      hex: color.hex
    };

    customColors.push(loadedCustomColor);

    return loadedCustomColor;
  });

  selectedColors = selectedColors.map(function (color) {
    return {
      name: color.name,
      id: color.id,
      hex: color.hex
    };
  });

  generatedPalette = [];
  renderColorStudio();
  saveStatus.textContent = "Loaded " + palette.name + ".";
}

// Rename one saved palette.
function renamePalette(paletteId) {
  const palettes = getSavedPalettes();
  const palette = palettes.find(function (savedPalette) {
    return savedPalette.id === paletteId;
  });

  if (!palette) {
    return;
  }

  const newName = prompt("Rename this palette:", palette.name);

  if (!newName || newName.trim() === "") {
    return;
  }

  palette.name = newName.trim();
  setSavedPalettes(palettes);
  renderSavedPalettes();
}

// Delete one saved palette.
function deletePalette(paletteId) {
  const shouldDelete = confirm("Delete this palette?");

  if (!shouldDelete) {
    return;
  }

  const palettes = getSavedPalettes().filter(function (palette) {
    return palette.id !== paletteId;
  });

  setSavedPalettes(palettes);
  renderSavedPalettes();
}

// Create a beautiful matching palette when the user has not selected colors.
function getRandomPalette() {
  const randomIndex = Math.floor(Math.random() * autoPalettes.length);

  return autoPalettes[randomIndex].map(function (color, index) {
    return {
      id: "generated-" + Date.now() + "-" + index,
      name: color.name,
      hex: color.hex
    };
  });
}

// Show the chosen colors as glowing circles in the preview area.
function displayPalette(colors) {
  palettePreview.innerHTML = "";

  colors.forEach(function (color) {
    const dot = document.createElement("span");
    dot.className = "palette-dot";
    dot.title = color.name;
    dot.style.backgroundColor = color.hex;
    palettePreview.appendChild(dot);
  });
}

// Build a cute nail set name from the selected options.
function buildSetName(occasion, vibe, colors, addOns) {
  const firstColor = colors[0] ? colors[0].name : "Pink";
  const secondColor = colors[1] ? " " + colors[1].name : "";
  const words = vibeWords[vibe] || ["pretty", "glossy", "custom"];
  const addOnName = addOns.length > 0 ? addOns[0] : "glow";

  return firstColor + secondColor + " " + words[0] + " " + addOnName + " set";
}

// Create the finger-by-finger design plan.
function buildFingerBreakdown(choices) {
  const addOnText = choices.addOns.length > 0 ? choices.addOns.join(", ") : "soft glossy accents";
  const colors = choices.colors;
  const colorOne = colors[0] ? colors[0].name : "Baby Pink";
  const colorTwo = colors[1] ? colors[1].name : colorOne;
  const colorThree = colors[2] ? colors[2].name : "Milky White";
  const colorFour = colors[3] ? colors[3].name : colorTwo;

  return [
    "Thumbs: " + colorOne + " base with " + colorThree + " detail and " + addOnText + ".",
    "Index fingers: glossy " + colorTwo + " solid nail to balance the set.",
    "Middle fingers: main statement nail blending " + getColorText(colors) + " with the strongest " + choices.vibe + " detail.",
    "Ring fingers: soft accent using " + colorThree + " and " + colorFour + " so the palette feels tied together.",
    "Pinky fingers: clean " + colorOne + " finish with a tiny accent so the set still feels wearable."
  ];
}

// Create a product list based on the design.
function buildProducts(choices) {
  const colorProducts = choices.colors.map(function (color) {
    return "Gel color: " + color.name;
  });

  const products = [
    "Nail prep tools: file, buffer, cuticle pusher, dehydrator, primer",
    "Base coat and glossy top coat",
    ...colorProducts,
    choices.length + " " + choices.shape + " tips or builder gel structure",
    "Detail brush and liner brush for clean artwork"
  ];

  choices.addOns.forEach(function (addOn) {
    products.push("Add-on product: " + addOn);
  });

  return products;
}

// Create technique tips that match the selected design level.
function buildTechniqueTips(choices) {
  const tips = [
    "Map the " + getColorText(choices.colors) + " palette before painting so both hands feel balanced.",
    "Keep the cuticle area thin and clean to help retention.",
    "Cure each detailed layer before adding raised add-ons or top coat."
  ];

  if (choices.colors.length > 3) {
    tips.push("Use the lightest color as a breathing space so the palette stays expensive instead of crowded.");
  }

  if (choices.designLevel === "detailed" || choices.designLevel === "extra") {
    tips.push("Build the art in thin layers so the final set stays smooth instead of bulky.");
  }

  if (choices.addOns.includes("rhinestones") || choices.addOns.includes("charms") || choices.addOns.includes("pearls")) {
    tips.push("Place stones and charms with gem gel, then seal around each piece without covering the shine.");
  }

  if (choices.addOns.includes("chrome")) {
    tips.push("Use no-wipe top coat before chrome, then seal the free edge twice.");
  }

  return tips;
}

// Estimate time, price, and difficulty from the full design choices.
function estimateSetDetails(choices) {
  const baseDetails = levelDetails[choices.designLevel];
  const colorCount = choices.colors.length;
  const addOnCount = choices.addOns.length;
  const extraMinutes = Math.max(0, colorCount - 2) * 10 + addOnCount * 8;
  const extraPrice = Math.max(0, colorCount - 2) * 5 + addOnCount * 6;

  const priceNumbers = baseDetails.price.match(/\d+/g).map(Number);
  const lowPrice = priceNumbers[0] + extraPrice;
  const highPrice = priceNumbers[1] + extraPrice;

  let difficulty = baseDetails.difficulty;

  if (colorCount >= 4 || addOnCount >= 4) {
    difficulty = "Advanced glam";
  }

  if (choices.designLevel === "extra" && (colorCount >= 4 || addOnCount >= 5)) {
    difficulty = "Expert glam";
  }

  return {
    time: baseDetails.time + (extraMinutes > 0 ? " + " + extraMinutes + " min detail time" : ""),
    price: "$" + lowPrice + " - $" + highPrice,
    difficulty: difficulty
  };
}

// Write the client-facing message.
function buildClientMessage(choices, name, details) {
  return "Hi love! Your " + name + " is a " + choices.vibe + " " + choices.length + " " + choices.shape +
    " set for " + choices.occasion + " using " + getColorText(choices.colors) + ". I would plan about " + details.time +
    " for this appointment, and the estimated price range is " + details.price +
    " depending on final add-ons. Bring any inspo pictures you like, and we can make it match your exact vibe.";
}

// Write a detailed prompt that can be pasted into any image generator.
function buildImagePrompt(choices, name) {
  const addOnText = choices.addOns.length > 0 ? choices.addOns.join(", ") : "subtle glossy details";

  return choices.length + " " + choices.shape + " acrylic nails featuring " + getColorText(choices.colors) +
    " with " + addOnText + ", a " + choices.vibe + " aesthetic for " + choices.occasion +
    ", glossy finish, luxury nail photography, clean cuticles, salon-quality detail, feminine dark pink studio background, soft lighting, close-up hand pose, no text in the image.";
}

// Create one full generated nail set object.
function generateNailSet() {
  const colorsForSet = selectedColors.length > 0 ? selectedColors : getRandomPalette();

  if (selectedColors.length === 0) {
    generatedPalette = colorsForSet;
    selectedColorSummary.textContent = "Generated palette: " + getColorText(generatedPalette);
  }

  const choices = {
    occasion: occasionInput.value,
    vibe: vibeInput.value,
    length: lengthInput.value,
    shape: shapeInput.value,
    colors: colorsForSet,
    designLevel: designLevelInput.value,
    addOns: getSelectedAddOns()
  };

  const details = estimateSetDetails(choices);
  const name = buildSetName(choices.occasion, choices.vibe, choices.colors, choices.addOns);

  return {
    name: name,
    choices: choices,
    fingerBreakdown: buildFingerBreakdown(choices),
    products: buildProducts(choices),
    time: details.time,
    price: details.price,
    difficulty: details.difficulty,
    tips: buildTechniqueTips(choices),
    clientMessage: buildClientMessage(choices, name, details),
    imagePrompt: buildImagePrompt(choices, name)
  };
}

// Show the generated set on the page.
function displayGeneratedSet(generatedSet) {
  setName.textContent = generatedSet.name;
  difficultyBadge.textContent = generatedSet.difficulty;
  estimatedTime.textContent = generatedSet.time;
  estimatedPrice.textContent = generatedSet.price;
  difficultyText.textContent = generatedSet.difficulty;
  clientMessage.textContent = generatedSet.clientMessage;
  imagePrompt.textContent = generatedSet.imagePrompt;

  fillList(fingerBreakdown, generatedSet.fingerBreakdown);
  fillList(productsNeeded, generatedSet.products);
  fillList(techniqueTips, generatedSet.tips);
  displayPalette(generatedSet.choices.colors);

  resultCard.classList.add("has-result");
  emptyResult.style.display = "none";
  resultContent.style.display = "block";
}

// Copy text to the clipboard.
async function copyText(text, successMessage) {
  if (!text) {
    saveStatus.textContent = "Generate a nail set first.";
    return;
  }

  await navigator.clipboard.writeText(text);
  saveStatus.textContent = successMessage;
}

// Make a safe file name for Firebase Storage.
function getSafeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

// Read the manually uploaded image for the note attachment.
function readLocalImage(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      resolve(null);
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      reject("Please choose an image smaller than 4MB.");
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
      reject("That image could not be added. Please try another one.");
    });

    reader.readAsDataURL(file);
  });
}

// Upload the manually attached image to Firebase Storage when signed in.
async function uploadImageToCloud(file, noteId) {
  if (!file || !currentUser) {
    return null;
  }

  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Please choose an image smaller than 4MB.");
  }

  const safeFileName = getSafeFileName(file.name);
  const imagePath = "users/" + currentUser.uid + "/attachments/" + noteId + "/" + Date.now() + "-" + safeFileName;
  const imageRef = ref(storage, imagePath);

  await uploadBytes(imageRef, file, { contentType: file.type });

  return {
    name: file.name,
    type: file.type,
    url: await getDownloadURL(imageRef),
    path: imagePath
  };
}

// Format the generated set as one Talia Wiki note.
function buildWikiNoteText(generatedSet) {
  return [
    "Nail Set Generator",
    "",
    "Occasion: " + generatedSet.choices.occasion,
    "Vibe: " + generatedSet.choices.vibe,
    "Length: " + generatedSet.choices.length,
    "Shape: " + generatedSet.choices.shape,
    "Colors: " + getColorText(generatedSet.choices.colors),
    "Design Level: " + generatedSet.choices.designLevel,
    "Add-ons: " + (generatedSet.choices.addOns.join(", ") || "none"),
    "",
    "Finger-by-Finger Breakdown:",
    generatedSet.fingerBreakdown.map(function (item) {
      return "- " + item;
    }).join("\n"),
    "",
    "Products Needed:",
    generatedSet.products.map(function (item) {
      return "- " + item;
    }).join("\n"),
    "",
    "Estimated Time: " + generatedSet.time,
    "Estimated Price: " + generatedSet.price,
    "Difficulty: " + generatedSet.difficulty,
    "",
    "Technique Tips:",
    generatedSet.tips.map(function (item) {
      return "- " + item;
    }).join("\n"),
    "",
    "Client Message:",
    generatedSet.clientMessage,
    "",
    "AI Image Prompt:",
    generatedSet.imagePrompt
  ].join("\n");
}

// Save the generated set to localStorage and Firebase, matching the existing wiki note format.
async function saveGeneratedSetToWiki() {
  if (!currentSet) {
    saveStatus.textContent = "Generate a nail set first.";
    return;
  }

  const noteId = String(Date.now());
  const savedAt = Date.now();
  const selectedImage = finalImageInput.files[0];
  let attachment = null;

  try {
    if (currentUser && selectedImage) {
      attachment = await uploadImageToCloud(selectedImage, noteId);
    } else {
      attachment = await readLocalImage(selectedImage);
    }
  } catch (error) {
    saveStatus.textContent = error.message || error;
    return;
  }

  const newNote = {
    id: noteId,
    title: currentSet.name,
    category: "Nails",
    text: buildWikiNoteText(currentSet),
    favorite: false,
    attachment: attachment,
    createdAt: savedAt,
    updatedAt: savedAt
  };

  const savedNotes = JSON.parse(localStorage.getItem(storageKey)) || [];
  savedNotes.unshift(newNote);
  localStorage.setItem(storageKey, JSON.stringify(savedNotes));

  if (currentUser) {
    await setDoc(doc(database, "users", currentUser.uid, "notes", noteId), newNote);
    saveStatus.textContent = "Saved to Talia Wiki and synced to Google.";
  } else {
    saveStatus.textContent = "Saved to Talia Wiki on this browser. Sign in on the wiki page to sync.";
  }
}

// Generate the set when the form is submitted.
generatorForm.addEventListener("submit", function (event) {
  event.preventDefault();
  currentSet = generateNailSet();
  displayGeneratedSet(currentSet);
  saveStatus.textContent = "Generated. Copy it, save it, or attach your final image later.";
});

// Show a preview for the optional final image.
finalImageInput.addEventListener("change", function () {
  const file = finalImageInput.files[0];

  if (!file) {
    imagePreview.style.display = "none";
    imagePreview.src = "";
    return;
  }

  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

// Add a custom swatch after the user chooses a color.
customColorPicker.addEventListener("change", function () {
  addCustomColor(customColorPicker.value);
});

// Save the currently selected palette.
savePaletteButton.addEventListener("click", function () {
  savePalette(selectedColors, "Custom Palette");
});

// Save the automatic palette that was generated when no colors were selected.
saveGeneratedPaletteButton.addEventListener("click", function () {
  savePalette(generatedPalette, "Generated Palette");
});

copyPromptButton.addEventListener("click", function () {
  copyText(imagePrompt.textContent, "Prompt copied.");
});

copyClientButton.addEventListener("click", function () {
  copyText(clientMessage.textContent, "Client message copied.");
});

saveToWikiButton.addEventListener("click", saveGeneratedSetToWiki);

// Load color tools when the page opens.
renderColorStudio();
renderSavedPalettes();
