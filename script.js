// === Google Sheet ID ===
const sheetId = "1u4BzQWOe-sYXdl1-gr9IMC2LK1lL-2NSrzRCf2CGwKo";

const BATCH_SIZE = 20;

const courses = [
  {name:"L1", start:0, end:220},
  {name:"L2", start:220, end:525},
  {name:"L3", start:525, end:709},
  {name:"L4", start:709, end:971},
  // {name:"L5", start:971, end:1009},
  // {name:"L6", start:1009, end:null}
  {name:"L5", start:971, end:null}
];

let selectedCourses =
JSON.parse(localStorage.getItem("selectedCourses") || "[0,1,2,3,4,5]");

function renderCourseFilters() {

  const container = document.getElementById("course-filter");
  container.innerHTML = "";

  courses.forEach((course, i) => {

    const start = course.start;
    const end = course.end ?? allWords.length;

    const total = end - start;

    const learnedCount = allWords
      .slice(start, end)
      .filter(w => learned.includes(w)).length;

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

  selectedCourses.forEach(c => {

    const start = courses[c].start;
    const end = courses[c].end ?? allWords.length;

    words = words.concat(allWords.slice(start, end));

  });

  return words;
}

function toggleCourse(index) {

  if(selectedCourses.includes(index)) {

    selectedCourses = selectedCourses.filter(c => c !== index);

  } else {

    selectedCourses.push(index);

  }

  localStorage.setItem(
    "selectedCourses",
    JSON.stringify(selectedCourses)
  );

  renderCourseFilters();
  startApp();
}

// === Google Sheet laden ===
async function loadWordsFromSheet(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));

  const allWords = json.table.rows
    .map((r) => r.c[0]?.v)
    .filter(Boolean);

  return allWords;
}

let allWords = [];
let pool = [];
let reviewPool = [];
let currentIndex = 0;
let learned = [];
let nextWordIndex = parseInt(localStorage.getItem("nextWordIndex") || "0");
let lastLevel = null;
let allWordsActive = [];


// === Start der App ===
loadWordsFromSheet(sheetId).then((words) => {
  allWords = words;
  console.log("Vokabeln geladen:", allWords);
  startApp();
});

function startApp() {

  // Gelernte Wörter laden
  learned = JSON.parse(localStorage.getItem("learnedWords") || "[]");

  // aktive Wörter anhand Kursfilter bestimmen
  const activeWords = getActiveWords();

  // nur noch nicht gelernte Wörter
  const remainingWords = activeWords.filter(
    (w) => !learned.includes(w)
  );

  // Reset der Batch-Logik
  // nextWordIndex = 0;
  reviewPool = [];
  currentIndex = 0;

  // Quelle für Batch-System setzen
  allWordsActive = remainingWords;

  // erstes Paket laden
  loadNextBatch();

  // UI aktualisieren
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

  pool = allWordsActive.slice(
    nextWordIndex,
    nextWordIndex + BATCH_SIZE
  );

  nextWordIndex += BATCH_SIZE;

  // Batch-Fortschritt speichern
  localStorage.setItem(
    "nextWordIndex",
    nextWordIndex
  );

  currentIndex = 0;
}

// === Wort anzeigen ===
function showWord() {

  const wordElement = document.getElementById("card");

  if (pool.length === 0) {

    if (reviewPool.length > 0) {

      pool = reviewPool;
      reviewPool = [];
      currentIndex = 0;

    } else {

      loadNextBatch();

      if (pool.length === 0) {
        wordElement.textContent = "Alle Vokabeln gelernt 🎉";
        return;
      }
    }
  }

  wordElement.textContent = pool[currentIndex];
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

    pool.splice(currentIndex, 1);

  } 
  else if (action === "?") {

    showSolution();

    reviewPool.push(currentWord);
    pool.splice(currentIndex, 1);

  } 
  else if (action === "skip") {

    reviewPool.push(currentWord);
    pool.splice(currentIndex, 1);
  }

  if (currentIndex >= pool.length) {
    currentIndex = 0;
  }

  showWord();
  updateProgress();

  // ⭐ Kurszähler sofort aktualisieren
  renderCourseFilters();
}

// === Fortschritt + Emoji-Level ===
function updateProgress(testLevelLearned) {

  const total = allWords.length + learned.length;
  const learnedCount = learned.length;

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
      message = "Starte jetzt und erweitere deinen Wortschatz!";
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
      emoji = "🔥";
      message = `Super! Dein Wortschatz wächst.`;
      bgColor = "linear-gradient(135deg,#ffecb3,#ffe082)";
      break;

    case learnedCount < 100:
      level = 3;
      emoji = "🚀";
      message = `Wow! Du wirst richtig sicher!`;
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
      message = `Stark! Du kannst stolz auf dich sein!`;
      bgColor = "linear-gradient(135deg,#d1c4e9,#b39ddb)";
      break;

    case learnedCount < 400:
      level = 6;
      emoji = "🦖";
      message = `Grrr! Du machst riesige Schritte!`;
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

    learned = [];

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