// js/utils.js — Pure utility functions (no DOM, no Supabase)

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[c];
  });
}

function avatarGradient(name) {
  var hash = 0;
  var gradients = [
    ['#ff9a9e', '#fad0c4'],
    ['#a18cd1', '#fbc2eb'],
    ['#fad0c4', '#ffd1ff'],
    ['#ffecd2', '#fcb69f'],
    ['#ff9a9e', '#fecfef'],
    ['#a1c4fd', '#c2e9fb'],
    ['#d4fc79', '#96e6a1'],
    ['#84fab0', '#8fd3f4'],
    ['#cfd9df', '#e2ebf0'],
    ['#a6c0fe', '#f68084'],
    ['#fccb90', '#d57eeb'],
    ['#e0c3fc', '#8ec5fc'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140']
  ];
  name = String(name || '');
  for (var i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  var idx = Math.abs(hash) % gradients.length;
  var g = gradients[idx];
  return 'linear-gradient(135deg,' + g[0] + ',' + g[1] + ')';
}

function avatarStyle(name) {
  return 'background:' + avatarGradient(name) + ';color:#fff;font-weight:700;';
}

function formatTime(isoString) {
  if (!isoString) return '';
  var d = new Date(isoString);
  var now = new Date();
  var diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function generateInviteCode() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var code = '';
  for (var i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getSessionId() {
  var id = sessionStorage.getItem('_sid');
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('_sid', id);
  }
  return id;
}

function calcLevel(xp) {
  return Math.floor((xp || 0) / 100) + 1;
}

function calcXPForLevel(level) {
  return (level - 1) * 100;
}

function levelTitle(level) {
  var titles = ['萌新', '学徒', '探索者', '冒险家', '达人', '大师', '传说', '至尊', '王者', '创世神'];
  return titles[Math.min(level, 10) - 1] || '创世神';
}

function randTilt(i) {
  var seed = (i * 7 + 3) % 11;
  return ((seed - 5) * 0.6).toFixed(1) + 'deg';
}

function randTape(i) {
  var seed = (i * 13 + 7) % 7;
  return 'rotate(' + ((seed - 3) * 1.2).toFixed(1) + 'deg)';
}

function emoFor(t) {
  var m = {
    '社区评论': '💬',
    '对接': '🤝',
    '本地': '📍',
    '招募': '💼',
    '好友': '👥',
    '聊天': '💬',
    '系统': '🔔'
  };
  return m[t] || '💬';
}

function actFor(t) {
  var m = {
    '社区评论': 'community',
    '对接': 'match',
    '本地': 'local',
    '招募': 'recruit',
    '好友': 'friends',
    '聊天': 'chat'
  };
  return m[t] || '';
}

function platformTagHtml(p) {
  var m = {
    xhs: ['小红书', 'xhs'],
    douyin: ['抖音', 'douyin'],
    kuaishou: ['快手', 'kuaishou'],
    bilibili: ['B站', 'bilibili'],
    wechat: ['视频号', 'wechat'],
    weibo: ['微博', 'weibo'],
    youtube: ['YouTube', 'youtube'],
    tiktok: ['TikTok', 'tiktok'],
    instagram: ['Instagram', 'instagram'],
    taobao: ['淘宝', 'taobao'],
    pdd: ['拼多多', 'pdd'],
    zhihu: ['知乎', 'zhihu'],
    dewu: ['得物', 'dewu'],
    xigua: ['西瓜视频', 'xigua'],
    all: ['全平台', 'all']
  };
  var x = m[p] || ['全平台', 'all'];
  return '<span class="platform-tag ' + x[1] + '">' + x[0] + '</span>';
}

function normalizePost(p) {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    categoryLabel: p.category_label || '其他',
    maker: p.author || p.maker,
    avatar: p.author_avatar || p.avatar,
    time: formatTime(p.created_at),
    desc: p.content || p.desc,
    platform: p.platform || 'all',
    likes: p.likes || 0,
    comments: p.comment_count || 0,
    tags: p.tags,
    is_seed: p.is_seed || false
  };
}

function normalizeRecruit(r) {
  return {
    id: r.id,
    title: r.title,
    poster: r.poster,
    avatar: r.poster_avatar || (r.poster ? r.poster.slice(0, 1) : ''),
    avatarBg: r.avatarBg || '',
    type: r.type,
    mode: r.mode || '全职',
    desc: r.description || r.desc || '',
    detail: r.detail || '',
    budget: r.budget || '面议',
    city: r.city || '',
    platforms: Array.isArray(r.platforms) ? r.platforms : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    status: r.status || '招募中',
    statusClass: r.status_class || 'active-recruit'
  };
}
