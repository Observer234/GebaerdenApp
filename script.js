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
// updateStreakDisplay();

function updateStreakDisplay() {
  const today = new Date().toDateString();
  const last = localStorage.getItem("lastActiveDate");
  let streak = parseInt(localStorage.getItem("streakCount") || "0");
  const learnedTodayDate = localStorage.getItem("todayLearnedDate");

  // Falls mehrere Tage vergangen sind → Streak auf 0
  if (last) {
    const diffDays = Math.floor((new Date(today) - new Date(last)) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      streak = 0;
      localStorage.setItem("streakCount", "0");
    }
  }

  // Reset des Tageszählers nur, wenn der gespeicherte Zähler NICHT vom heutigen Datum ist
  if (!learnedTodayDate || learnedTodayDate !== today) {
    localStorage.setItem("todayLearnedCount", "0");
  }

  const currentLearnedToday = parseInt(localStorage.getItem("todayLearnedCount") || "0");

  let text = `🔥 Serie: ${streak} Tag${streak === 1 ? "" : "e"}`;
  if (currentLearnedToday < 10) {
    text += ` – (${currentLearnedToday}/10 Wörter heute)`;
  } else {
    text += ` ✅`;
  }

  const el = document.getElementById("streak");
  if (el) el.textContent = text;
}

function incrementLearnedToday() {
  const today = new Date().toDateString();
  const last = localStorage.getItem("lastActiveDate");
  let streak = parseInt(localStorage.getItem("streakCount") || 0);
  let learnedToday = parseInt(localStorage.getItem("todayLearnedCount") || "0");

  learnedToday++;
  localStorage.setItem("todayLearnedCount", learnedToday.toString());
  // wichtig: merken, an welchem Tag dieser Zähler gilt
  localStorage.setItem("todayLearnedDate", today);

  // Wenn 10 Wörter gelernt: Tag gilt als erfüllt
  if (learnedToday === 10) {
    // ... (bestehende Streak-Logik unverändert)
    if (last && last !== today) {
      const diffDays = Math.round((new Date(today) - new Date(last)) / 86400000);
      if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
    } else if (!last || last === today) {
      if (streak === 0) streak = 1;
    }

    localStorage.setItem("streakCount", streak.toString());
    localStorage.setItem("lastActiveDate", today);

    // kleine visuelle Rückmeldung (optional)
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

  updateStreakDisplay();

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

let lastLevel = null; // Globale Variable, um Levelwechsel zu erkennen

function updateProgress(testLevelLearned) {
  const total = allWords.length;
  const remaining = pool.length;
  let learned = total - remaining;

  if (testLevelLearned) {
    learned = testLevelLearned;
  }

  const emojiEl = document.getElementById("progress-emoji");
  const textEl = document.getElementById("progress-text");
  const container = document.getElementById("progress-container");

  if (!emojiEl || !textEl || !container) return;

  let message = "";
  let emoji = "";
  let level = 0;
  let bgColor = "";

  switch (true) {
    case learned < 2:
      level = 0;
      emoji = "🌱";
      message = "Starte jetzt und erweitere deinen Wortschatz!";
      bgColor = "linear-gradient(135deg, #e0f7fa, #b2ebf2)";
      break;
    case learned < 10:
      level = 1;
      emoji = "👏";
      message = `Toller Anfang! Du kennst schon ${learned} Gebärden.`;
      bgColor = "linear-gradient(135deg, #bbdefb, #90caf9)";
      break;
    case learned < 50:
      level = 2;
      emoji = "🔥";
      message = `Super! Dein Wortschatz wächst - ${learned} Gebärden schon gelernt.`;
      bgColor = "linear-gradient(135deg, #ffecb3, #ffe082)";
      break;
    case learned < 100:
      level = 3;
      emoji = "🚀";
      message = `Wow! ${learned} Gebärden - du wirst richtig sicher!`;
      bgColor = "linear-gradient(135deg, #c8e6c9, #81c784)";
      break;
    case learned < 200:
      level = 4;
      emoji = "🦜";
      message = `${learned} Gebärden - dein Wortschatz wird immer bunter!`;
      bgColor = "linear-gradient(135deg, #fff59d, #fff176)";
      break;
    case learned < 300:
      level = 5;
      emoji = "🦚";
      message = `Stark! ${learned} Gebärden - du kannst stolz auf dich sein!`;
      bgColor = "linear-gradient(135deg, #fff59d, #fff176)";
      break;
    case learned < 400:
      level = 6;
      emoji = "🦖";
      message = `Grrrr ${learned} Gebärden - du machst riesige Schritte!`;
      bgColor = "linear-gradient(135deg, #fff59d, #fff176)";
      break;
    case learned < 500:
      level = 7;
      emoji = "🦄";
      message = `Mystisch! Du hast ${learned} Gebärden gemeistert!`;
      bgColor = "linear-gradient(135deg, #c9f5d7ff, #98cccaff)";
      break;
    default:
      level = 8;
      emoji = "🐦‍🔥"; // 🥇🤩💯🕺💃🤟🐦‍🔥🦚🤺🌟💫
      message = `Meisterhaft! ${learned} Gebärden - du bist ein Gebärden-Pro!`;
      bgColor = "linear-gradient(135deg, #fdd55cff, #bbdefb)"; // kräftiger Goldton
      break;
  }

  // Setze den Hintergrund
  container.style.background = bgColor;

  // Emoji & Text aktualisieren
  emojiEl.textContent = emoji;
  textEl.textContent = message;

  // Animation nur bei Levelwechsel
  if (lastLevel !== level) {
    emojiEl.classList.add("animate");
    setTimeout(() => emojiEl.classList.remove("animate"), 400);
    lastLevel = level;
  }
}

function resetProgress() {
  if (confirm("⚠️ Willst du deinen Fortschritt wirklich zurücksetzen? ⚠️")) {
    localStorage.removeItem("learnedWords");
    learned = [];
    pool = allWords.filter((w) => !learned.includes(w));
    pool = shuffle(pool);

    // Neu initialisieren mit in-app Vokabeln:
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
