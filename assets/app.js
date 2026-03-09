// assets/app.js

// -----------------------------
// STATE
// -----------------------------
const STORAGE_KEY = "jpQuizState";

export function defaultState() {
  return {
    ui: { theme: "dark" },
    last: { normalScore: null, infiniteQuestionsFor100: null },
    progression: {
  currentRank: "E",
  unlockedRank: "E",
  rankXp: 0,
  level: 1,
  bestStreak: 0
},
    // stats optionnelles (pas obligatoire pour fonctionner)
    stats: {
      byMode: {
        hira_to_romaji: { asked: 0, correct: 0, wrong: 0 },
        romaji_to_hira: { asked: 0, correct: 0, wrong: 0 },
        kata_to_romaji: { asked: 0, correct: 0, wrong: 0 },
        romaji_to_kata: { asked: 0, correct: 0, wrong: 0 },
      },
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);

    // petite fusion safe
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      ui: { ...base.ui, ...(parsed.ui || {}) },
      last: { ...base.last, ...(parsed.last || {}) },
      progression: { ...base.progression, ...(parsed.progression || {}) },
      stats: { ...base.stats, ...(parsed.stats || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// -----------------------------
// THEME + FULLSCREEN
// -----------------------------
export function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
}

export function requestFullscreenToggle() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    el.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

// -----------------------------
// UI helpers
// -----------------------------
export function setFeedback(el, cls, text) {
  if (!el) return;
  el.classList.remove("good", "bad");
  if (cls) el.classList.add(cls);
  el.textContent = text || "";
}

// -----------------------------
// Kana mode picker (PRO anti-répétition)
// -----------------------------
const MODES = ["hira_to_romaji", "romaji_to_hira", "kata_to_romaji", "romaji_to_kata"];

export function chooseModePro(session) {
  // session.lastMode : dernier mode joué
  // règle: jamais 2 fois le même d'affilée + alternance plus "naturelle"
  const last = session.lastMode;

  let pool = MODES.filter((m) => m !== last);
  // petite préférence : alterner input / qcm
  // input: *_to_romaji ; qcm: romaji_to_*
  if (last) {
    const lastIsInput = last.endsWith("_to_romaji");
    const wantInput = !lastIsInput;
    const preferred = pool.filter((m) => m.endsWith("_to_romaji") === wantInput);
    if (preferred.length) pool = preferred;
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  session.lastMode = pick;
  return pick;
}

// -----------------------------
// Random helpers
// -----------------------------
export function pickRandomEntry(obj) {
  const keys = Object.keys(obj);
  const k = keys[Math.floor(Math.random() * keys.length)];
  return [k, obj[k]];
}

export function buildQcmChoices(allChars, correctChar, count = 5) {
  const pool = allChars.filter((c) => c !== correctChar);
  const picks = [];

  while (picks.length < count - 1 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool[idx]);
    pool.splice(idx, 1);
  }

  picks.push(correctChar);
  shuffle(picks);
  return picks;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -----------------------------
// RANKS (Yo-kai-ish letters)
// -----------------------------
export const RANKS = ["E", "D", "C", "B", "A", "S", "覚"];

export function isRankUnlocked(unlockedRank, rank) {
  const u = RANKS.indexOf(unlockedRank || "E");
  const r = RANKS.indexOf(rank);
  if (r === -1) return false;
  return r <= (u === -1 ? 0 : u);
}

export function unlockNextRank(appState, currentRank) {
  const cur = RANKS.indexOf(currentRank);
  if (cur === -1) return appState;

  const next = Math.min(cur + 1, RANKS.length - 1);
  const nextRank = RANKS[next];

  const s = appState || defaultState();
  s.progression = s.progression || { unlockedRank: "E", xp: 0, bestStreak: 0 };

  const unlocked = s.progression.unlockedRank || "E";
  if (RANKS.indexOf(nextRank) > RANKS.indexOf(unlocked)) {
    s.progression.unlockedRank = nextRank;
  }
  return s;
}

