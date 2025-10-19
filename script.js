sheetId = "1u4BzQWOe-sYXdl1-gr9IMC2LK1lL-2NSrzRCf2CGwKo";

async function loadWordsFromSheet(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

  const res = await fetch(url);
  const text = await res.text();

  // Google liefert JSONP-artigen Text, JSON beginnt ab Zeichen 47:
  const json = JSON.parse(text.substr(47).slice(0, -2));

  // Nur die erste Spalte (c[0]) jeder Zeile extrahieren:
  const allWords = json.table.rows
    .map((r) => r.c[0]?.v) // c[0] = erste Spalte
    .filter(Boolean); // leere Zeilen entfernen

  return allWords;
}

let allWords = [];

loadWordsFromSheet(sheetId).then((words) => {
  allWords = words;
  console.log("Array ist fertig:", allWords);
  startApp();
});

let pool = [];
let currentIndex = 0;

function startApp() {
  // ======= Vokabeln laden aus html =======
  // const rawText = document.getElementById("vokabeln").textContent.trim();

  // let allWords = rawText
  //   .split("\n")
  //   .map((w) => w.trim())
  //   .filter(Boolean);

  // ======= LocalStorage Fortschritt =======
  const learned = JSON.parse(localStorage.getItem("learnedWords") || "[]");
  pool = allWords.filter((w) => !learned.includes(w));

  pool = shuffle(pool);

  // ======= Start =======
  showWord();
}

// ======= Zufällige Reihenfolge =======
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

function updateProgress() {
  const total = allWords.length;
  const remaining = pool.length;
  document.getElementById("progress").textContent = `Noch ${remaining} von ${total} Gebärden zu lernen`;
}

function resetProgress() {
  if (confirm("Willst du deinen Fortschritt wirklich zurücksetzen?")) {
    localStorage.removeItem("learnedWords");

    // Neu initialisieren:
    // const rawText = document.getElementById("vokabeln").textContent.trim();

    updateProgress();
    showWord();
  }
}

// ======= Optional: Service Worker =======
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then(() => console.log("Service Worker registriert."))
    .catch(console.error);
}
