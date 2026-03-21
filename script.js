// === Google Sheet ID ===
const sheetId = "1u4BzQWOe-sYXdl1-gr9IMC2LK1lL-2NSrzRCf2CGwKo";

const BATCH_SIZE = 20;

const courses = [
  { name: "L1", index: 0 },
  { name: "L2", index: 1 },
  { name: "L3", index: 2 },
  { name: "L4", index: 3 },
  { name: "L5", index: 4 },
  { name: "L6", index: 5 },
];

// let selectedCourses = JSON.parse(localStorage.getItem("selectedCourses") || "[0,1,2,3,4,5]"); // erster Start = alle Kurse gewählt

let selectCourses;
const savedCourses = localStorage.getItem("selectedCourses");

if (savedCourses !== null) {
  selectedCourses = JSON.parse(savedCourses);
} else {
  selectedCourses = []; // 🔥 erster Start: nichts ausgewählt
}

// function renderCourseFilters() {
//   const container = document.getElementById("course-filter");
//   container.innerHTML = "";

//   courses.forEach((course, i) => {
//     const levelWords = allWords[course.index] || [];

//     const total = levelWords.length;

//     const learnedCount = levelWords.filter((w) => learned.includes(w)).length;

//     const chip = document.createElement("div");

//     chip.className = "course-chip";
//     chip.textContent = `${course.name} (${learnedCount} / ${total})`;

//     // 🔥 Reihenfolge bestimmen (Klick-Reihenfolge)
//     const order = selectedCourses.indexOf(i);

//     if (order !== -1) {
//       chip.classList.add("active");

//       // 🔵 Badge erstellen
//       const badge = document.createElement("span");
//       badge.className = "course-order";
//       badge.textContent = order + 1;

//       chip.appendChild(badge);
//     }

//     chip.addEventListener("click", () => toggleCourse(i));

//     container.appendChild(chip);
//   });
// }

function renderCourseFilters() {
  const container = document.getElementById("course-filter");
  container.innerHTML = "";

  // 🔹 Kombination aus Favoriten + normalen Kursen
  const allCourseKeys = ["favorites", ...Object.keys(courses)];

  allCourseKeys.forEach((key) => {
    const chip = document.createElement("div");
    chip.className = "course-chip";

    const index = selectedCourses.indexOf(key);

    // 🔹 Label bestimmen
    let labelText = "";

    if (key === "favorites") {
      labelText = `❤️ (${favorites.length})`;
    } else {
      labelText = courses[key].name;
    }

    chip.textContent = labelText;

    // 🔹 Aktiv + Reihenfolge
    if (index !== -1) {
      chip.classList.add("active");

      const badge = document.createElement("span");
      badge.className = "chip-order";
      badge.textContent = index + 1;
      chip.appendChild(badge);
    }

    // 🔹 Klick
    chip.addEventListener("click", () => toggleCourse(key));

    container.appendChild(chip);
  });
}

function getActiveWords() {
  let words = [];

  selectedCourses.forEach((c) => {
    // ❤️ Favoriten behandeln
    if (c === "favorites") {
      words = words.concat(favorites);
      return;
    }

    const course = courses[c];
    if (!course) return;

    const levelWords = allWords[course.index] || [];

    words = words.concat(levelWords);
  });

  return [...new Set(words)];
}

function toggleCourse(index) {
  if (selectedCourses.includes(index)) {
    selectedCourses = selectedCourses.filter((c) => c !== index);
  } else {
    selectedCourses.push(index);
  }

  localStorage.setItem("selectedCourses", JSON.stringify(selectedCourses));

  // 🔥 Reset beim Kurswechsel
  nextWordIndex = 0;
  localStorage.setItem("nextWordIndex", "0");

  renderCourseFilters();
  startApp();
}

// === Google Sheet laden ===
async function loadWordsFromSheet(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));

  const rows = json.table.rows;

  const levels = {};

  rows.forEach((row) => {
    row.c.forEach((cell, colIndex) => {
      if (!cell || !cell.v) return;

      if (!levels[colIndex]) {
        levels[colIndex] = [];
      }

      levels[colIndex].push(cell.v);
    });
  });

  return levels; // 🔥 NEU: Objekt statt Array
}

