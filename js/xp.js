// ========================================
// XP & LEVEL SYSTEM
// ========================================
var userXP = {};
try { var savedXP = localStorage.getItem('creatorhub_xp'); if (savedXP) userXP = JSON.parse(savedXP); } catch(e) { userXP = {}; }

function getLevel(xp) {
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 500) return 3;
  if (xp < 850) return 4;
  if (xp < 1300) return 5;
  if (xp < 1900) return 6;
  if (xp < 2600) return 7;
  if (xp < 3500) return 8;
  if (xp < 4600) return 9;
  return 10;
}
function xpForLevel(lv) {
  var thresholds = [0,100,250,500,850,1300,1900,2600,3500,4600,6000];
  return thresholds[lv] || 6000;
}
function xpForNextLevel(xp) {
  var lv = getLevel(xp);
  if (lv >= 10) return 0;
  return xpForLevel(lv+1) - xp;
}
function xpProgress(xp) {
  var lv = getLevel(xp);
  if (lv >= 10) return 100;
  var base = xpForLevel(lv);
  var next = xpForLevel(lv+1);
  return Math.floor(((xp - base) / (next - base)) * 100);
}

async function addXP(amount, reason) { if(!currentUser)return; var oldLv=myLevel; saveXP(amount,reason).then(function(){if(myLevel>oldLv){showToast("🎉 升级了！Lv."+myLevel+" 「"+getLevelTitle(myLevel)+"」");burstSparks(window.innerWidth/2,window.innerHeight/2,"🎉");}updateLevelDisplay();}); }

function getLevelTitle(lv) {
  var titles = ['','萌新','学徒','探路者','创作者','达人','专家','大师','传奇','巨星','创世神'];
  return titles[lv] || '创世神';
}

function updateLevelDisplay() {
  if (!currentUser) return;
  var xp = myXP || 0;
  var lv = getLevel(xp);
  var prog = xpProgress(xp);
  var bar = document.getElementById('levelBar');
  var txt = document.getElementById('levelText');
  if (bar) bar.style.setProperty('--progress', prog + '%');
  if (txt) txt.textContent = 'Lv.' + lv + ' ' + getLevelTitle(lv);
  var mini = document.getElementById('topLevelBadge');
  if (mini) mini.textContent = 'Lv.' + lv;
}

// CSS for the progress bar
document.addEventListener('DOMContentLoaded', function(){
  var style = document.createElement('style');
  style.textContent = '.level-bar::after { width: var(--progress, 0%); }';
  document.head.appendChild(style);
  setTimeout(function(){try{var perf=performance.getEntriesByType("navigation")[0];if(perf&&!sessionStorage.getItem("_perf_logged")){track("page_performance",{dom_ready:Math.round(perf.domContentLoadedEventEnd-perf.domContentLoadedEventStart),load_complete:Math.round(perf.loadEventEnd-perf.loadEventStart),total:Math.round(perf.loadEventEnd)});sessionStorage.setItem("_perf_logged","1");}}catch(e){}},0);
});
