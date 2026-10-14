// Deployment regression: stop only the module, then recover with the default
// whole-project startup command. Never deletes containers, volumes or records.
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
const root = path.resolve(__dirname, '..'), out = path.join(root, 'verification/employment');
const checks = [];
async function command(program, args) {
  return run(program, args, { cwd: root, windowsHide: true, timeout: 240000, maxBuffer: 2 * 1024 * 1024 });
}
function assert(name, condition, evidence) {
  checks.push({ case: name, result: condition ? 'PASS' : 'FAIL', evidence });
  if (!condition) throw Error(name + ': ' + evidence);
}
async function auth(name) {
  const vault = JSON.parse(fs.readFileSync(path.join(out, 'demo-credentials.json'), 'utf8'));
  const response = await fetch('http://127.0.0.1:18181/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, password: vault[name].password }),
  });
  const envelope = await response.json();
  if (envelope.code !== 200) throw Error('Existing demo account authentication failed');
  return envelope.data;
}
async function dataCounts() {
  return (await command('docker', ['exec', 'interview-submit-course-mysql', 'sh', '-c',
    'mysql -u root -p"$MYSQL_ROOT_PASSWORD" --batch --skip-column-names employment_course -e "SELECT COUNT(*) FROM applications; SELECT COUNT(*) FROM employment_results;"'])).stdout.trim();
}
async function start() {
  await command('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/start-project.ps1')]);
}
(async () => {
  const services = (await command('docker', ['compose', 'config', '--services'])).stdout.trim().split(/\s+/);
  assert('default_start_includes_module', services.includes('course-app') && services.includes('course-mysql'), 'Ordinary Compose config includes both module services');
  const before = await dataCounts(), student = await auth('course_demo_student_30');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let stopped = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
    async function login(identity) {
      await page.goto('http://127.0.0.1:18181/login');
      await page.evaluate(identity => {
        localStorage.setItem('auth_token', identity.token);
        localStorage.setItem('auth_user_id', String(identity.userId));
        localStorage.setItem('auth_username', identity.username);
      }, identity);
    }
    await login(student);
    stopped = true;
    await command('docker', ['compose', 'stop', 'course-app', 'course-mysql']);
    const unavailable = await fetch('http://127.0.0.1:18181/api/course/health');
    const error = await unavailable.json();
    assert('module_outage_json', unavailable.status === 503 && error.code === 503 && error.message.includes('就业服务暂不可用'), 'Proxy responds with actionable JSON 503');
    await page.goto('http://127.0.0.1:18181/employment');
    await page.getByRole('alert').getByText('就业服务暂不可用，请稍后点击重新连接', { exact: true }).waitFor();
    assert('outage_keeps_login', await page.evaluate(token => localStorage.getItem('auth_token') === token, student.token), 'Module outage preserves the original login token');
    const headers = { Authorization: 'Bearer ' + student.token };
    const me = await (await fetch('http://127.0.0.1:18181/api/auth/me', { headers })).json();
    const templates = await (await fetch('http://127.0.0.1:18181/api/resume-templates', { headers })).json();
    assert('legacy_site_survives', me.code === 200 && templates.code === 200 && templates.data.length === 65, 'Original authentication and all 65 templates remain available');
    await start(); stopped = false;
    await page.getByRole('button', { name: '重新连接', exact: true }).click();
    await page.getByRole('heading', { name: '我的求职流程', exact: true }).waitFor();
    assert('student_retry_recovers', await page.getByRole('alert').count() === 0 && page.url().endsWith('/employment/student'), 'Retry restores the student dashboard and menus');
    await page.screenshot({ path: path.join(out, 'recovered-student-desktop.png'), fullPage: true });
    await login(await auth('course_demo_staff'));
    await page.goto('http://127.0.0.1:18181/employment');
    await page.getByRole('heading', { name: '教师就业指导流程', exact: true }).waitFor();
    assert('teacher_dashboard_recovers', page.url().endsWith('/employment/teacher') && await page.getByRole('alert').count() === 0, 'Teacher dashboard restored by default startup');
    await page.screenshot({ path: path.join(out, 'recovered-teacher-desktop.png'), fullPage: true });
    assert('data_survives_recovery', before === await dataCounts(), 'Application and hiring row counts remain unchanged');
    fs.writeFileSync(path.join(out, 'deployment-recovery.json'), JSON.stringify({ date: new Date().toISOString(), checks }, null, 2));
    console.log('Deployment recovery:', checks.length, 'checks passed.');
  } finally {
    if (stopped) await start();
    await browser.close();
  }
})().catch(error => {
  fs.writeFileSync(path.join(out, 'deployment-recovery.json'), JSON.stringify({ date: new Date().toISOString(), checks, error: error.message }, null, 2));
  console.error(error.message); process.exitCode = 1;
});
