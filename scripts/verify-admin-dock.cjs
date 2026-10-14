/** Real API and Chrome acceptance checks; removes only its own temporary accounts. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const project = path.resolve(__dirname, '..');
const base = process.env.TEST_BASE_URL || 'http://localhost:18181';
const out =
  process.env.TEST_OUTPUT_DIR ||
  path.join(project, 'verification', 'admin-dock');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(project, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((s) => s.includes('=') && !s.startsWith('#'))
    .map((s) => {
      const i = s.indexOf('=');
      return [s.slice(0, i), s.slice(i + 1)];
    }),
);
const prefix = 'dockcheck_' + crypto.randomBytes(5).toString('hex');
const password = crypto.randomBytes(18).toString('hex');
const created = [];
const report = { base, checks: [], browserErrors: [] };
let browser;
const pass = (name) => {
  report.checks.push(name);
  console.log('PASS ' + name);
};
async function api(route, token, method = 'GET', body, expected = 200) {
  const res = await fetch(base + route, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await res.json();
  assert.equal(result.code, expected, route + ': ' + result.message);
  return result.data;
}
async function widthCheck(page, label) {
  const bounds = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert.ok(
    bounds.scroll <= bounds.width + 1,
    label + ' overflow ' + JSON.stringify(bounds),
  );
}
async function login(page, name, secret, mode = 'user') {
  await page.goto(base + '/login?mode=' + mode);
  await page.getByLabel('用户名', { exact: true }).fill(name);
  await page.getByLabel('密码', { exact: true }).fill(secret);
  await page
    .getByRole('button', {
      name: mode === 'admin' ? '进入管理后台' : '登录',
      exact: true,
    })
    .click();
  await page.waitForURL(mode === 'admin' ? '**/admin/users' : '**/upload');
  await page.waitForLoadState('networkidle');
}
async function menu(page) {
  await page.getByRole('button', { name: /^账户菜单：/ }).click();
  await page.locator('#account-panel').waitFor();
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    let admin;
    for (let i = 0; i < 60; i++) {
      try {
        admin = await api('/api/auth/admin/login', 'expired-token', 'POST', {
          username: env.APP_ADMIN_USERNAME,
          password: env.APP_ADMIN_PASSWORD,
        });
        break;
      } catch (error) {
        if (i === 59) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    assert.equal(admin.role, 'ADMIN');
    pass('Administrator login succeeds and ignores stale session headers');
    const before = await api('/api/admin/users', admin.token);
    await api('/api/admin/users', null, 'GET', null, 401);
    for (let i = 0; i < 21; i++) {
      const username = prefix + '_' + String(i).padStart(2, '0');
      const account = await api('/api/auth/register', null, 'POST', {
        username,
        password,
        role: 'ADMIN',
      });
      assert.equal(account.role, 'USER');
      created.push(account);
    }
    const member = created[0];
    await api('/api/admin/users', member.token, 'GET', null, 403);
    const rejected = await api(
      '/api/auth/admin/login',
      member.token,
      'POST',
      { username: member.username, password },
      403,
    );
    assert.ok(!rejected?.token);
    await api(
      '/api/auth/admin/login',
      null,
      'POST',
      {
        username: env.APP_ADMIN_USERNAME,
        password: crypto.randomBytes(12).toString('hex'),
      },
      9001,
    );
    pass(
      'Members cannot register as ADMIN, log in as administrators or list users',
    );
    const first = await api(
      '/api/admin/users?q=' + encodeURIComponent(prefix),
      admin.token,
    );
    const second = await api(
      '/api/admin/users?q=' + encodeURIComponent(prefix) + '&page=1',
      admin.token,
    );
    assert.equal(first.total, 21);
    assert.equal(first.items.length, 20);
    assert.equal(second.items.length, 1);
    assert.equal(
      new Set([...first.items, ...second.items].map((u) => u.id)).size,
      21,
    );
    assert.equal(first.stats.total, before.stats.total + 21);
    assert.equal(first.stats.users, before.stats.users + 21);
    assert.equal(first.stats.administrators, before.stats.administrators);
    for (const user of [...first.items, ...second.items]) {
      assert.deepEqual(Object.keys(user).sort(), [
        'createdAt',
        'id',
        'role',
        'username',
      ]);
      assert.ok(user.createdAt && user.role === 'USER');
    }
    const onlyAdmins = await api('/api/admin/users?role=ADMIN', admin.token);
    assert.ok(
      onlyAdmins.items.length &&
        onlyAdmins.items.every((u) => u.role === 'ADMIN'),
    );
    assert.equal(
      (
        await api(
          '/api/admin/users?q=' + encodeURIComponent(prefix) + '&role=ADMIN',
          admin.token,
        )
      ).total,
      0,
    );
    assert.equal(
      (
        await api(
          '/api/admin/users?q=' + encodeURIComponent('%' + prefix),
          admin.token,
        )
      ).total,
      0,
    );
    assert.equal(
      (
        await api(
          '/api/admin/users?q=' + encodeURIComponent("' OR 1=1 --"),
          admin.token,
        )
      ).total,
      0,
    );
    await api('/api/admin/users?role=ROOT', admin.token, 'GET', null, 400);
    await api('/api/admin/users?page=-1', admin.token, 'GET', null, 400);
    pass(
      'User directory has accurate statistics, bounded pagination, literal search and no password fields',
    );
    const { chromium } = require(
      process.env.PLAYWRIGHT_MODULE_PATH ||
        'C:/Users/stc_0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
    );
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.on('pageerror', (e) => report.browserErrors.push(e.message));
    await login(page, member.username, password);
    await page.goto(base + '/community');
    await page.waitForLoadState('networkidle');
    const bar = page.locator('.atd-modern__bar'),
      nav = page.getByRole('navigation', { name: '主导航' });
    const barBox = await bar.boundingBox(),
      navBox = await nav.boundingBox();
    assert.ok(barBox.height <= 68, 'Desktop header height ' + barBox.height);
    assert.ok(
      Math.abs(navBox.x + navBox.width / 2 - barBox.x - barBox.width / 2) < 3,
      'Dock is centred',
    );
    assert.equal(
      await page
        .locator('.floating-dock,.floating-brand,.floating-logout')
        .count(),
      0,
    );
    assert.equal(
      await page.locator('.account-trigger img').getAttribute('src'),
      '/avatar-default.svg',
    );
    const iconBox = await nav
      .getByRole('link', { name: '社区频道' })
      .locator('svg')
      .boundingBox();
    const labelBox = await nav
      .getByRole('link', { name: '社区频道' })
      .locator('span')
      .boundingBox();
    assert.ok(
      Math.abs(
        iconBox.y + iconBox.height / 2 - labelBox.y - labelBox.height / 2,
      ) < 3,
    );
    pass(
      'Desktop bar is compact, centred and inline, with the current account avatar',
    );
    const item = nav.getByRole('link', { name: '简历生成', exact: true });
    const idle = await item.boundingBox();
    await item.hover();
    await page.waitForFunction(
      () =>
        Number(document.querySelector('.atd-modern__dock').dataset.dockMax) >
        0.8,
    );
    const expanded = await item.boundingBox();
    assert.ok(
      expanded.width > idle.width + 10 &&
        expanded.height > idle.height + 9 &&
        expanded.y + expanded.height / 2 > idle.y + idle.height / 2 + 1,
    );
    const trackAfter = await nav.boundingBox();
    assert.equal(Math.round(trackAfter.width), Math.round(navBox.width));
    const itemBox = await item.boundingBox();
    const headerBox = await bar.boundingBox();
    assert.ok(
      itemBox.y >= headerBox.y &&
        itemBox.y + itemBox.height <= headerBox.y + headerBox.height,
      'Expanded menu stays inside the compact header',
    );
    await page.mouse.move(1, 200);
    await page.waitForFunction(
      () =>
        Number(document.querySelector('.atd-modern__dock').dataset.dockMax) <
        0.03,
    );
    pass(
      'Spring proximity grows and drops menu cells while the track remains fixed',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await item.hover();
    assert.equal(await nav.getAttribute('data-dock-max'), '0.00');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    pass('Dock respects reduced motion');
    await menu(page);
    await page.getByText(member.username, { exact: true }).first().waitFor();
    assert.equal(
      await page.getByRole('link', { name: '查看用户', exact: true }).count(),
      0,
    );
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#account-panel').count(), 0);
    await menu(page);
    await page
      .getByRole('button', { name: '切换管理员账号', exact: true })
      .click();
    await page.waitForURL('**/login?mode=admin');
    assert.equal(
      await page.evaluate(() => localStorage.getItem('auth_token')),
      null,
    );
    await page
      .getByRole('heading', { name: '管理员登录', exact: true })
      .waitFor();
    await page.getByLabel('用户名', { exact: true }).fill(member.username);
    await page.getByLabel('密码', { exact: true }).fill(password);
    await page
      .getByRole('button', { name: '进入管理后台', exact: true })
      .click();
    await page
      .getByRole('alert')
      .filter({ hasText: '该账号不是管理员' })
      .waitFor();
    assert.equal(
      await page.evaluate(() => localStorage.getItem('auth_token')),
      null,
    );
    pass(
      'Avatar switches to administrator login and member credentials are rejected',
    );
    await login(page, env.APP_ADMIN_USERNAME, env.APP_ADMIN_PASSWORD, 'admin');
    await page
      .getByRole('heading', { name: '用户管理', exact: true })
      .waitFor();
    await page.getByRole('list', { name: '已注册用户' }).waitFor();
    await page.getByLabel('搜索用户名').fill(prefix);
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    await page.getByText('共 21 位用户', { exact: true }).waitFor();
    await page.getByRole('button', { name: '下一页', exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll('.admin-users-list>li').length === 1,
    );
    await page.getByLabel('用户身份筛选').selectOption('ADMIN');
    await page.getByText('没有符合条件的用户', { exact: true }).waitFor();
    await page.getByLabel('搜索用户名').fill('');
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    await page.getByRole('list', { name: '已注册用户' }).waitFor();
    pass(
      'Administrator login opens the real user directory; search, role filtering and pagination work',
    );
    await page.screenshot({ path: path.join(out, 'admin-users-desktop.png') });
    for (const width of [2530, 1440, 1024, 960, 900, 850, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await widthCheck(page, width + 'px user directory');
      for (const label of [
        '社区频道',
        '简历库',
        '简历生成',
        '简历市场',
        '面试记录',
        '知识库',
        '问答助手',
      ]) {
        const link = nav.getByRole('link', { name: label, exact: true });
        assert.ok(await link.isVisible());
        const box = await link.boundingBox();
        assert.ok(
          box.x >= 0 && box.x + box.width <= width + 1,
          label + ' clipped at ' + width,
        );
      }
      if (width === 390)
        await page.screenshot({
          path: path.join(out, 'admin-users-mobile.png'),
        });
      await menu(page);
      await widthCheck(page, width + 'px account menu');
      const panel = await page.locator('#account-panel').boundingBox();
      assert.ok(panel.x >= 0 && panel.x + panel.width <= width + 1);
      await page.keyboard.press('Escape');
      await page.goto(base + '/upload');
      await page.waitForLoadState('networkidle');
      await widthCheck(page, width + 'px upload');
      await page.goto(base + '/admin/users');
      await page.waitForLoadState('networkidle');
      pass(
        width + 'px directory, home, dock and account menu fit the viewport',
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await menu(page);
    await page
      .locator('#account-panel')
      .getByRole('link', { name: '社区管理', exact: true })
      .click();
    await page.waitForURL('**/community/admin');
    await menu(page);
    await page
      .locator('#account-panel')
      .getByRole('link', { name: '用户视图', exact: true })
      .click();
    await page.waitForURL('**/community');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: '暂停自动旋转' }).click();
    await page.screenshot({
      path: path.join(out, 'compact-dock-community.png'),
    });
    await menu(page);
    await page.screenshot({ path: path.join(out, 'avatar-account-menu.png') });
    await page
      .locator('#account-panel')
      .getByRole('link', { name: '查看用户', exact: true })
      .click();
    await page.waitForURL('**/admin/users');
    await menu(page);
    await page
      .getByRole('button', { name: '切换用户账号', exact: true })
      .click();
    await page.waitForURL('**/login?mode=user');
    await page.getByRole('button', { name: '管理员登录', exact: true }).click();
    await page
      .getByRole('heading', { name: '管理员登录', exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(out, 'administrator-login-desktop.png'),
    });
    await page.setViewportSize({ width: 320, height: 844 });
    await widthCheck(page, '320px admin login');
    await page.screenshot({
      path: path.join(out, 'administrator-login-mobile.png'),
    });
    await page.getByRole('button', { name: '用户登录', exact: true }).click();
    pass(
      'Account menu navigates between management, community and both login modes',
    );
    await login(page, member.username, password);
    await page.goto(base + '/admin/users');
    await page.getByRole('heading', { name: '仅管理员可查看用户' }).waitFor();
    assert.equal(await page.locator('.admin-users-list').count(), 0);
    pass('Member UI does not expose the administrator directory');
    assert.equal(report.browserErrors.length, 0);
    pass('No browser runtime errors');
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.failure = error.stack;
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (created.length) {
      const names = created.map((u) => "'" + u.username + "'").join(',');
      execFileSync(
        'docker',
        [
          'exec',
          'interview-submit-postgres',
          'psql',
          '-U',
          'postgres',
          '-d',
          'interview_guide',
          '-c',
          'DELETE FROM users WHERE username IN (' + names + ')',
        ],
        { stdio: 'pipe' },
      );
      report.testDataRemoved = true;
    }
    fs.writeFileSync(
      path.join(out, 'admin-dock-verification.json'),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  }
})();
