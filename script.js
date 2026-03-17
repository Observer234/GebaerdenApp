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

let selectedCourses = JSON.parse(localStorage.getItem("selectedCourses") || "[0,1,2,3,4,5]");

function renderCourseFilters() {
  const container = document.getElementById("course-filter");
  container.innerHTML = "";

  courses.forEach((course, i) => {
    const levelWords = allWords[course.index] || [];

    const total = levelWords.length;

    const learnedCount = levelWords.filter((w) => learned.includes(w)).length;

    const chip = document.createElement("div");

    chip.className = "course-chip";
    chip.textContent = `${course.name} (${learnedCount} / ${total})`;

    if (selectedCourses.includes(i)) {
      chip.classList.add("active");
    }

    chip.addEventListener("click", () => toggleCourse(i));

    container.appendChild(chip);
  });
}

function getActiveWords() {
  let words = [];

  selectedCourses.forEach((c) => {
    const course = courses[c];
    if (!course) return;

    const levelWords = allWords[course.index] || [];

    words = words.concat(levelWords);
  });

  return words;
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

  // 🔴 1. raus animieren
  wordElement.classList.add("card-exit");

  setTimeout(() => {

    // ===== DEINE BESTEHENDE LOGIK =====
    // 🔥 NEU: Kein Kurs ausgewählt
    if (selectedCourses.length === 0) {
      wordElement.textContent = "Wähle ein Level";
    } else {

      if (pool.length === 0) {

        if (reviewPool.length > 0) {

          pool = reviewPool;
          reviewPool = [];
          currentIndex = 0;

        } else {

          loadNextBatch();

          if (pool.length === 0) {

            if (allWordsActive.length === 0) {
              wordElement.textContent = "Alle Vokabeln gelernt 🎉";
            } else {
              wordElement.textContent = "Wähle ein Level";
            }

            wordElement.classList.remove("card-exit");
            return;
          }
        }
      }

      wordElement.textContent = pool[currentIndex];
    }

    // 🔵 2. Reset + rechts positionieren
    wordElement.classList.remove("card-exit");
    wordElement.classList.add("card-enter-start");

    // 🟢 3. rein animieren
    requestAnimationFrame(() => {
      wordElement.classList.add("card-enter");
      wordElement.classList.remove("card-enter-start");
    });

  }, 250); // muss zur CSS transition passen

  updateProgress();
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
    totalLearned++;
    localStorage.setItem("totalLearned", totalLearned);

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
      message = `Gebärdensprache ist eine Superkraft - man kann über Entfernungen, durch Glas und im Wasser kommunizieren!`;
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

    default:
      level = 8;
      emoji = "🐦‍🔥";
      message = `Meisterhaft! Jetzt bist du ein wahrer Gebärden Phönix!`;
      bgColor = "linear-gradient(135deg,#fdd55c,#bbdefb)";
      break;
  }

  container.style.background = bgColor;
  emojiEl.textContent = emoji;
  textEl.textContent = message;

  if (lastLevel !== level) {
    emojiEl.classList.add("flash");
    setTimeout(() => emojiEl.classList.remove("flash"), 800);
    lastLevel = level;
  }
}

// === Fortschritt zurücksetzen ===
function resetProgress() {
  if (confirm("⚠️ Willst du deinen Fortschritt wirklich zurücksetzen? ⚠️")) {
    localStorage.removeItem("learnedWords");
    localStorage.removeItem("lastWord"); // 🔥 wichtig

    learned = [];
    lastWord = null;

    startApp();
  }
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

function corina() {
  const keys = ["selectedCourses", "learnedWords", "nextWordIndex", "lastWord", "totalLearned"];

  keys.forEach((key) => localStorage.removeItem(key));

  resetProgress();

  console.log("✅ App LocalStorage wurde zurückgesetzt:", keys);
}
