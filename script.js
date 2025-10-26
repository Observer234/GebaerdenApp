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
let learned = [];

// === Streak-System ===

// beim Laden prüfen
updateStreakDisplay();

function updateStreakDisplay() {
  const today = new Date().toDateString();
  const last = localStorage.getItem("lastActiveDate");
  const streak = parseInt(localStorage.getItem("streakCount") || 0);
  const learnedToday = parseInt(localStorage.getItem("todayLearnedCount") || 0);

  let text = `🔥 Serie: ${streak} Tag${streak === 1 ? "" : "e"}`;
  if (learnedToday < 10) {
    text += ` – (${learnedToday}/10 Wörter heute)`;
  } else {
    text += ` ✅`;
  }

  document.getElementById("streak").textContent = text;

  // Reset täglicher Zähler, wenn neuer Tag
  if (last && last !== today) {
    localStorage.setItem("todayLearnedCount", "0");
  }
}

function incrementLearnedToday() {
  const today = new Date().toDateString();
  const last = localStorage.getItem("lastActiveDate");
  let streak = parseInt(localStorage.getItem("streakCount") || 0);
  let learnedToday = parseInt(localStorage.getItem("todayLearnedCount") || 0);

  learnedToday++;
  localStorage.setItem("todayLearnedCount", learnedToday.toString());

  // Wenn 10 Wörter gelernt: Tag gilt als erfüllt
  if (learnedToday === 10) {
    if (last && last !== today) {
      // Wenn gestern aktiv -> Streak fortsetzen
      const diffDays = (new Date(today) - new Date(last)) / 86400000;
      if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
    } else if (!last || last === today) {
      // erster Tag oder am selben Tag neu
      if (streak === 0) streak = 1;
    }

    localStorage.setItem("streakCount", streak);
    localStorage.setItem("lastActiveDate", today);

    // kleine visuelle Belohnung
    const el = document.getElementById("streak");
    el.textContent = `🔥 Serie: ${streak} Tage – Ziel erreicht 🎉`;
    el.style.color = "#ff7b00";
    el.style.transition = "transform 0.4s ease";
    el.style.transform = "scale(1.2)";
    setTimeout(() => {
      el.style.transform = "scale(1)";
      el.style.color = "#f76d00";
    }, 800);
  }

  updateStreakDisplay();
} // Streak End

function startApp() {
  // ======= Vokabeln laden aus html =======
  // const rawText = document.getElementById("vokabeln").textContent.trim();

  // let allWords = rawText
  //   .split("\n")
  //   .map((w) => w.trim())
  //   .filter(Boolean);

  // ======= LocalStorage Fortschritt =======
  learned = JSON.parse(localStorage.getItem("learnedWords") || "[]");
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
    incrementLearnedToday();
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
  if (confirm("⚠️ Willst du deinen Fortschritt wirklich zurücksetzen? ⚠️")) {
    localStorage.removeItem("learnedWords");
    learned = [];
    pool = allWords.filter((w) => !learned.includes(w));

    // Neu initialisieren:
    // const rawText = document.getElementById("vokabeln").textContent.trim();

    updateProgress();
    showWord();
  }
}

// Modal-Logik
const modal = document.getElementById("instructions-modal");
const btn = document.getElementById("show-instructions");
const span = document.querySelector(".close");

btn.onclick = function (e) {
  e.preventDefault();
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
};

span.onclick = function () {
  modal.style.display = "none";
  document.body.style.overflow = "auto";
};

window.onclick = function (event) {
  if (event.target === modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
};

btn.addEventListener("touchstart", function (e) {
  e.preventDefault();
  modal.style.display = "block";
});

// ======= Optional: Service Worker =======
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then(() => console.log("Service Worker registriert."))
    .catch(console.error);
}
