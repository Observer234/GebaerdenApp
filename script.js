// === Google Sheet ID ===
const sheetId = "1u4BzQWOe-sYXdl1-gr9IMC2LK1lL-2NSrzRCf2CGwKo";

// === Google Sheet laden ===
async function loadWordsFromSheet(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));

  // Nur erste Spalte (c[0]) jeder Zeile extrahieren
  const allWords = json.table.rows.map((r) => r.c[0]?.v).filter(Boolean); // leere Zeilen entfernen

  return allWords;
}

let allWords = [];
let pool = [];
let currentIndex = 0;
let learned = [];
let lastLevel = null; // Für Animation bei Levelwechsel

// === Start der App ===
loadWordsFromSheet(sheetId).then((words) => {
  allWords = words;
  console.log("Vokabeln geladen:", allWords);
  startApp();
});

function startApp() {
  // Fortschritt aus localStorage laden
  learned = JSON.parse(localStorage.getItem("learnedWords") || "[]");
  pool = allWords.filter((w) => !learned.includes(w));
  pool = shuffle(pool);

  showWord();
  updateProgress();
}

// === Hilfsfunktion: Array mischen ===
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// === Wort anzeigen ===
function showWord() {
  const wordElement = document.getElementById("card");
  if (pool.length === 0) {
    wordElement.textContent = "Alle Vokabeln gelernt 🎉";
    return;
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
    pool.splice(currentIndex, 1); // Entfernt aktuelles Wort aus Pool
  } else if (action === "?") {
    showSolution();
  }

  if (pool.length === 0) {
    document.getElementById("card").textContent = "Alle Vokabeln gelernt 🎉";
  } else {
    currentIndex = (currentIndex + 1) % pool.length;
    showWord();
  }

  updateProgress();
}

// === Fortschritt + Emoji-Level ===
function updateProgress(testLevelLearned) {
  const total = allWords.length;
  const remaining = pool.length;
  let learnedCount = total - remaining;
  if (testLevelLearned) learnedCount = testLevelLearned;

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
      bgColor = "linear-gradient(135deg, #e0f7fa, #b2ebf2)";
      break;
    case learnedCount < 10:
      level = 1;
      emoji = "👏";
      message = `Toller Anfang! Du kennst schon ${learnedCount} Gebärden.`;
      bgColor = "linear-gradient(135deg, #bbdefb, #90caf9)";
      break;
    case learnedCount < 50:
      level = 2;
      emoji = "🔥";
      message = `Super! Dein Wortschatz wächst – ${learnedCount} Gebärden gelernt.`;
      bgColor = "linear-gradient(135deg, #ffecb3, #ffe082)";
      break;
    case learnedCount < 100:
      level = 3;
      emoji = "🚀";
      message = `Wow! ${learnedCount} Gebärden – du wirst richtig sicher!`;
      bgColor = "linear-gradient(135deg, #c8e6c9, #81c784)";
      break;
    case learnedCount < 200:
      level = 4;
      emoji = "🦜";
      message = `${learnedCount} Gebärden – dein Wortschatz wird immer bunter!`;
      bgColor = "linear-gradient(135deg, #fff59d, #fff176)";
      break;
    case learnedCount < 300:
      level = 5;
      emoji = "🦚";
      message = `Stark! ${learnedCount} Gebärden – du kannst stolz auf dich sein!`;
      bgColor = "linear-gradient(135deg, #d1c4e9, #b39ddb)";
      break;
    case learnedCount < 400:
      level = 6;
      emoji = "🦖";
      message = `Grrr! ${learnedCount} Gebärden – du machst riesige Schritte!`;
      bgColor = "linear-gradient(135deg, #ffccbc, #ffab91)";
      break;
    case learnedCount < 500:
      level = 7;
      emoji = "🦄";
      message = `Mystisch! Du hast ${learnedCount} Gebärden gemeistert!`;
      bgColor = "linear-gradient(135deg, #c9f5d7ff, #98cccaff)";
      break;
    default:
      level = 8;
      emoji = "🐦‍🔥";
      message = `Meisterhaft! ${learnedCount} Gebärden - du bist ein Gebärden-Pro!`;
      bgColor = "linear-gradient(135deg, #fdd55cff, #bbdefb)"; // kräftiger Goldton
      break;
  }

  // Stil aktualisieren
  container.style.background = bgColor;
  emojiEl.textContent = emoji;
  textEl.textContent = message;

  // Animation nur bei Levelwechsel
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
    pool = allWords.filter((w) => !learned.includes(w));
    pool = shuffle(pool);
    updateProgress();
    showWord();
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

// === Optional: Service Worker ===
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then(() => console.log("Service Worker registriert."))
    .catch(console.error);
}
