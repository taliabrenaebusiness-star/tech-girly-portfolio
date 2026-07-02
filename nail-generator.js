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
const colorsInput = document.getElementById("colors");
const designLevelInput = document.getElementById("designLevel");
const finalImageInput = document.getElementById("finalImage");
const imagePreview = document.getElementById("imagePreview");
const saveStatus = document.getElementById("saveStatus");

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
let currentUser = null;
let currentSet = null;

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

// Turn typed color names into simple preview swatches.
function getSwatchColor(colorName) {
  const cleanColor = colorName.toLowerCase();
  const matchedColor = Object.keys(colorMap).find(function (colorKey) {
    return cleanColor.includes(colorKey);
  });

  return matchedColor ? colorMap[matchedColor] : "#ff9ccc";
}

// Show the chosen colors as glowing circles in the preview area.
function displayPalette(colors) {
  const colorList = colors.split(",").map(function (color) {
    return color.trim();
  }).filter(Boolean);

  palettePreview.innerHTML = "";

  colorList.forEach(function (color) {
    const dot = document.createElement("span");
    dot.className = "palette-dot";
    dot.title = color;
    dot.style.backgroundColor = getSwatchColor(color);
    palettePreview.appendChild(dot);
  });
}

// Build a cute nail set name from the selected options.
function buildSetName(occasion, vibe, colors, addOns) {
  const firstColor = colors.split(",")[0].trim() || "Pink";
  const words = vibeWords[vibe] || ["pretty", "glossy", "custom"];
  const addOnName = addOns.length > 0 ? addOns[0] : "glow";

  return firstColor + " " + words[0] + " " + addOnName + " set";
}

// Create the finger-by-finger design plan.
function buildFingerBreakdown(choices) {
  const addOnText = choices.addOns.length > 0 ? choices.addOns.join(", ") : "soft glossy accents";
  const base = choices.colors;

  return [
    "Thumbs: full " + base + " base with a bold " + choices.vibe + " accent using " + addOnText + ".",
    "Index fingers: clean solid color to balance the set and keep the shape looking crisp.",
    "Middle fingers: main statement design with layered detail, shine, and the strongest focal point.",
    "Ring fingers: softer accent nail that repeats the colors and ties the whole set together.",
    "Pinky fingers: simple glossy finish or tiny accent so the set still feels wearable."
  ];
}

// Create a product list based on the design.
function buildProducts(choices) {
  const products = [
    "Nail prep tools: file, buffer, cuticle pusher, dehydrator, primer",
    "Base coat and glossy top coat",
    "Gel colors: " + choices.colors,
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
    "Map the design before painting so both hands feel balanced.",
    "Keep the cuticle area thin and clean to help retention.",
    "Cure each detailed layer before adding raised add-ons or top coat."
  ];

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

// Write the client-facing message.
function buildClientMessage(choices, name, details) {
  return "Hi love! Your " + name + " is a " + choices.vibe + " " + choices.length + " " + choices.shape +
    " set for " + choices.occasion + ". I would plan about " + details.time +
    " for this appointment, and the estimated price range is " + details.price +
    " depending on final add-ons. Bring any inspo pictures you like, and we can make it match your exact vibe.";
}

// Write a detailed prompt that can be pasted into any image generator.
function buildImagePrompt(choices, name) {
  const addOnText = choices.addOns.length > 0 ? choices.addOns.join(", ") : "subtle glossy details";

  return "Create a realistic close-up photo of a fresh manicure named \"" + name + "\". " +
    "The nails are " + choices.length + " length, " + choices.shape + " shape, with a " + choices.vibe +
    " aesthetic for " + choices.occasion + ". Use these colors: " + choices.colors + ". " +
    "Design level: " + choices.designLevel + ". Include these nail art details: " + addOnText + ". " +
    "Show both hands posed elegantly on a dark pink glossy background with soft feminine lighting, clean cuticles, shiny top coat, salon-quality detail, and no extra text in the image.";
}

// Create one full generated nail set object.
function generateNailSet() {
  const choices = {
    occasion: occasionInput.value,
    vibe: vibeInput.value,
    length: lengthInput.value,
    shape: shapeInput.value,
    colors: colorsInput.value.trim(),
    designLevel: designLevelInput.value,
    addOns: getSelectedAddOns()
  };

  const details = levelDetails[choices.designLevel];
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

  emptyResult.style.display = "none";
  resultContent.style.display = "block";
}

// Copy text to the clipboard.
async function copyText(text, successMessage) {
  if (!text) {
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
    "Colors: " + generatedSet.choices.colors,
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

copyPromptButton.addEventListener("click", function () {
  copyText(imagePrompt.textContent, "Prompt copied.");
});

copyClientButton.addEventListener("click", function () {
  copyText(clientMessage.textContent, "Client message copied.");
});

saveToWikiButton.addEventListener("click", saveGeneratedSetToWiki);