let allWords = {};
let pool = [];
let reviewPool = [];
let currentIndex = 0;
let learned = [];
let nextWordIndex = parseInt(localStorage.getItem("nextWordIndex") || "0");
let lastWord = localStorage.getItem("lastWord") || null;
let totalLearned = parseInt(localStorage.getItem("totalLearned") || "0");
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let lastLevel = null;
let allWordsActive = [];

// === Start der App ===
loadWordsFromSheet(sheetId).then((words) => {
  allWords = words;
  console.log("Vokabeln geladen:", allWords);
  startApp();
});

function startApp() {
  learned = JSON.parse(localStorage.getItem("learnedWords") || "[]");

  const activeWords = getActiveWords();

  const remainingWords = activeWords.filter((w) => !learned.includes(w));

  reviewPool = [];
  currentIndex = 0;

  allWordsActive = remainingWords;

  // 🔥 NEU: Startposition über lastWord bestimmen
  let startIndex = 0;

  if (lastWord) {
    const idx = remainingWords.indexOf(lastWord);
    if (idx !== -1) {
      startIndex = idx;
    }
  }

  nextWordIndex = startIndex;

  loadNextBatch();

  renderCourseFilters();
  showWord();
  updateProgress();
}

// === Neues Lernpaket laden ===
function loadNextBatch() {
  if (nextWordIndex >= allWordsActive.length) {
    pool = [];
    return;
  }

  pool = allWordsActive.slice(nextWordIndex, nextWordIndex + BATCH_SIZE);

  // 🔥 NEU: Cursor speichern (erstes Wort des Batches)
  if (pool.length > 0) {
    lastWord = pool[0];
    localStorage.setItem("lastWord", lastWord);
  }

  nextWordIndex += BATCH_SIZE;

  currentIndex = 0;
}

// === Wort anzeigen ===
function showWord() {
  const wordElement = document.getElementById("card");

  // 🔥 NEU: Kein Kurs ausgewählt
  if (selectedCourses.length === 0) {
    wordElement.textContent = "Wähle ein Level";
    return;
  }

  if (pool.length === 0) {
    if (reviewPool.length > 0) {
      pool = reviewPool;
      reviewPool = [];
      currentIndex = 0;
    } else {
      loadNextBatch();

      if (pool.length === 0) {
        const activeWords = getActiveWords();
        const remainingWords = activeWords.filter((w) => !learned.includes(w));

        if (remainingWords.length === 0) {
          wordElement.textContent = "Alle Vokabeln gelernt 🎉";
        } else {
          wordElement.textContent = "Wähle ein Level";
        }

        return;
      }
    }
  }

  wordElement.textContent = pool[currentIndex];
  updateProgress();
  updateFavoriteUI();
}

// === Lösung anzeigen ===
function showSolution() {
  const baseURL = "https://gebaerden-archiv.at/search?q=";
  const currentWord = pool[currentIndex];
  const formattedWord = currentWord.trim().replace(/\s+/g, "+");

  window.open(baseURL + formattedWord + "&tag=", "_blank");
}

// === Klicklogik ===
function mark(action) {
  const currentWord = pool[currentIndex];

  if (action === "ok") {
    learned.push(currentWord);

    localStorage.setItem("learnedWords", JSON.stringify(learned));

    // 🔥 NEU: Lifetime Counter erhöhen
    if (pool.length !== 0 && selectedCourses.length !== 0) {
      totalLearned++;
      localStorage.setItem("totalLearned", totalLearned);
    }

    pool.splice(currentIndex, 1);
  } else if (action === "?") {
    showSolution();

    reviewPool.push(currentWord);
    pool.splice(currentIndex, 1);
  }

  // Index korrigieren
  if (currentIndex >= pool.length) {
    currentIndex = 0;
  }

  // 🔥 NEU: Cursor sauber aktualisieren
  if (pool.length > 0) {
    lastWord = pool[currentIndex];
  } else if (reviewPool.length > 0) {
    // Falls Pool leer, aber Review kommt als nächstes
    lastWord = reviewPool[0];
  } else if (allWordsActive.length > 0) {
    // Fallback: nächstes Batch vorberechnen
    const nextIndex = Math.min(nextWordIndex, allWordsActive.length - 1);
    lastWord = allWordsActive[nextIndex];
  } else {
    lastWord = null;
  }

  if (lastWord) {
    localStorage.setItem("lastWord", lastWord);
  }

  showWord();
  updateProgress();

  // Kursanzeige aktualisieren
  renderCourseFilters();
}

