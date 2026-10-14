"""Export SQL for course review; never export business rows or passwords.
The runnable employment schema is managed by Flyway, not the merged study SQL.
"""
from pathlib import Path
import re
import json
import importlib.util
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def main():
    folder = ROOT / 'database/employment'
    folder.mkdir(parents=True, exist_ok=True)
    parts = [
        '-- Teaching reference: run only in a new empty MySQL 8.0.16+ schema.\n',
        '-- Actual deployment uses Flyway V1-V4; this reference does not create Flyway history.\n',
        '-- No real account records, passwords or business data are exported.\n\n'
    ]
    migrations = sorted((ROOT / 'course-app/src/main/resources/db/migration').glob('V*.sql'))
    for migration in migrations:
        parts.append('\n-- SOURCE: '+migration.name+'\n'+migration.read_text(encoding='utf-8')+'\n')
    (folder/'schema-for-study.sql').write_text(''.join(parts), encoding='utf-8')
    snapshot = subprocess.run(['docker','exec','interview-submit-postgres','pg_dump',
        '-U','postgres','-d','interview_guide','--schema-only','--no-owner','--no-privileges'],
        capture_output=True, check=True)
    schema = snapshot.stdout.decode('utf-8')
    # pg_dump adds a random psql guard token, which is not schema or a secret.
    schema = re.sub(r'^\\(?:un)?restrict .*\n', '', schema, flags=re.M)
    if re.search(r'^COPY .* FROM stdin|^INSERT INTO ', schema, re.M):
        raise RuntimeError('Unexpected data in schema-only export')
    pg_folder = ROOT / 'database/postgres'
    pg_folder.mkdir(parents=True, exist_ok=True)
    (pg_folder/'schema-for-study.sql').write_text('-- Read-only schema reference. No business rows exported.\n'+schema, encoding='utf-8')
    importer = importlib.util.spec_from_file_location('public_market_import', ROOT/'scripts/import-resume-market.py')
    module = importlib.util.module_from_spec(importer)
    importer.loader.exec_module(module)
    rows = json.loads((ROOT/'scraper/resume_template/templates.json').read_text(encoding='utf-8'))
    (pg_folder/'resume-market-seed.sql').write_text('-- Public template metadata only; no user or private file records.\n'+module.build_sql(rows)+'\n', encoding='utf-8')
    print('Exported MySQL migration reference and PostgreSQL schema-only reference.')


if __name__ == '__main__':
    main()
