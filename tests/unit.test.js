// tests/unit.test.js — Pure function unit tests
// Run: node tests/unit.test.js
// Requires: no dependencies (Node built-ins only)

var passed = 0;
var failed = 0;
var totalPassed = 0;
var totalFailed = 0;

function assert(cond, msg) {
  if (cond) passed++;
  else {
    failed++;
    console.error('  FAIL: ' + msg);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual === expected) passed++;
  else {
    failed++;
    console.error('  FAIL: ' + msg + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function summary(name) {
  console.log(name + ': ' + passed + '/' + (passed + failed) + ' passed');
  var t = passed;
  var f = failed;
  totalPassed += t;
  totalFailed += f;
  passed = 0;
  failed = 0;
  return { passed: t, failed: f };
}

globalThis.sessionStorage = {
  _data: {},
  getItem: function(k) { return this._data[k] || null; },
  setItem: function(k, v) { this._data[k] = v; }
};

var fs = require('fs');
var utilsCode = fs.readFileSync('js/utils.js', 'utf8');
eval(utilsCode);

(function() {
  assertEqual(escapeHtml('<script>'), '&lt;script&gt;', 'escapeHtml: < >');
  assertEqual(escapeHtml('a"b'), 'a&quot;b', 'escapeHtml: double quote');
  assertEqual(escapeHtml("a'b"), 'a&#39;b', 'escapeHtml: single quote');
  assertEqual(escapeHtml('a&b'), 'a&amp;b', 'escapeHtml: ampersand');
  assertEqual(escapeHtml('normal text'), 'normal text', 'escapeHtml: no special chars');
  assertEqual(escapeHtml(''), '', 'escapeHtml: empty string');
  assertEqual(escapeHtml(123), '123', 'escapeHtml: number input');
  assertEqual(escapeHtml(null), 'null', 'escapeHtml: null input');
  assertEqual(escapeHtml(undefined), 'undefined', 'escapeHtml: undefined input');
  assertEqual(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;', 'escapeHtml: XSS payload');
  summary('escapeHtml');
})();

(function() {
  var g1 = avatarGradient('testuser');
  assert(g1.indexOf('linear-gradient') === 0, 'avatarGradient: returns gradient');
  assertEqual(avatarGradient('testuser'), avatarGradient('testuser'), 'avatarGradient: deterministic');
  var g2 = avatarGradient('otheruser');
  assert(typeof g2 === 'string' && g2.indexOf('linear-gradient') === 0, 'avatarGradient: valid output');
  var g3 = avatarGradient('用户🎉');
  assert(typeof g3 === 'string' && g3.indexOf('#') > -1, 'avatarGradient: handles unicode');
  summary('avatarGradient');
})();

(function() {
  assertEqual(formatTime(null), '', 'formatTime: null');
  assertEqual(formatTime(''), '', 'formatTime: empty');
  assertEqual(formatTime(undefined), '', 'formatTime: undefined');
  var recent = new Date(Date.now() - 30000).toISOString();
  assertEqual(formatTime(recent), '刚刚', 'formatTime: just now');
  var mins = new Date(Date.now() - 120000).toISOString();
  assert(formatTime(mins).indexOf('分钟前') > -1, 'formatTime: minutes ago');
  var hours = new Date(Date.now() - 7200000).toISOString();
  assert(formatTime(hours).indexOf('小时前') > -1, 'formatTime: hours ago');
  summary('formatTime');
})();

(function() {
  var code = generateInviteCode();
  assertEqual(code.length, 6, 'generateInviteCode: length is 6');
  assert(/^[A-Z0-9]{6}$/.test(code), 'generateInviteCode: alphanumeric uppercase');
  var codes = {};
  for (var i = 0; i < 100; i++) codes[generateInviteCode()] = true;
  assert(Object.keys(codes).length >= 95, 'generateInviteCode: low collision rate (' + Object.keys(codes).length + '/100 unique)');
  summary('generateInviteCode');
})();

(function() {
  assertEqual(calcLevel(0), 1, 'calcLevel: 0 XP = level 1');
  assertEqual(calcLevel(99), 1, 'calcLevel: 99 XP = level 1');
  assertEqual(calcLevel(100), 2, 'calcLevel: 100 XP = level 2');
  assertEqual(calcLevel(999), 10, 'calcLevel: 999 XP = level 10');
  assertEqual(calcLevel(1000), 11, 'calcLevel: 1000 XP = level 11');
  assertEqual(calcXPForLevel(1), 0, 'calcXPForLevel: level 1 = 0 XP');
  assertEqual(calcXPForLevel(5), 400, 'calcXPForLevel: level 5 = 400 XP');
  assertEqual(levelTitle(1), '萌新', 'levelTitle: level 1');
  assertEqual(levelTitle(10), '创世神', 'levelTitle: level 10');
  assertEqual(levelTitle(99), '创世神', 'levelTitle: overflow');
  summary('calcLevel/levelTitle');
})();

(function() {
  var raw = {
    id: 'p1',
    title: 'Test',
    category: 'exp',
    category_label: '经验分享',
    author: '张三',
    author_avatar: '张',
    content: 'hello',
    platform: 'xhs',
    likes: 5,
    comment_count: 3,
    created_at: new Date().toISOString()
  };
  var p = normalizePost(raw);
  assertEqual(p.title, 'Test', 'normalizePost: title');
  assertEqual(p.maker, '张三', 'normalizePost: author→maker map');
  assertEqual(p.desc, 'hello', 'normalizePost: content→desc map');
  assertEqual(p.avatar, '张', 'normalizePost: author_avatar→avatar map');
  assertEqual(p.platform, 'xhs', 'normalizePost: platform');
  assertEqual(p.likes, 5, 'normalizePost: likes');
  var old = { id: 'p2', title: 'Old', category: 'qa', maker: '李四', avatar: '李', desc: 'old content', created_at: new Date().toISOString() };
  var p2 = normalizePost(old);
  assertEqual(p2.maker, '李四', 'normalizePost: fallback to maker');
  assertEqual(p2.desc, 'old content', 'normalizePost: fallback to desc');
  summary('normalizePost');
})();

(function() {
  var raw = { id: 'r1', title: 'Job', poster: 'HR', platforms: ['xhs', 'douyin'], tags: ['急招', '达人'], budget: '5000' };
  var r = normalizeRecruit(raw);
  assertEqual(r.title, 'Job', 'normalizeRecruit: title');
  assertEqual(r.platforms.length, 2, 'normalizeRecruit: platforms array');
  var bad = { id: 'r2', title: 'Bad', poster: 'X', tags: null };
  var r2 = normalizeRecruit(bad);
  assert(Array.isArray(r2.tags) && r2.tags.length === 0, 'normalizeRecruit: null tags → empty array');
  summary('normalizeRecruit');
})();

(function() {
  for (var i = 0; i < 20; i++) {
    var t = randTilt(i);
    assert(t.indexOf('deg') > -1, 'randTilt: returns deg value');
    var tape = randTape(i);
    assert(tape.indexOf('rotate') === 0, 'randTape: returns rotate()');
  }
  summary('randTilt/randTape');
})();

console.log('\n=== Unit Test Results ===');
console.log('Total: ' + totalPassed + '/' + (totalPassed + totalFailed) + ' assertions passed');
if (totalFailed === 0) {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}
console.error('FAILURES: ' + totalFailed);
process.exit(1);