// === Fortschritt + Emoji-Level ===
function updateProgress(testLevelLearned) {
  const total = allWords.length;
  const learnedCount = totalLearned;

  const emojiEl = document.getElementById("progress-emoji");
  const textEl = document.getElementById("progress-text");
  const container = document.getElementById("progress-container");

  if (!emojiEl || !textEl || !container) return;

  let message = "";
  let emoji = "";
  let level = 0;
  let bgColor = "";

  switch (true) {
    case learnedCount < 2:
      level = 0;
      emoji = "🌱";
      message = "Starte jetzt und werde Gebärden-Meister!";
      bgColor = "linear-gradient(135deg,#e0f7fa,#b2ebf2)";
      break;

    case learnedCount < 10:
      level = 1;
      emoji = "👏";
      message = `Toller Anfang! Es warten noch weitere Level Aufstiege auf Dich!`;
      bgColor = "linear-gradient(135deg,#bbdefb,#90caf9)";
      break;

    case learnedCount < 50:
      level = 2;
      emoji = "💪";
      message = `Gebärdensprache ist eine Superpower - z.B. kann man damit unter Wasser kommunizieren!`;
      bgColor = "linear-gradient(135deg,#ffecb3,#ffe082)";
      break;

    case learnedCount < 100:
      level = 3;
      emoji = "🚀";
      message = `Wow! Dein Fortschritt geht ab wie eine Rakete!`;
      bgColor = "linear-gradient(135deg,#c8e6c9,#81c784)";
      break;

    case learnedCount < 200:
      level = 4;
      emoji = "🦜";
      message = `Dein Wortschatz wird immer bunter!`;
      bgColor = "linear-gradient(135deg,#fff59d,#fff176)";
      break;

    case learnedCount < 300:
      level = 5;
      emoji = "🦚";
      message = `Stark! Du kannst sooo stolz auf dich sein!`;
      bgColor = "linear-gradient(135deg,#d1c4e9,#b39ddb)";
      break;

    case learnedCount < 400:
      level = 6;
      emoji = "🦖";
      message = `Grrr! Du machst jetzt riesige Schritte!`;
      bgColor = "linear-gradient(135deg,#ffccbc,#ffab91)";
      break;

    case learnedCount < 500:
      level = 7;
      emoji = "🦄";
      message = `Mystisch! Du zähmst das Einhorn`;
      bgColor = "linear-gradient(135deg,#c9f5d7,#98ccca)";
      break;

    case learnedCount < 600:
      level = 8;
      emoji = "🐦‍🔥";
      message = `Meisterhaft! Jetzt bist du ein wahrer Gebärden Phönix!`;
      bgColor = "linear-gradient(135deg,#fdd55c,#bbdefb)";
      break;

    case learnedCount < 700:
      level = 9;
      emoji = "🧠";
      message = `Dein Gehirn läuft jetzt im Gebärden-Modus!`;
      bgColor = "linear-gradient(135deg,#e1bee7,#ce93d8)";
      break;

    case learnedCount < 800:
      level = 10;
      emoji = "🕶️";
      message = `Coolness-Level erreicht. Du gebärdest schon fast im Schlaf.`;
      bgColor = "linear-gradient(135deg,#b3e5fc,#81d4fa)";
      break;

    case learnedCount < 900:
      level = 11;
      emoji = "⚡";
      message = `Blitzschnell erkannt - du reagierst wie ein Profi!`;
      bgColor = "linear-gradient(135deg,#fff9c4,#fff59d)";
      break;

    case learnedCount < 1000:
      level = 12;
      emoji = "🧙‍♂️";
      message = `Magisch! Deine Hände sprechen fließend.`;
      bgColor = "linear-gradient(135deg,#d1c4e9,#b39ddb)";
      break;

    case learnedCount < 1200:
      level = 13;
      emoji = "🌍";
      message = `Du kannst dich jetzt mit der Welt verbinden - ohne Worte.`;
      bgColor = "linear-gradient(135deg,#c8e6c9,#81c784)";
      break;

    case learnedCount < 1400:
      level = 14;
      emoji = "🥁";
      message = `Unaufhaltsam! Dein Wissen ist jetzt auf einem neuen Level.`;
      bgColor = "linear-gradient(135deg,#ffccbc,#ffab91)";
      break;

    case learnedCount < 1600:
      level = 15;
      emoji = "👑";
      message = `Königlich! Du beherrschst die Gebärdensprache wie ein Champion.`;
      bgColor = "linear-gradient(135deg,#ffe082,#ffd54f)";
      break;

    case learnedCount < 1800:
      level = 16;
      emoji = "🌀";
      message = `Du bist im Flow-Zustand - alles geht automatisch.`;
      bgColor = "linear-gradient(135deg,#b2ebf2,#80deea)";
      break;

    case learnedCount < 2000:
      level = 17;
      emoji = "🌌";
      message = `Galaktisch! Dein Wissen geht weit über das Normale hinaus.`;
      bgColor = "linear-gradient(135deg,#cfd8dc,#90a4ae)";
      break;

    default:
      level = 18;
      emoji = "🧬";
      message = `Du bist eins mit der Gebärdensprache geworden. Next Level: Legende.`;
      bgColor = "linear-gradient(135deg,#f8bbd0,#f48fb1)";
      break;
  }

  container.style.background = bgColor;
  emojiEl.textContent = emoji;
  textEl.textContent = message;

  // animation at level ups
  if (lastLevel !== level) {
    // emoji wobble
    emojiEl.classList.remove("animate");
    void emojiEl.offsetWidth; // reset
    emojiEl.classList.add("animate");

    // 🔥 Container Glow
    container.classList.remove("level-up");
    void container.offsetWidth;
    container.classList.add("level-up");

    lastLevel = level;
  }
}

