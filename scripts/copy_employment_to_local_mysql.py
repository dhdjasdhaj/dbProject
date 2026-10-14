"""Copy the course schema to an EMPTY local MySQL database, leaving Docker intact.

Set EMPLOYMENT_TARGET_MYSQL_PASSWORD in the current process; never put a password
in command-line arguments. Only a new, explicitly named schema is accepted.
Example: python scripts/copy_employment_to_local_mysql.py --user 数据库项目
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verification/employment'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=3306)
    parser.add_argument('--database', default='employment_course')
    parser.add_argument('--user', required=True)
    parser.add_argument('--mysql', default=r'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,63}', args.database):
        raise ValueError('Database name must be an ASCII SQL identifier')
    password = os.environ.get('EMPLOYMENT_TARGET_MYSQL_PASSWORD')
    if not password:
        raise RuntimeError('Set EMPLOYMENT_TARGET_MYSQL_PASSWORD in the current process')
    env = dict(os.environ, MYSQL_PWD=password)
    command = [args.mysql, '--host='+args.host, '--port='+str(args.port),
               '--user='+args.user, '--default-character-set=utf8mb4',
               '--batch', '--skip-column-names']

    def local(statement, database=None):
        result = subprocess.run(command + ([database] if database else []),
                                input=statement.encode('utf-8'), env=env, capture_output=True)
        if result.returncode:
            raise RuntimeError(result.stderr.decode('utf-8', errors='replace')[-1600:])
        return result.stdout.decode('utf-8').strip()

    exists = local("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='"+args.database+"';")
    if exists != '0':
        raise RuntimeError('Target database already exists. Refusing to replace it; use a new schema name.')
    version = local('SELECT VERSION();')
    parts = re.match(r'(\d+)\.(\d+)\.(\d+)', version)
    if not parts or int(parts[1]) != 8 or tuple(map(int, parts.groups())) < (8, 0, 16):
        raise RuntimeError('This schema requires MySQL 8.0.16 or later for enforced CHECK constraints')
    # All business rows and views are copied from a consistent source snapshot.
    source = subprocess.run(['docker','exec','interview-submit-course-mysql','sh','-c',
        'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF employment_course'], capture_output=True)
    if source.returncode:
        raise RuntimeError('Source MySQL backup failed')
    OUT.mkdir(parents=True, exist_ok=True)
    backup = OUT / 'backup/local-copy-source.sql'
    backup.parent.mkdir(parents=True, exist_ok=True)
    backup.write_bytes(source.stdout)
    portable = re.sub(r'DEFINER=`[^`]*`@`[^`]*`', 'DEFINER=CURRENT_USER', source.stdout.decode('utf-8'))
    local('CREATE DATABASE `'+args.database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;')
    local(portable, args.database)
    checks = {
        'businessTables': "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' AND table_name<>'flyway_schema_history';",
        'columns': "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name<>'flyway_schema_history' AND table_name NOT LIKE 'v\\_%';",
        'uncommentedTables': "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' AND table_name<>'flyway_schema_history' AND table_comment='';",
        'uncommentedColumns': "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name<>'flyway_schema_history' AND table_name NOT LIKE 'v\\_%' AND column_comment='';",
        'companies': 'SELECT COUNT(*) FROM companies;',
        'jobs': 'SELECT COUNT(*) FROM jobs;',
        'students': "SELECT COUNT(*) FROM students s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id WHERE r.code='USER' AND s.profile_state='COMPLETE';",
        'applications': 'SELECT COUNT(*) FROM applications;',
        'interviewRounds': 'SELECT COUNT(*) FROM interview_rounds;',
        'scores': 'SELECT COUNT(*) FROM interview_scores;',
        'employmentResults': 'SELECT COUNT(*) FROM employment_results;',
        'resumeFiles': 'SELECT COUNT(*) FROM resume_files;',
        'applicationView': 'SELECT COUNT(*) FROM v_application_detail;',
        'jobView': 'SELECT COUNT(*) FROM v_job_recruitment_summary;',
        'studentView': 'SELECT COUNT(*) FROM v_student_hiring_summary;',
        'migrations': 'SELECT COUNT(*) FROM flyway_schema_history WHERE success=1;'
    }
    from employment_acceptance import sql
    expected = {key: int(sql(query).stdout.strip()) for key,query in checks.items()}
    actual = {key: int(local(query, args.database)) for key,query in checks.items()}
    if expected != actual:
        raise AssertionError('Source and target data, comments or view counts differ')
    evidence = dict(result='PASS', host=args.host, port=args.port, database=args.database,
                    user=args.user, version=version, verifiedAt=datetime.now(timezone.utc).isoformat(),
                    counts=actual, sourceBackupSha256=hashlib.sha256(source.stdout).hexdigest(),
                    websiteDatabaseChanged=False, attachmentsCopied=False,
                    note='Attachment metadata only; binary files remain in the existing private MinIO bucket.')
    (OUT/'local-mysql-copy.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(evidence, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
