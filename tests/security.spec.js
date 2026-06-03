const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { test, expect } = loadPlaywrightTest();

test.skip(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'service role key required');

function loadPlaywrightTest() {
  try { return require('@playwright/test'); } catch (_) {}
  try { return require('playwright/test'); } catch (_) {}
  const cacheRoot = process.env.npm_config_cache || path.join(os.homedir(), '.npm');
  const npxRoot = path.join(cacheRoot, '_npx');
  if (fs.existsSync(npxRoot)) {
    const dirs = fs.readdirSync(npxRoot)
      .map(function(name) {
        var full = path.join(npxRoot, name);
        return { full: full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort(function(a, b) { return b.mtime - a.mtime; });
    for (const dir of dirs) {
      const candidate = path.join(dir.full, 'node_modules', 'playwright', 'test.js');
      if (fs.existsSync(candidate)) return require(candidate);
    }
  }
  throw new Error('Cannot resolve Playwright test runner. Run with npx playwright test.');
}

function loadSupabase() {
  try { return require('@supabase/supabase-js'); } catch (_) {}
  const cacheRoot = process.env.npm_config_cache || path.join(os.homedir(), '.npm');
  const npxRoot = path.join(cacheRoot, '_npx');
  if (fs.existsSync(npxRoot)) {
    const dirs = fs.readdirSync(npxRoot)
      .map(function(name) {
        var full = path.join(npxRoot, name);
        return { full: full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort(function(a, b) { return b.mtime - a.mtime; });
    for (const dir of dirs) {
      const candidate = path.join(dir.full, 'node_modules', '@supabase', 'supabase-js');
      if (fs.existsSync(candidate)) return require(candidate);
    }
  }
  throw new Error('Cannot resolve @supabase/supabase-js.');
}

function appConfig() {
  var app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  var url = process.env.SUPABASE_URL || ((app.match(/const SB_URL='([^']+)'/) || [])[1]);
  var anon = process.env.SUPABASE_ANON_KEY || ((app.match(/const SB_KEY='([^']+)'/) || [])[1]);
  return { url: url, anon: anon };
}

const { createClient } = process.env.SUPABASE_SERVICE_ROLE_KEY ? loadSupabase() : { createClient: null };
const cfg = appConfig();
const stamp = Date.now();
const pass = 'Audit-pass-123456';
const userA = 'audit_a_' + stamp;
const userB = 'audit_b_' + stamp;
const emailA = userA + '@example.test';
const emailB = userB + '@example.test';
let service;
let clientA;
let clientB;
let authA;
let authB;

test.beforeAll(async () => {
  if (!cfg.url || !cfg.anon) throw new Error('SUPABASE_URL and anon key are required');
  service = createClient(cfg.url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  clientA = createClient(cfg.url, cfg.anon, { auth: { persistSession: false } });
  clientB = createClient(cfg.url, cfg.anon, { auth: { persistSession: false } });

  var createdA = await service.auth.admin.createUser({ email: emailA, password: pass, email_confirm: true, user_metadata: { username: userA, role: 'creator', role_label: '创作者 / 达人' } });
  if (createdA.error) throw createdA.error;
  authA = createdA.data.user;
  var createdB = await service.auth.admin.createUser({ email: emailB, password: pass, email_confirm: true, user_metadata: { username: userB, role: 'brand', role_label: '品牌方' } });
  if (createdB.error) throw createdB.error;
  authB = createdB.data.user;

  var signA = await clientA.auth.signInWithPassword({ email: emailA, password: pass });
  if (signA.error) throw signA.error;
  var signB = await clientB.auth.signInWithPassword({ email: emailB, password: pass });
  if (signB.error) throw signB.error;
});

test.afterAll(async () => {
  if (!service) return;
  var names = [userA, userB];
  await service.from('xp_records').delete().in('username', names);
  await service.from('chat_messages').delete().or('sender.in.(' + names.join(',') + '),recipient.in.(' + names.join(',') + ')');
  await service.from('posts').delete().in('author', names);
  await service.from('friends').delete().or('username.in.(' + names.join(',') + '),friend_name.in.(' + names.join(',') + ')');
  await service.from('notifications').delete().or('username.in.(' + names.join(',') + '),from_user.in.(' + names.join(',') + ')');
  await service.from('match_demands').delete().in('poster', names);
  if (authA) await service.auth.admin.deleteUser(authA.id);
  if (authB) await service.auth.admin.deleteUser(authB.id);
});

test('user A cannot insert a post as user B', async () => {
  var r = await clientA.from('posts').insert({ id: 'audit-post-' + stamp, author: userB, title: 'spoof', content: 'spoof' });
  expect(r.error && r.error.message).toBeTruthy();
});

test('user A cannot update own trust_score directly', async () => {
  var r = await clientA.from('profiles').update({ trust_score: 999 }).eq('username', userA);
  expect(r.error && r.error.message).toBeTruthy();
});

test('anonymous user cannot insert chat messages', async () => {
  var anon = createClient(cfg.url, cfg.anon, { auth: { persistSession: false } });
  var r = await anon.from('chat_messages').insert({ sender: userA, recipient: userB, content: 'anon' });
  expect(r.error && r.error.message).toBeTruthy();
});

test('user A cannot poll user B updates', async () => {
  var r = await clientA.rpc('get_poll_updates', { since_ts: new Date(Date.now() - 3600000).toISOString(), username_query: userB, post_ids: [] });
  expect(r.error && r.error.message).toContain('forbidden');
});

test('user A cannot confirm user B deal', async () => {
  var dealId = 'audit-deal-' + stamp;
  await service.from('match_demands').insert({ id: dealId, poster: userB, role: '品牌方', platforms: [], budget: '100', description: 'audit', deal_status: 'open' });
  var r = await clientA.rpc('confirm_deal', { p_deal_id: dealId, p_partner: userA });
  expect(r.error && r.error.message).toContain('forbidden');
});

test('award_xp writes an owned xp record', async () => {
  var r = await clientA.rpc('award_xp', { p_amount: 50, p_reason: 'test' });
  expect(r.error).toBeFalsy();
  var rows = await clientA.from('xp_records').select('username,amount,reason').eq('username', userA).eq('reason', 'test');
  expect(rows.error).toBeFalsy();
  expect(rows.data.length).toBeGreaterThanOrEqual(1);
});

test('invite XP is capped per day', async () => {
  var first = await clientA.rpc('award_xp', { p_amount: 100, p_reason: '邀请好友注册' });
  expect(first.error).toBeFalsy();
  var second = await clientA.rpc('award_xp', { p_amount: 100, p_reason: '邀请好友注册' });
  expect(second.error).toBeFalsy();
  var third = await clientA.rpc('award_xp', { p_amount: 100, p_reason: '邀请好友注册' });
  expect(third.error && third.error.message).toContain('daily cap exceeded');
});

test('chat rate trigger rejects the 31st message in 60 seconds', async () => {
  for (var i = 0; i < 30; i++) {
    var ok = await clientA.from('chat_messages').insert({ sender: userA, recipient: userB, content: 'rate ' + i });
    expect(ok.error).toBeFalsy();
  }
  var blocked = await clientA.from('chat_messages').insert({ sender: userA, recipient: userB, content: 'blocked' });
  expect(blocked.error && blocked.error.message).toContain('rate limit exceeded');
});
