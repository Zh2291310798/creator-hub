const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { test, expect } = loadPlaywrightTest();

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

function appHtml() {
  return fs
    .readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(/<script\b[^>]*src="https:\/\/cdn\.jsdelivr\.net[^>]*><\/script>/g, '')
    .replace(/<script\b[^>]*src="js\/utils\.js"[^>]*><\/script>/g, '')
    .replace(/<script\b[^>]*src="js\/app\.js"[^>]*><\/script>/g, '');
}

test('registration form exposes required fields', async ({ page }) => {
  await page.setContent(appHtml());
  await expect(page.locator('#regEmail')).toHaveCount(1);
  await expect(page.locator('#regUser')).toHaveCount(1);
  await expect(page.locator('#regPass')).toHaveCount(1);
  await expect(page.locator('#regPass2')).toHaveCount(1);
  await expect(page.locator('#regRole')).toHaveCount(1);
});

test('primary navigation panels exist', async ({ page }) => {
  await page.setContent(appHtml());
  var tabs = ['home', 'square', 'chat', 'recruit', 'match', 'local', 'community', 'friends', 'profile'];
  for (const tab of tabs) {
    await expect(page.locator('#panel-' + tab)).toHaveCount(1);
  }
  await expect(page.locator('[data-tab="chat"]')).toContainText('聊天');
  await expect(page.locator('[data-tab="match"]')).toContainText('对接');
});

test('post create and delete surfaces are present', async ({ page }) => {
  await page.setContent(appHtml());
  await expect(page.locator('#postTitle')).toHaveCount(1);
  await expect(page.locator('#postContent')).toHaveCount(1);
  await expect(page.locator('#postCategory')).toHaveCount(1);
  await expect(page.locator('button[onclick="createPost()"]')).toHaveCount(1);
  const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  expect(app).toContain('function createPost(');
  expect(app).toContain('function deletePost(');
});

test('chat UI exposes contacts, messages, input, and send action', async ({ page }) => {
  await page.setContent(appHtml());
  await expect(page.locator('#chatContactList')).toHaveCount(1);
  await expect(page.locator('#chatMessages')).toHaveCount(1);
  await expect(page.locator('#chatInput')).toHaveCount(1);
  await expect(page.locator('.chat-input-area button').filter({ hasText: '发送' })).toHaveCount(1);
});

test('RLS delete policies are username-owned', async () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/migration.sql'), 'utf8');
  expect(sql).toContain('CREATE POLICY "posts_delete_own_auth" ON posts FOR DELETE\n  USING ((select username from profiles where id = auth.uid()) = author);');
  expect(sql).toContain('CREATE POLICY "recruits_delete_own_auth" ON recruits FOR DELETE\n  USING ((select username from profiles where id = auth.uid()) = poster);');
  expect(sql).toContain('CREATE POLICY "local_delete_own_auth" ON local_demands FOR DELETE\n  USING ((select username from profiles where id = auth.uid()) = poster);');
  expect(sql).toContain('CREATE POLICY "friends_delete_own_auth" ON friends FOR DELETE\n  USING ((select username from profiles where id = auth.uid()) = username);');
});
