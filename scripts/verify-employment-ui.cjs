const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const root = path.resolve(__dirname, '..'), out = path.join(root, 'verification/employment');
const vault = JSON.parse(fs.readFileSync(path.join(out, 'demo-credentials.json'), 'utf8'));
const checks = [], errors = [];
async function tokenFor(name) {
  const res = await fetch('http://127.0.0.1:18182/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name, password: vault[name].password }) });
  const envelope = await res.json(); if (envelope.code !== 200) throw Error('UI authentication failed'); return envelope.data;
}
function assert(name, condition, evidence) { checks.push({ case: name, result: condition ? 'PASS' : 'FAIL', evidence }); if (!condition) throw Error(name + ': ' + evidence); }
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const admin = await tokenFor('course_demo_admin'), student = await tokenFor('course_demo_student_30');
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    async function closeMobileDock() {
      if ((page.viewportSize()?.width || 1440) <= 900 && await page.locator('[data-dock-close]').isVisible()) {
        await page.locator('[data-dock-close]').click();
      }
    }
    async function login(auth) {
      await page.goto('http://127.0.0.1:18181/login');
      await page.evaluate(auth => { localStorage.setItem('auth_token', auth.token); localStorage.setItem('auth_user_id', String(auth.userId)); localStorage.setItem('auth_username', auth.username); }, auth);
    }
    await login(admin);
    await page.goto('http://127.0.0.1:18181/employment');
    await page.getByRole('heading', { name: '教师工作台', exact: true }).waitFor();
    await page.getByRole('heading', { name: '教师就业指导流程' }).waitFor();
    assert('teacher_auto_route', page.url().endsWith('/employment/teacher'), 'Original entry automatically selects teacher portal');
    assert('teacher_no_student_menu', await page.locator('.employment-sidebar').getByRole('link', { name: '我的档案' }).count() === 0, 'Teacher navigation contains management pages only');
    assert('same_site_navigation', await page.locator('.atd-modern__dock').getByRole('link', { name: '就业管理' }).count() === 1, 'Employment entry inside original dock');
    assert('admin_menu', await page.locator('.employment-sidebar').getByRole('link', { name: '模块管理' }).count() === 1, 'Administrator module controls visible');
    await page.screenshot({ path: path.join(out, 'workbench-desktop.png'), fullPage: true });
    for (const width of [2530, 1440, 1250, 1100, 1024, 840, 800, 768, 740, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const links = page.locator('.atd-modern__item');
      for (let i = 0; i < await links.count(); i++) { await links.nth(i).focus(); await page.waitForTimeout(150); }
      const measured = await page.evaluate(() => {
        const header = document.querySelector('.atd-modern__bar').getBoundingClientRect();
        const items = [...document.querySelectorAll('.atd-modern__item')].map(e => e.getBoundingClientRect());
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, fit: items.every(r => r.left >= header.left - 1 && r.right <= header.right + 1 && r.top >= header.top - 1 && r.bottom <= header.bottom + 1) };
      });
      assert('responsive_' + width, measured.scrollWidth <= width + 1 && measured.fit, JSON.stringify(measured));
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('http://127.0.0.1:18181/employment/teacher/jobs'); await page.getByRole('button', { name: '新增岗位', exact: true }).waitFor();
    assert('teacher_no_apply_button', await page.getByRole('button', { name: '投递岗位' }).count() === 0, 'Teacher job page does not contain student actions');
    await page.getByRole('button', { name: '新增岗位', exact: true }).click();
    await page.locator('dialog').waitFor();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const bounds = await page.locator('dialog').boundingBox();
      assert('dialog_' + width, bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 && bounds.height <= 844, JSON.stringify(bounds));
    }
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await page.goto('http://127.0.0.1:18181/employment/teacher/reports'); await page.getByRole('button', { name: '岗位招聘汇总' }).waitFor(); await page.locator('tbody tr').first().waitFor();
    await closeMobileDock();
    assert('mobile_table_contained', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Wide table scrolls inside its container');
    await page.screenshot({ path: path.join(out, 'report-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: path.join(out, 'report-desktop.png'), fullPage: true });
    await page.emulateMedia({ media: 'print' }); await page.pdf({ path: path.join(out, 'recruitment-report.pdf'), landscape: true, format: 'A4', printBackground: true }); await page.emulateMedia({ media: 'screen' });
    await login(student); await page.goto('http://127.0.0.1:18181/employment'); await page.getByRole('heading', { name: '我的求职流程' }).waitFor();
    assert('student_auto_route', page.url().endsWith('/employment/student'), 'Student routed to personal portal');
    assert('student_menu', await page.locator('.employment-sidebar').getByRole('link', { name: '模块管理' }).count() === 0 && await page.locator('.employment-sidebar').getByRole('link', { name: '我的档案' }).count() === 1, 'Account switching replaces module identity and menus');
    await page.setViewportSize({ width: 390, height: 844 }); await closeMobileDock(); await page.screenshot({ path: path.join(out, 'workbench-mobile.png'), fullPage: true });
    await page.goto('http://127.0.0.1:18181/employment/teacher/students');
    await page.getByRole('heading', { name: '学生工作台', exact: true }).waitFor();
    assert('student_teacher_route_blocked', page.url().endsWith('/employment/student'), 'Student cannot enter teacher student directory');
    await page.goto('http://127.0.0.1:18181/employment/student/profile'); await page.getByRole('button', { name: '编辑个人档案' }).waitFor();
    await closeMobileDock();
    await page.getByRole('button', { name: '编辑个人档案' }).click(); await page.locator('dialog').waitFor();
    assert('profile_form_populated', await page.getByLabel('姓名').inputValue() === '袁清和', 'Existing student values restored in editor');
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    assert('no_browser_errors', errors.length === 0, JSON.stringify(errors));
    fs.writeFileSync(path.join(out, 'ui-acceptance.json'), JSON.stringify({ date: new Date().toISOString(), checks }, null, 2));
    console.log('UI acceptance:', checks.length, 'passed.');
  } finally { await browser.close(); }
})().catch(e => { fs.writeFileSync(path.join(out, 'ui-acceptance.json'), JSON.stringify({ checks, error: e.message }, null, 2)); console.error(e.message); process.exitCode = 1; });
