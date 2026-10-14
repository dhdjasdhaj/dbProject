/** Real download acceptance: verifies ordinary-user access, filenames and original bytes. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const project = path.resolve(__dirname, '..');
const base = process.env.TEST_BASE_URL || 'http://localhost:18181';
const out =
  process.env.TEST_OUTPUT_DIR ||
  path.join(project, 'verification', 'template-downloads');
const samples = [
  {
    sourceId: 1000,
    title: '秋招医护类求职简历',
    file: 'healthcare-autumn.docx',
  },
  {
    sourceId: 1001,
    title: '有多颜色模板，下放链接进群',
    file: 'multicolor.docx',
  },
];
const username = 'wordcheck_' + crypto.randomBytes(6).toString('hex');
const report = { checks: [], browserErrors: [] };
let browser, account;
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const pass = (name) => {
  report.checks.push(name);
  console.log('PASS ' + name);
};
async function api(route, token, body, code = 200) {
  const response = await fetch(base + route, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  assert.equal(result.code, code, route);
  return result.data;
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  try {
    account = await api('/api/auth/register', null, {
      username,
      password: crypto.randomBytes(18).toString('hex'),
    });
    assert.equal(account.role, 'USER');
    const templates = await api('/api/resume-templates', account.token);
    assert.equal(templates.length, 65);
    assert.deepEqual(
      templates.slice(0, 2).map((t) => [t.sourceId, t.title]),
      samples.map((t) => [t.sourceId, t.title]),
    );
    pass(
      'All category has 65 cards; supplied Word templates occupy the first two positions in order',
    );
    await api(
      `/api/resume-templates/${templates[0].id}/download`,
      null,
      null,
      401,
    );
    await api(
      '/api/resume-templates/9223372036854775807/download',
      account.token,
      null,
      10001,
    );
    await api(
      `/api/resume-templates/${templates[2].id}/download`,
      account.token,
      null,
      10002,
    );
    pass(
      'Login required; missing template and other unconfigured templates return correct errors',
    );
    for (const [index, sample] of samples.entries()) {
      const response = await fetch(
        `${base}/api/resume-templates/${templates[index].id}/download`,
        { headers: { Authorization: 'Bearer ' + account.token } },
      );
      assert.equal(response.status, 200);
      assert.ok(
        response.headers
          .get('content-type')
          .startsWith(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ),
      );
      assert.ok(
        response.headers.get('content-disposition').startsWith('attachment;'),
      );
      const filename = /filename\*=UTF-8''([^;]+)/i.exec(
        response.headers.get('content-disposition'),
      )?.[1];
      assert.equal(decodeURIComponent(filename), sample.title + '.docx');
      const bytes = Buffer.from(await response.arrayBuffer());
      const original = fs.readFileSync(
        path.join(
          project,
          'app/src/main/resources/resume-templates/word',
          sample.file,
        ),
      );
      assert.equal(bytes.length, original.length);
      assert.equal(hash(bytes), hash(original));
      fs.writeFileSync(path.join(out, sample.file), bytes);
    }
    pass(
      'Both APIs return DOCX attachments with original Chinese filenames and byte-for-byte original contents',
    );
    const { chromium } = require(
      process.env.PLAYWRIGHT_MODULE_PATH ||
        'C:/Users/stc_0/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
    );
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    page.on('pageerror', (e) => report.browserErrors.push(e.message));
    await page.goto(base + '/login');
    await page.evaluate((user) => {
      localStorage.setItem('auth_token', user.token);
      localStorage.setItem('auth_user_id', String(user.userId));
      localStorage.setItem('auth_username', user.username);
    }, account);
    await page.goto(base + '/resume-templates');
    await page.waitForFunction(
      () => document.querySelectorAll('article').length === 65,
    );
    for (const [index, sample] of samples.entries()) {
      const card = page.locator('article').nth(index);
      assert.equal(await card.locator('h3').textContent(), sample.title);
      await card.locator('img').scrollIntoViewIfNeeded();
      await page.waitForFunction((i) => {
        const img = document.querySelectorAll('article img')[i];
        return img && img.complete && img.naturalWidth > 0;
      }, index);
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        card.getByRole('button', { name: '下载', exact: true }).click(),
      ]);
      assert.equal(download.suggestedFilename(), sample.title + '.docx');
      const target = path.join(out, 'browser-' + sample.file);
      await download.saveAs(target);
      assert.equal(
        hash(fs.readFileSync(target)),
        hash(
          fs.readFileSync(
            path.join(
              project,
              'app/src/main/resources/resume-templates/word',
              sample.file,
            ),
          ),
        ),
      );
    }
    pass(
      'Real Chrome button clicks download both original Word files as an ordinary user',
    );
    await page
      .locator('article')
      .nth(2)
      .getByRole('button', { name: '下载', exact: true })
      .click();
    await page.getByText('Word模板下载功能暂未开放', { exact: true }).waitFor();
    pass(
      'Unavailable template displays an error message instead of downloading a JSON file',
    );
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => scrollTo(0, 0));
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: path.join(out, 'market-' + width + '.png'),
      });
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    const [mobile] = await Promise.all([
      page.waitForEvent('download'),
      page
        .locator('article')
        .first()
        .getByRole('button', { name: '下载', exact: true })
        .click(),
    ]);
    assert.equal(mobile.suggestedFilename(), samples[0].title + '.docx');
    pass('Desktop and 390/320px layouts fit; mobile download works');
    await page.reload();
    await page.waitForFunction(
      () => document.querySelectorAll('article').length === 65,
    );
    assert.equal(
      await page.locator('article').first().locator('h3').textContent(),
      samples[0].title,
    );
    assert.equal(report.browserErrors.length, 0);
    report.passed = true;
  } catch (e) {
    report.passed = false;
    report.failure = e.stack;
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (account) {
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
          '-v',
          'ON_ERROR_STOP=1',
          '-c',
          `DELETE FROM users WHERE username='${username}' AND id=${Number(account.userId)};`,
        ],
        { stdio: 'pipe' },
      );
      report.temporaryAccountRemoved = true;
    }
    fs.writeFileSync(
      path.join(out, 'report.json'),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  }
})();
