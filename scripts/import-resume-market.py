"""Import the 65 public source templates through docker psql, without user data.

Only missing source IDs are inserted. Existing templates and Word registrations
are left intact; BundledResumeTemplates configures the two download assets.
"""
import json
import argparse
import re
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def literal(value):
    if value is None:
        return 'NULL'
    return "'" + str(value).replace("'", "''") + "'"


def build_sql(rows):
    statements = ['BEGIN;']
    for row in rows:
        source_id = int(row['source_id'])
        # Match the existing importer and use repository-local preview URLs.
        tags = row.get('style_tags', [])
        fields = [source_id, row.get('title', ''), json.dumps(tags, ensure_ascii=False),
                  row.get('category_slug'), int(row.get('usage_count', 0) or 0),
                  f'/resume-template-previews/{source_id}.png',
                  f'images/{source_id}.png', row.get('detail_url')]
        values = [str(fields[0]), literal(fields[1]), literal(fields[2]), literal(fields[3]),
                  str(fields[4]), literal(fields[5]), literal(fields[6]), literal(fields[7])]
        statements.append('INSERT INTO resume_template (source_id,title,style_tags,category_slug,usage_count,cover_url,local_image_path,detail_url,created_at,updated_at) VALUES ('+','.join(values)+',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT (source_id) DO NOTHING;')
    statements.append('COMMIT;')
    return '\n'.join(statements)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', default='interview_guide')
    parser.add_argument('--container', default='interview-submit-postgres')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', args.database):
        raise ValueError('Unsafe PostgreSQL database identifier')
    rows = json.loads((ROOT/'scraper/resume_template/templates.json').read_text(encoding='utf-8'))
    result = subprocess.run(['docker','exec','-i',args.container,'psql',
        '-U','postgres','-d',args.database,'-v','ON_ERROR_STOP=1'],
        input=build_sql(rows), text=True, encoding='utf-8', capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-1600:])
    print(f'Processed {len(rows)} public templates; existing records preserved. Bundled downloads remain managed by backend startup.')


if __name__ == '__main__':
    main()
