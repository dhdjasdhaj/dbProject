"""Check Git upload candidates without printing private credential values.

No commit, staging, remote write or database operation is performed.
"""
from pathlib import Path
from datetime import datetime, timedelta, timezone
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    'README.md', '.env.example', 'DEPLOYMENT.md',
    'docker-compose.yml', 'docker-compose.override.yml', 'docker-compose.employment.yml',
    'frontend/nginx.conf', 'frontend/src/course/EmploymentDock.tsx',
    'frontend/src/course/employmentDock.css', 'frontend/src/course/EmploymentPage.tsx',
    'course-app/Dockerfile', 'course-app/build.gradle', 'settings.gradle',
    'docker/employment/Dockerfile.runtime', 'scripts/init-local-config.ps1',
    'scripts/start-project.ps1', 'scripts/deploy-employment.ps1',
    'scripts/employment_acceptance.py', 'scripts/realistic_employment_samples.py',
    'scripts/import-resume-market.py', 'scripts/export-database-definitions.py',
    'database/README.md', 'database/employment/schema-for-study.sql',
    'database/postgres/schema-for-study.sql', 'docs/project-handoff.md',
    'database/postgres/resume-market-seed.sql',
    'docs/github-upload.md', 'docs/employment/data-dictionary.md',
    'docs/employment/course-report.md', 'docs/employment/course-report.pdf',
    'app/src/main/resources/resume-templates/word/healthcare-autumn.docx',
    'app/src/main/resources/resume-templates/word/multicolor.docx',
    'scraper/resume_template/templates.json',
]


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, check=True).stdout


def main():
    names = {name for name in git('ls-files', '--cached', '--others', '--exclude-standard', '-z').decode('utf-8').split('\0') if name}
    migrations = sorted((ROOT/'course-app/src/main/resources/db/migration').glob('V*.sql'))
    required = REQUIRED + [path.relative_to(ROOT).as_posix() for path in migrations]
    missing = [name for name in required if name not in names or not (ROOT/name).is_file()]
    secrets = []
    env_file = ROOT/'.env'
    if env_file.exists():
        for line in env_file.read_text(encoding='utf-8').splitlines():
            if '=' not in line or line.lstrip().startswith('#'):
                continue
            key,value = line.split('=',1)
            value = value.strip().strip('"').strip("'")
            if any(word in key for word in ('PASSWORD','SECRET','API_KEY','TOKEN')) and len(value) >= 12:
                secrets.append((key,value))
    findings = []
    total_size = 0
    for name in sorted(names):
        path = ROOT/name
        if not path.is_file():
            continue
        size = path.stat().st_size
        total_size += size
        parts = Path(name).parts
        if any(part in ('.idea','.deployment','verification','backups','node_modules','__pycache__') for part in parts) or parts[0] in ('tmp','output','data'):
            findings.append({'file':name,'reason':'Local/private/generated file is still tracked or uploadable'})
        if (path.name.startswith('.env') and path.name != '.env.example') or name.endswith(('.dump','.sql.gz','.backup','.log')):
            findings.append({'file':name,'reason':'Private configuration, database backup or runtime log'})
        if size > 100 * 1024 * 1024:
            findings.append({'file':name,'reason':'File exceeds this project upload budget of 100 MiB'})
        if size > 8 * 1024 * 1024 or path.suffix.lower() in ('.pdf','.docx','.png','.jpg','.jpeg','.gif','.woff','.woff2','.jar'):
            continue
        try:
            content = path.read_text(encoding='utf-8')
        except (UnicodeError,OSError):
            continue
        for key,value in secrets:
            if value in content:
                findings.append({'file':name,'reason':'Contains a private value from local .env','environmentKey':key})
        # Report only the file, never the candidate token.
        if re.search(r'AIza[0-9A-Za-z_-]{35}|sk-(?:or-v1-|proj-)?[A-Za-z0-9_-]{32,}', content):
            findings.append({'file':name,'reason':'Potential hardcoded API key pattern; inspect locally'})
    result = {
        'checkedAt':datetime.now(timezone(timedelta(hours=8))).isoformat(),
        'result':'PASS' if not missing and not findings else 'FAIL',
        'candidateFiles':len(names),'candidateMiB':round(total_size/1024/1024,2),
        'requiredFiles':len(required),'missingRequiredFiles':missing,'findings':findings,
        'scope':'Current tracked and unignored working-tree files only; does not audit commit history or binary document contents.',
    }
    output = ROOT/'verification/github-upload-check.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result['result'] != 'PASS':
        raise SystemExit(1)


if __name__ == '__main__':
    main()
