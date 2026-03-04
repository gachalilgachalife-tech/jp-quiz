const STORAGE_KEY = "jp_quiz_site_v1";

export function defaultState(){
  return {
    ui: { theme: "dark" },

    last: { normalScore: null, infiniteQuestionsFor100: null },

    // ✅ progression (remplace badges/level)
    progression: {
      unlockedRank: "E", // rang max débloqué
      xp: 0,
      bestStreak: 0
    },

    stats: {
      byMode: {
        hira_to_romaji: { asked: 0, correct: 0, wrong: 0 },
        romaji_to_hira: { asked: 0, correct: 0, wrong: 0 },
        kata_to_romaji: { asked: 0, correct: 0, wrong: 0 },
        romaji_to_kata: { asked: 0, correct: 0, wrong: 0 },
      },
      wrongKana: {} // { "し": 3, "ツ": 2, ... }
    }
  };
}

export function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    // merge minimal safety
    const d = defaultState();
    return {
      ...d,
      ...s,
      ui: { ...d.ui, ...(s.ui||{}) },
      last: { ...d.last, ...(s.last||{}) },
      profile: { ...d.profile, ...(s.profile||{}) },
      stats: {
        ...d.stats,
        ...(s.stats||{}),
        byMode: { ...d.stats.byMode, ...((s.stats||{}).byMode||{}) },
        wrongKana: { ...((s.stats||{}).wrongKana||{}) }
      }
    };
  }catch{
    return defaultState();
  }
}

export function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Theme
export function applyTheme(theme){
  document.documentElement.dataset.theme = theme;
}

export function requestFullscreenToggle(){
  try{
    if(!document.fullscreenElement){
      document.documentElement.requestFullscreen?.();
    }else{
      document.exitFullscreen?.();
    }
  }catch{}
}

// Anti-répétition modes
const MODES = ["hira_to_romaji","romaji_to_hira","kata_to_romaji","romaji_to_kata"];

export function chooseModePro(session){
  const candidates = MODES.filter(m => m !== session.lastMode);
  const m = candidates[Math.floor(Math.random()*candidates.length)];
  session.lastMode = m;
  return m;
}

export function pickRandomEntry(obj){
  const keys = Object.keys(obj);
  const k = keys[Math.floor(Math.random() * keys.length)];
  return [k, obj[k]];
}

export function buildQcmChoices(allChars, correctChar){
  const pool = allChars.filter(c => c !== correctChar);
  shuffle(pool);
  const choices = pool.slice(0,4);
  choices.push(correctChar);
  shuffle(choices);
  return choices;
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

// Feedback helper
export function setFeedback(el, type, text){
  el.className = "feedback " + (type || "");
  el.textContent = text || "";
}

// HUD formatting
export function formatHud(session, SETTINGS){
  if(session.mode === "normal"){
    return {
      score: `Score : ${session.good}`,
      mini: `Question : ${session.asked}/${SETTINGS.normalQuestions}`
    };
  }
  return {
    score: `Bonnes réponses : ${session.good}/${SETTINGS.infiniteGoal}`,
    mini: `Questions : ${session.asked}`
  };
}

// XP / Levels / Badges
export function awardXPAndBadges(app, xpGain, ctx){
  const s = structuredClone(app);

  s.profile.xp += xpGain;

  // Level curve: simple & addictive
  // lvl up at: 200, 450, 750, 1100, ...
  while (s.profile.xp >= xpToReachLevel(s.profile.level + 1)) {
    s.profile.level += 1;
    addBadge(s, `Niveau ${s.profile.level}`);
  }

  // streak badges
  const streak = ctx?.session?.streak ?? 0;
  if (streak === 10) addBadge(s, "Streak x10");
  if (streak === 25) addBadge(s, "Streak x25");
  if (streak === 50) addBadge(s, "Streak x50");

  // session milestones (based on total asked across modes)
  const totalAsked = Object.values(s.stats.byMode).reduce((a,m)=>a + (m.asked||0), 0);
  if (totalAsked >= 200) addBadge(s, "200 questions");
  if (totalAsked >= 500) addBadge(s, "500 questions");
  if (totalAsked >= 1000) addBadge(s, "1000 questions");

  return s;
}

function xpToReachLevel(level){
  // level 2 = 200, 3 = 450, 4 = 750...
  // formula: 100*level*(level-1) / 2 + 100
  // but we want level 1 start at 0, so:
  if(level <= 1) return 0;
  return Math.floor(100 * (level * (level - 1)) / 2);
}

function addBadge(app, name){
  if(!app.profile.badges.includes(name)){
    app.profile.badges.push(name);
  }
}

export const RANKS = ["E","D","C","B","A","S","覚"];

export function rankToCeiling(rank){
  switch(rank){
    case "E": return 1;
    case "D": return 2;
    case "C": return 3;
    case "B": return 4;
    case "A": return 5;
    case "S": return 6;
    case "覚": return 7; // 7 = collège / tout
    default: return 1;
  }
}

export function isRankUnlocked(unlockedRank, targetRank){
  return RANKS.indexOf(targetRank) <= RANKS.indexOf(unlockedRank);
}

export function nextRank(rank){
  const i = RANKS.indexOf(rank);
  if (i < 0 || i === RANKS.length - 1) return null;
  return RANKS[i + 1];
}

export function unlockNextRank(state, currentRank){
  const n = nextRank(currentRank);
  if(!n) return state;

  const curIdx = RANKS.indexOf(state.progression.unlockedRank);
  const nextIdx = RANKS.indexOf(n);

  if(nextIdx > curIdx){
    state.progression.unlockedRank = n;
  }
  return state;
}
