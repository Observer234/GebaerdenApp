const url = "https://docs.google.com/spreadsheets/d/1u4BzQWOe-sYXdl1-gr9IMC2LK1lL-2NSrzRCf2CGwKo/gviz/tq?tqx=out:json";

fetch(url)
  .then((res) => res.text())
  .then((text) => {
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows.map((r) => r.c.map((c) => c?.v ?? null));
    console.log(rows);
  });

// ======= Vokabeln laden =======
const rawText = document.getElementById("vokabeln").textContent.trim();

let allWords = rawText
  .split("\n")
  .map((w) => w.trim())
  .filter(Boolean);

// ======= LocalStorage Fortschritt =======
const learned = JSON.parse(localStorage.getItem("learnedWords") || "[]");
let pool = allWords.filter((w) => !learned.includes(w));

// ======= Zufällige Reihenfolge =======
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

pool = shuffle(pool);
let currentIndex = 0;

// ======= Wort anzeigen =======
function showWord() {
  const wordElement = document.getElementById("card");
  if (pool.length === 0) {
    wordElement.textContent = "Alle Vokabeln gelernt 🎉";
    return;
  }
  wordElement.textContent = pool[currentIndex];
  updateProgress();
}

// ======= Lösung anzeigen =======
function showSolution() {
  const baseURL = "https://gebaerden-archiv.at/search?q=";
  const currentWord = pool[currentIndex];
  const formattedWord = currentWord.trim().replace(/\s+/g, "+"); // ersetzt Leerzeichen durch +
  window.open(baseURL + formattedWord + "&tag=", "_blank");
}

// ======= Klick-Logik =======
function mark(action) {
  const currentWord = pool[currentIndex];
  if (action === "ok") {
    learned.push(currentWord);
    localStorage.setItem("learnedWords", JSON.stringify(learned));
    pool.splice(currentIndex, 1); // Wort entfernen
  } else if (action === "?") {
    showSolution();
  } // bei x passiert nichts

  if (pool.length === 0) {
    document.getElementById("card").textContent = "Alle Vokabeln gelernt 🎉";
  } else {
    currentIndex = (currentIndex + 1) % pool.length;
    showWord();
  }
  updateProgress();
}

// ======= Start =======
showWord();

// ======= Optional: Service Worker =======
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then(() => console.log("Service Worker registriert."))
    .catch(console.error);
}

function updateProgress() {
  const total = allWords.length;
  const remaining = pool.length;
  document.getElementById("progress").textContent = `Noch ${remaining} von ${total} Gebärden zu lernen`;
}

function resetProgress() {
  if (confirm("Willst du deinen Fortschritt wirklich zurücksetzen?")) {
    localStorage.removeItem("learnedWords");

    // Neu initialisieren:
    const rawText = document.getElementById("vokabeln").textContent.trim();
    allWords = rawText
      .split("\n")
      .map((w) => w.trim())
      .filter(Boolean);
    pool = shuffle([...allWords]);

    updateProgress();
    showWord();
  }
}
