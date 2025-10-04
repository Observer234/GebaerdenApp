let vocab = [];
let remaining = [];
let current = null;

// Vokabeln aus <script type="text/plain"> laden
function loadVocab() {
  const raw = document.getElementById("vokabeln").textContent.trim();
  vocab = raw.split("\n").map(w => w.trim()).filter(Boolean);
  remaining = shuffle([...vocab]);
}

// Zufällig mischen (Fisher-Yates)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function nextCard() {
  if (remaining.length === 0) {
    document.getElementById("card").textContent = "🎉 Alle Gebärden gelernt!";
    return;
  }
  current = remaining.pop();
  document.getElementById("card").textContent = current;
}

function showSolution() {
  if (!current) return;
  const url = "https://gebaerden-archiv.at/search?q=" + encodeURIComponent(current) + "&tag=";
  window.open(url, "_blank");
}

function mark(result) {
  if (!current) return;
  switch (result) {
    case "x":
      // bleibt im Pool → am Anfang wieder einfügen
      remaining.unshift(current);
      break;
    case "?":
      // zeigt zuerst Lösung, bleibt aber im Pool
      showSolution();
      remaining.unshift(current);
      break;
    case "ok":
      // wird entfernt → nichts tun, da schon gepoppt
      break;
  }
  nextCard();
}

// Start
loadVocab();
nextCard();
