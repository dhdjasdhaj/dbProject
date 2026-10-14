// Read-only browser checks for the floating employment navigation.
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const root = path.resolve(__dirname, '..'), out = path.join(root, 'verification/employment');
const vault = JSON.parse(fs.readFileSync(path.join(out, 'demo-credentials.json'), 'utf8'));
const checks = [], errors = [];
function check(name, condition, evidence) {
  checks.push({ case: name, result: condition ? 'PASS' : 'FAIL', evidence });
  if (!condition) throw Error(name + ': ' + evidence);
}
async function auth(name) {
  const res = await fetch('http://127.0.0.1:18181/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: vault[name].password }) });
  const result = await res.json(); if (result.code !== 200) throw Error('Authentication failed'); return result.data;
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN', reducedMotion: 'no-preference' });
    page.on('pageerror', error => errors.push(error.message));
    async function login(name) {
      const identity = await auth(name);
      await page.goto('http://127.0.0.1:18181/login');
      await page.evaluate(identity => {
        localStorage.setItem('auth_token', identity.token);
        localStorage.setItem('auth_user_id', String(identity.userId));
        localStorage.setItem('auth_username', identity.username);
      }, identity);
      await page.goto('http://127.0.0.1:18181/employment');
      await page.locator('.employment-welcome').waitFor();
      await page.locator('.employment-dock-nav a').first().waitFor();
      await page.waitForTimeout(450);
    }
    await login('course_demo_student_30');
    check('portal_escapes_blurred_page', await page.locator('.employment-dock-host').evaluate(node => node.parentElement === document.body), 'Floating panel is attached directly to body');
    for (const width of [2530, 1440, 1250, 1024, 901]) {
      await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(300);
      const bounds = await page.evaluate(() => {
        const dock = document.querySelector('.employment-floating-dock'), panel = dock.getBoundingClientRect(), content = document.querySelector('.employment-shell').getBoundingClientRect(), header = document.querySelector('.compact-header').getBoundingClientRect();
        return { fixed: getComputedStyle(dock).position === 'fixed', noOverlap: panel.right <= content.left && panel.top >= header.bottom, inViewport: panel.left >= 0 && panel.bottom <= innerHeight, noOverflow: document.documentElement.scrollWidth <= innerWidth + 1 };
      });
      check('desktop_' + width, Object.values(bounds).every(Boolean), JSON.stringify(bounds));
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const jobs = page.locator('.employment-dock-nav').getByRole('link', { name: '招聘岗位', exact: true });
    await jobs.hover(); await page.waitForTimeout(400);
    check('vertical_spring_proximity', await jobs.evaluate(node => Number(node.style.getPropertyValue('--rail-grow')) > .5), 'Pointer proximity activates the supplied spring/damping motion');
    await jobs.click(); await page.getByRole('heading', { name: '招聘岗位', exact: true }).waitFor(); await page.locator('tbody tr').first().waitFor();
    check('selected_state', await jobs.getAttribute('aria-current') === 'page', 'Selection follows the real route');
    const before = await page.locator('.employment-floating-dock').boundingBox();
    await page.evaluate(() => scrollTo(0, 600)); await page.waitForTimeout(300);
    const after = await page.locator('.employment-floating-dock').boundingBox();
    check('scroll_stays_floating', Math.abs(before.y - after.y) < 12, 'Panel remains below the sticky header during page scrolling');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, 'floating-student-desktop.png'), fullPage: false });
    await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '简历市场', exact: true }).click();
    await page.waitForURL('**/resume-templates');
    await page.locator('.employment-dock-host').waitFor({ state: 'detached' });
    check('other_module_removes_dock', await page.locator('.employment-dock-host').count() === 0 && await page.locator('.studio-main--employment').count() === 0, 'Leaving employment removes the panel and reserved sidebar space');
    await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '就业管理', exact: true }).click();
    await page.locator('.employment-welcome').waitFor();
    check('employment_click_restores_dock', await page.locator('.employment-floating-dock').count() === 1, 'Clicking the main employment entry creates a new floating panel');
    for (const viewport of [{ width: 900, height: 844 }, { width: 768, height: 844 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport); await page.goto('http://127.0.0.1:18181/employment');
      await page.locator('.employment-welcome').waitFor(); await page.waitForTimeout(400);
      const panel = await page.locator('.employment-floating-dock').boundingBox();
      const header = await page.locator('.compact-header').boundingBox();
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      check('mobile_fit_' + viewport.width, panel.x >= 0 && panel.x + panel.width <= viewport.width && panel.y >= header.y + header.height && panel.y + panel.height <= viewport.height && noOverflow, JSON.stringify(panel));
      if (viewport.width === 390) await page.screenshot({ path: path.join(out, 'floating-mobile-open.png'), fullPage: false });
      await page.locator('.employment-dock-nav').getByRole('link', { name: '招聘岗位', exact: true }).click();
      await page.getByRole('heading', { name: '招聘岗位', exact: true }).waitFor();
      check('mobile_selection_closes_' + viewport.width, await page.locator('.employment-floating-dock').count() === 0, 'Menu selection returns unobstructed content');
      await page.getByRole('button', { name: '展开就业导航', exact: true }).click();
      await page.locator('.employment-floating-dock').waitFor();
      await page.keyboard.press('Escape');
      check('mobile_escape_' + viewport.width, await page.locator('.employment-floating-dock').count() === 0 && await page.getByRole('button', { name: '展开就业导航' }).evaluate(node => node === document.activeElement), 'Escape dismisses panel and restores focus');
      if (viewport.width === 390) await page.screenshot({ path: path.join(out, 'floating-mobile-closed.png'), fullPage: false });
    }
    await page.setViewportSize({ width: 1440, height: 760 });
    await login('course_demo_admin');
    const last = page.locator('.employment-dock-nav a').last(); await last.focus();
    const fits = await last.evaluate(node => { const link = node.getBoundingClientRect(), nav = node.parentElement.getBoundingClientRect(); return link.top >= nav.top && link.bottom <= nav.bottom; });
    check('admin_long_menu_keyboard', fits, 'Administrator long menu scrolls internally to focused entries');
    await page.screenshot({ path: path.join(out, 'floating-admin-desktop.png'), fullPage: false });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await last.hover(); await page.waitForTimeout(150);
    check('reduced_motion', await last.evaluate(node => getComputedStyle(node).transform === 'none'), 'Reduced-motion preference disables spring growth');
    await page.emulateMedia({ media: 'print' });
    check('print_hides_dock', await page.locator('.employment-dock-host').evaluate(node => getComputedStyle(node).display === 'none'), 'Floating navigation is excluded from printed reports');
    check('no_browser_errors', errors.length === 0, JSON.stringify(errors));
    fs.writeFileSync(path.join(out, 'floating-dock-checks.json'), JSON.stringify({ date: new Date().toISOString(), checks }, null, 2));
    console.log('Floating dock:', checks.length, 'checks passed.');
  } finally { await browser.close(); }
})().catch(error => {
  fs.writeFileSync(path.join(out, 'floating-dock-checks.json'), JSON.stringify({ date: new Date().toISOString(), checks, error: error.message }, null, 2));
  console.error(error.message); process.exitCode = 1;
});
