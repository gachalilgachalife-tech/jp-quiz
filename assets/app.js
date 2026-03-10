// assets/app.js

const STORAGE_KEY = "jpQuizState";

// ==============================
// ÉTAT PAR DÉFAUT
// ==============================
export function defaultState() {
  return {
    ui: {
      theme: "dark"
    },

    last: {
      normalScore: null,
      infiniteQuestionsFor100: null
    },

    progression: {
      currentRank: "E",
      unlockedRank: "E",
      levelXp: 0,
      level: 1,
      bestStreak: 0
    },

    stats: {
      byMode: {
        hira_to_romaji: { asked: 0, correct: 0, wrong: 0 },
        romaji_to_hira: { asked: 0, correct: 0, wrong: 0 },
        kata_to_romaji: { asked: 0, correct: 0, wrong: 0 },
        romaji_to_kata: { asked: 0, correct: 0, wrong: 0 }
      }
    }
  };
}

// ==============================
// CHARGEMENT / SAUVEGARDE
// ==============================
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    const parsed = JSON.parse(raw);
    const base = defaultState();

    return {
      ...base,
      ...parsed,
      ui: {
        ...base.ui,
        ...(parsed.ui || {})
      },
      last: {
        ...base.last,
        ...(parsed.last || {})
      },
      progression: {
        ...base.progression,
        ...(parsed.progression || {})
      },
      stats: {
        ...base.stats,
        ...(parsed.stats || {})
      }
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ==============================
// THÈME / PLEIN ÉCRAN
// ==============================
export function applyTheme(theme) {
  const safeTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = safeTheme;
}

export function requestFullscreenToggle() {
  const el = document.documentElement;

  if (!document.fullscreenElement) {
    el.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

// ==============================
// FEEDBACK UI
// ==============================
export function setFeedback(el, cls, text) {
  if (!el) return;
  el.classList.remove("good", "bad");
  if (cls) el.classList.add(cls);
  el.textContent = text || "";
}

// ==============================
// RANDOM / QCM
// ==============================
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickRandomEntry(obj) {
  const keys = Object.keys(obj);
  const key = keys[Math.floor(Math.random() * keys.length)];
  return [key, obj[key]];
}

export function buildQcmChoices(allChoices, correctChoice, count = 5) {
  const pool = allChoices.filter(choice => choice !== correctChoice);
  shuffle(pool);

  const picked = pool.slice(0, Math.max(0, count - 1));
  const out = [...picked, correctChoice];

  return shuffle(out);
}

// ==============================
// MODES KANA
// ==============================
const KANA_MODES = [
  "hira_to_romaji",
  "romaji_to_hira",
  "kata_to_romaji",
  "romaji_to_kata"
];

export function chooseModePro(session) {
  const last = session.lastMode || null;

  let pool = KANA_MODES.filter(mode => mode !== last);

  if (last) {
    const lastWasInput = last.endsWith("_to_romaji");
    const preferredWantInput = !lastWasInput;

    const preferred = pool.filter(mode => mode.endsWith("_to_romaji") === preferredWantInput);
    if (preferred.length > 0) {
      pool = preferred;
    }
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  session.lastMode = chosen;
  return chosen;
}

// ==============================
// RANGS
// ==============================
export const RANK_ORDER = ["E", "D", "C", "B", "A", "S", "覚"];

export const RANKS = RANK_ORDER;

export const RANK_XP_CAP = {
  E: 300,
  D: 500,
  C: 800,
  B: 1200,
  A: 1800,
  S: 2600,
  覚: 0
};

export function isRankUnlocked(unlockedRank, targetRank) {
  const u = RANK_ORDER.indexOf(unlockedRank || "E");
  const t = RANK_ORDER.indexOf(targetRank);
  if (t === -1) return false;
  return t <= (u === -1 ? 0 : u);
}

export function getNextRank(rank) {
  const i = RANK_ORDER.indexOf(rank);
  if (i < 0 || i >= RANK_ORDER.length - 1) return null;
  return RANK_ORDER[i + 1];
}

// Ancienne logique de déblocage simple (utile pour compat)
export function unlockNextRank(appState, currentRank) {
  const next = getNextRank(currentRank);
  if (!next) return appState;

  const state = appState || defaultState();
  state.progression = state.progression || defaultState().progression;

  const currentlyUnlocked = state.progression.unlockedRank || "E";
  if (RANK_ORDER.indexOf(next) > RANK_ORDER.indexOf(currentlyUnlocked)) {
    state.progression.unlockedRank = next;
  }

  return state;
}

// ==============================
// NIVEAUX / XP
// ==============================
export function getLevelFromXP(rank, xp) {
  const cap = RANK_XP_CAP[rank];
  if (!cap || cap <= 0) return 5;

  const ratio = xp / cap;

  if (ratio >= 0.8) return 5;
  if (ratio >= 0.6) return 4;
  if (ratio >= 0.4) return 3;
  if (ratio >= 0.2) return 2;
  return 1;
}

export function getStreakBonus(streak) {
  if (streak >= 10) return 30;
  if (streak >= 5) return 15;
  if (streak >= 3) return 5;
  return 0;
}

export function getSessionXpGain(session) {
  if (session.mode === "exam") return 0;

  const basePerCorrect = session.pack === "kanji" ? 5 : 2;
  const baseXp = (session.good || 0) * basePerCorrect;
  const streakBonus = getStreakBonus(session.bestStreakThisSession || 0);

  return baseXp + streakBonus;
}

export function applyXpToProgression(progression, xpGain) {
  const cap = RANK_XP_CAP[progression.currentRank];

  if (!cap || cap <= 0) {
    progression.level = 5;
    return progression;
  }

  progression.rankXp = Math.min((progression.rankXp || 0) + xpGain, cap);
  progression.level = getLevelFromXP(progression.currentRank, progression.rankXp);

  return progression;
}

export function canTakeCurrentRankExam(progression, kanjiList) {
  if (!progression) return false;
  const currentRank = progression.currentRank || "E";
  const currentLevel = Number(progression.level) || 1;
  const currentXP = Number(progression.levelXP) || 0;

  if (currentLevel < 5) return false;

  const capLevel5 ) getLevelXPCap(currentRank, 5, kanjiList)

  return currentXP >= capLevel5;
}

export function rankUp(progression) {
  const next = getNextRank(progression.currentRank);
  if (!next) return progression;

  progression.currentRank = next;
  progression.unlockedRank = next;
  progression.rankXp = 0;
  progression.level = 1;

  return progression;
}

export function getGradeValueFromRank(rank) {
  const map = {
    E: 1,
    D: 2,
    C: 3,
    B: 4,
    A: 5,
    S: 6,
    覚: 7
  };

  return map[rank] ?? 1;
}

export function countKanjiUpToRank(rank, kanjiList) {
  const maxGrade = getGradeValueFromRank(rank);

  if (!Array.isArray(kanjiList)) return 0;

  if (maxGrade === 7) {
    return kanjiList.length;
  }

  return kanjiList.filter(k => Number(k.g) <= maxGrade).length;
}

export function getRankMultiplier(rank, kanjiList) {
  const totalKanji = countKanjiUpToRank(rank, kanjiList);
  const raw = totalKanji * 0.02;
  return Math.max(1, Math.round(raw));
}

export function getLevelXpCap(rank, level, kanjiList) {
  const safeLevel = Math.min(5, Math.max(1, Number(level) || 1));
  const multiplier = getRankMultiplier(rank, kanjiList);

  return safeLevel * 100 * multiplier;
}

export function getXpForKanjiGrade(grade) {
  const xpTable = {
    1: 5,
    2: 6,
    3: 7,
    4: 8,
    5: 9,
    6: 10,
    7: 12
  };

  return xpTable[Number(grade)] ?? 5;
}
export function getXpForKanjiGrade(grade) {
  const xpTable = {
    1: 5,
    2: 6,
    3: 7,
    4: 8,
    5: 9,
    6: 10,
    7: 12
  };

  return xpTable[Number(grade)] ?? 5;
}