// === Fortschritt zurücksetzen ===
function resetProgress() {
  // if (confirm("Willst du deinen Fortschritt wirklich zurücksetzen?")) {
  //   // enter here if promt before reset
  // }

  localStorage.removeItem("learnedWords");
  localStorage.removeItem("lastWord"); // 🔥 wichtig

  learned = [];
  lastWord = null;

  startApp();
}

// === Anleitung Modal ===
const modal = document.getElementById("instructions-modal");
const btn = document.getElementById("show-instructions");
const span = document.querySelector(".close");

btn.onclick = (e) => {
  e.preventDefault();
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
};

span.onclick = () => {
  modal.style.display = "none";
  document.body.style.overflow = "auto";
};

window.onclick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
};

btn.addEventListener("touchstart", (e) => {
  e.preventDefault();
  modal.style.display = "block";
});

// === Service Worker ===
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then(() => console.log("Service Worker registriert."))
    .catch(console.error);
}

// Favoriten Logik
document.getElementById("favorite-btn").addEventListener("click", toggleFavorite);

function toggleFavorite() {
  const currentWord = pool[currentIndex];

  if (favorites.includes(currentWord)) {
    favorites = favorites.filter((w) => w !== currentWord);
  } else {
    favorites.push(currentWord);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
  updateFavoriteUI();
}

function toggleFavorite() {
  const currentWord = pool[currentIndex];

  if (favorites.includes(currentWord)) {
    favorites = favorites.filter((w) => w !== currentWord);
  } else {
    favorites.push(currentWord);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
  updateFavoriteUI();
}

function updateFavoriteUI() {
  const btn = document.getElementById("favorite-btn");
  const currentWord = pool[currentIndex];

  if (!btn || !currentWord) return;

  if (favorites.includes(currentWord)) {
    btn.classList.add("active");
    btn.textContent = "❤️";
  } else {
    btn.classList.remove("active");
    btn.textContent = "🤍";
  }
}

function corina() {
  const keys = ["selectedCourses", "learnedWords", "nextWordIndex", "lastWord", "totalLearned"];

  keys.forEach((key) => localStorage.removeItem(key));

  resetProgress();
  startApp();

  console.log("✅ App LocalStorage wurde zurückgesetzt:", keys);
}
