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
bonusProgression: {
  kanji_kana: {
    currentRank: "E",
    unlockedRank: "E",
    level: 1,
    levelXp: 0
  },
  kanji_kana: {
    currentRank: "E",
    unlockedRank: "E",
    level: 1,
    levelXp: 0
  }
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
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    return;
  }

  if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
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

    const preferred = pool.filter(
      mode => mode.endsWith("_to_romaji") === preferredWantInput
    );

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

// ==============================
// LIEN RANG -> GRADE
// ==============================
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

// ==============================
// KANJI CUMULÉS JUSQU'AU RANG
// ==============================
export function countKanjiUpToRank(rank, kanjiList) {
  const maxGrade = getGradeValueFromRank(rank);

  if (!Array.isArray(kanjiList)) return 0;

  if (maxGrade === 7) {
    return kanjiList.length;
  }

  return kanjiList.filter(k => Number(k.g) <= maxGrade).length;
}

// ==============================
// MULTIPLICATEUR DU RANG
// ==============================
export function getRankMultiplier(rank, kanjiList) {
  const totalKanji = countKanjiUpToRank(rank, kanjiList);
  const raw = totalKanji * 0.02;
  return Math.max(1, Math.round(raw));
}

// ==============================
// CAP D'XP DU NIVEAU ACTUEL
// ==============================
export function getLevelXpCap(rank, level, kanjiList) {
  const safeLevel = Math.min(5, Math.max(1, Number(level) || 1));
  const multiplier = getRankMultiplier(rank, kanjiList);

  return safeLevel * 100 * multiplier;
}

// ==============================
// XP GAGNÉE SELON LE GRADE KANJI
// ==============================
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

// ==============================
// BONUS DE STREAK
// ==============================
export function getStreakBonus(streak) {
  if (streak >= 10) return 30;
  if (streak >= 5) return 15;
  if (streak >= 3) return 5;
  return 0;
}

// Cette fonction sert au bonus de fin de session.
// L'XP "de base" est calculée dans quiz.html selon kana/kanji/grade.
export function getSessionXpGain(session) {
  if (session.mode === "exam") return 0;
  return getStreakBonus(session.bestStreakThisSession || 0);
}

// ==============================
// APPLIQUER L'XP AU NIVEAU
// ==============================
export function applyXpToLevel(progression, xpGain, kanjiList) {
  if (!progression) return progression;

  const currentRank = progression.currentRank || "E";
  let currentLevel = Number(progression.level) || 1;
  let currentXp = Number(progression.levelXp) || 0;

  if (currentLevel >= 5) {
    const cap = getLevelXpCap(currentRank, 5, kanjiList);
    progression.level = 5;
    progression.levelXp = Math.min(currentXp + xpGain, cap);
    return progression;
  }

  currentXp += xpGain;

  while (currentLevel < 5) {
    const cap = getLevelXpCap(currentRank, currentLevel, kanjiList);

    if (currentXp < cap) {
      break;
    }

    currentXp -= cap;
    currentLevel += 1;
  }

  if (currentLevel >= 5) {
    const capLevel5 = getLevelXpCap(currentRank, 5, kanjiList);
    progression.level = 5;
    progression.levelXp = Math.min(currentXp, capLevel5);
  } else {
    progression.level = currentLevel;
    progression.levelXp = currentXp;
  }

  return progression;
}

// ==============================
// EXAMEN DU RANG ACTUEL
// ==============================
export function canTakeCurrentRankExam(progression, kanjiList) {
  if (!progression) return false;

  const currentRank = progression.currentRank || "E";
  const currentLevel = Number(progression.level) || 1;
  const currentXp = Number(progression.levelXp) || 0;

  if (currentLevel < 5) return false;

  const capLevel5 = getLevelXpCap(currentRank, 5, kanjiList);
  return currentXp >= capLevel5;
}

// ==============================
// PASSAGE AU RANG SUIVANT
// ==============================
export function rankUp(progression) {
  const next = getNextRank(progression.currentRank);
  if (!next) return progression;

  progression.currentRank = next;
  progression.unlockedRank = next;
  progression.level = 1;
  progression.levelXp = 0;

  return progression;
}
