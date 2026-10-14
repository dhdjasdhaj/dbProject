"""Explicit, repeatable demo/acceptance operations. Uses only Python's standard library.
Run: python scripts/employment_acceptance.py seed|verify|performance|backup
Credentials and raw test artifacts stay in ignored verification/employment.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import argparse, json, secrets, subprocess, time, os, re, hashlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'verification/employment'
OUT.mkdir(parents=True, exist_ok=True)
LEGACY = 'http://127.0.0.1:18182'
COURSE = 'http://127.0.0.1:18184'
VAULT = OUT / 'demo-credentials.json'
MANIFEST = OUT / 'demo-manifest.json'

def http(method, path, data=None, token=None, base=COURSE, raw=False):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    payload = None if data is None else json.dumps(data, ensure_ascii=False).encode()
    req = Request(base + path, payload, headers, method=method)
    try:
        with urlopen(req, timeout=30) as response:
            content = response.read()
            return (content, dict(response.headers)) if raw else json.loads(content)
    except HTTPError as e:
        return {'code': e.code, 'message': str(e)}

def ok(method, path, data=None, token=None, base=COURSE):
    result = http(method, path, data, token, base)
    if result.get('code') != 200:
        raise RuntimeError(f'{method} {path}: {result.get("code")} {result.get("message")}')
    return result['data']

def upload(content, filename, token):
    boundary='course-'+secrets.token_hex(12)
    body=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+content+f'\r\n--{boundary}--\r\n'.encode()
    req=Request(COURSE+'/api/course/files',body,{'Content-Type':'multipart/form-data; boundary='+boundary,'Authorization':'Bearer '+token},method='POST')
    with urlopen(req,timeout=30) as response:return json.loads(response.read())

def sql(statement, database='employment_course', allow_error=False, container='interview-submit-course-mysql'):
    if not re.fullmatch(r'[a-zA-Z0-9_]+', database): raise ValueError('Unsafe database name')
    command = ['docker', 'exec', '-i', container, 'sh', '-c', 'exec mysql -h127.0.0.1 -u root -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 --batch --skip-column-names ' + database]
    result = subprocess.run(command, input=statement, text=True, encoding='utf-8', capture_output=True)
    if result.returncode and not allow_error: raise RuntimeError(result.stderr[-1000:])
    return result

def vault():
    return json.loads(VAULT.read_text(encoding='utf-8')) if VAULT.exists() else {}

def account(name):
    saved = vault()
    if name not in saved:
        password = secrets.token_urlsafe(24)
        created = ok('POST', '/api/auth/register', {'username': name, 'password': password}, base=LEGACY)
        saved[name] = {'username': name, 'password': password, 'userId': created['userId']}
        VAULT.write_text(json.dumps(saved, ensure_ascii=False, indent=2), encoding='utf-8')
    auth = ok('POST', '/api/auth/login', {'username': name, 'password': saved[name]['password']}, base=LEGACY)
    return auth

def admin_account():
    name = 'course_demo_admin'
    auth = account(name)
    # Explicit seed: elevate only the demo account created/recorded by this script.
    uid = int(auth['userId'])
    statement = f"UPDATE users SET role='ADMIN' WHERE id={uid} AND username='course_demo_admin';"
    result = subprocess.run(['docker', 'exec', '-i', 'interview-submit-postgres', 'psql', '-U', 'postgres', '-d', 'interview_guide', '-v', 'ON_ERROR_STOP=1'], input=statement, text=True, capture_output=True)
    if result.returncode: raise RuntimeError('Cannot initialize explicitly named demo administrator')
    return account(name)

def future(days=7): return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()

def seed():
    if MANIFEST.exists():
        existing = json.loads(MANIFEST.read_text(encoding='utf-8'))
        admin = account('course_demo_admin')
        company = ok('GET', '/api/course/companies?q=DEMO-C001', token=admin['token'])
        if company['total']:
            print('Demo data already present; no duplicate seed or password reset.')
            return existing
        raise RuntimeError('Manifest exists but demo data is absent; restore the MySQL backup or remove the stale manifest explicitly.')
    admin = admin_account(); at = admin['token']
    staff = account('course_demo_staff')
    ok('PUT', f'/api/course/admin/users/{staff["userId"]}', {'role': 'STAFF', 'enabled': True}, at)
    st = staff['token']
    manifest = {'createdAt': datetime.now(timezone.utc).isoformat(), 'companies': [], 'jobs': [], 'students': [], 'applications': [], 'interviews': [], 'results': []}
    industries = ['信息技术', '医疗健康', '教育服务', '智能制造', '金融服务', '文化传媒', '电子商务', '建筑设计', '物流服务', '科研服务']
    titles = ['前端开发工程师', '数据分析助理', '护理岗位', '医学检验助理', '教学助理', '课程运营', '自动化工程师', '质量管理', '财务助理', '客户服务', '内容编辑', '视觉设计', '电商运营', '产品助理', '工程助理', '建筑设计助理', '物流专员', '供应链助理', '实验助理', '科研行政助理']
    for i in range(10):
        company = ok('POST', '/api/course/companies', {'code': f'DEMO-C{i+1:03}', 'name': f'课程演示·{industries[i]}企业{i+1:02}', 'industry': industries[i], 'contact': '演示联系人（非真实企业）', 'description': '数据库课程虚构案例，仅用于演示。', 'enabled': True}, st)
        manifest['companies'].append(company['id'])
        for j in range(2):
            job = ok('POST', '/api/course/jobs', {'companyId': company['id'], 'title': titles[i*2+j], 'category': industries[i], 'city': ['北京', '上海', '杭州', '深圳'][i%4], 'description': '【课程演示岗位】具有相关专业基础，能够沟通协作；所有信息为虚构示例。', 'plannedCount': 5, 'deadline': future(180), 'status': 'OPEN'}, st)
            manifest['jobs'].append(job['id'])
    for i in range(30):
        user = account(f'course_demo_student_{i+1:02}'); token = user['token']
        profile = ok('PUT', '/api/course/students/me', {'studentNo': f'DEMO2027{i+1:03}', 'fullName': f'演示学生{i+1:02}', 'college': ['信息工程学院', '医护学院', '管理学院'][i%3], 'major': ['软件工程', '护理学', '工商管理'][i%3], 'graduationYear': 2027, 'contact': '课程演示，未填写真实联系方式'}, token)
        manifest['students'].append({'externalId': user['userId'], 'id': profile['id'], 'username': user['username']})
        for j in range(2):
            app = ok('POST', '/api/course/applications', {'jobId': manifest['jobs'][(i+j*7)%20], 'note': '【课程演示】希望通过实践提升岗位能力。'}, token)
            manifest['applications'].append({'id': app['id'], 'student': i, 'slot': j})
    for item in manifest['applications']:
        i, j, key = item['student'], item['slot'], item['id']
        if i >= 25: continue
        ok('POST', f'/api/course/applications/{key}/review', token=st)
        if i < 12 and j == 1:
            token = account(f'course_demo_student_{i+1:02}')['token']
            ok('POST', f'/api/course/applications/{key}/withdraw', token=token)
        elif i < 20:
            interview = ok('POST', '/api/course/interviews', {'applicationId': key, 'scheduledAt': future(3), 'location': '课程演示会议室', 'interviewer': '演示面试官'}, st)
            manifest['interviews'].append(interview['id'])
            ok('POST', f'/api/course/interviews/{interview["id"]}/scores', {'communication': 20+i%10, 'professional': 26+i%14, 'fit': 20+i%10, 'comment': '【课程演示评分】表达清晰，可继续提升案例分析与专业实践能力。'}, st)
            if 12 <= i < 16 and j == 1:
                ok('POST', f'/api/course/applications/{key}/reject', {'note': '【课程演示】当前岗位匹配不足，建议补充项目经历。'}, st)
            elif i >= 16:
                extra = ok('POST', '/api/course/interviews', {'applicationId': key, 'scheduledAt': future(5), 'location': '课程演示二轮面试', 'interviewer': '演示复试官'}, st)
                manifest['interviews'].append(extra['id'])
        elif i < 23 and j == 1:
            ok('POST', f'/api/course/applications/{key}/reject', {'note': '【课程演示】资料与岗位要求不符。'}, st)
    for item in manifest['applications']:
        if item['student'] < 12 and item['slot'] == 0:
            result = ok('POST', '/api/course/employment-results', {'applicationId': item['id'], 'startDate': '2027-07-01', 'remarks': '【课程演示】最终录用登记，不代表真实就业结果。'}, st)
            manifest['results'].append(result['id'])
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    attach_demo()
    from realistic_employment_samples import refresh
    refresh()
    print(json.dumps({k: len(v) for k, v in manifest.items() if isinstance(v, list)}, ensure_ascii=False))
    return manifest

def attach_demo():
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    for i,filename in [(29,'healthcare-autumn.docx'),(30,'multicolor.docx')]:
        user=account(f'course_demo_student_{i:02}');token=user['token'];me=ok('GET','/api/course/me',token=token)
        expected=next(s for s in manifest['students'] if s['username']==user['username'])
        if me['profile']['id']!=expected['id']:raise ValueError('Demo ownership mismatch')
        existing=ok('GET','/api/course/files',token=token)['items']
        target=next((f for f in existing if f['originalName']==f'demo-resume-{i}.docx'),None)
        if target is None:
            result=upload((ROOT/'app/src/main/resources/resume-templates/word'/filename).read_bytes(),f'demo-resume-{i}.docx',token)
            if result['code']!=200:raise RuntimeError(result['message'])
            target=result['data']
        sid=int(me['profile']['id']);fid=int(target['id'])
        sql(f"UPDATE applications SET resume_file_id={fid} WHERE student_id={sid} AND status='SUBMITTED' AND resume_file_id IS NULL AND note LIKE '【课程%';")
    print('Two demo resume attachments are available to teachers.')

def verify():
    seed(); admin = account('course_demo_admin'); at = admin['token']
    staff = account('course_demo_staff'); st = staff['token']
    tag = secrets.token_hex(4)
    students = [account(f'course_verify_{tag}_{i}') for i in range(1,4)]
    results = []; start = time.perf_counter()
    def record(name, passed, evidence):
        if not passed: raise AssertionError(f'{name}: {evidence}')
        results.append({'case': name, 'result': 'PASS', 'evidence': evidence, 'time': datetime.now(timezone.utc).isoformat()})
        print('PASS', name)
    record('missing_token', http('GET', '/api/course/me')['code'] == 401, 'Unauthenticated access rejected')
    record('invalid_token', http('GET', '/api/course/me', token='not-a-jwt')['code'] == 401, 'Legacy Result business code verified')
    first = ok('GET', '/api/course/me', token=students[0]['token'])
    record('student_cannot_admin', http('GET', '/api/course/admin/users', token=students[0]['token'])['code'] == 403, 'Backend authorization')
    record('admin_inherits_role', ok('GET', '/api/course/me', token=at)['role'] == 'ADMIN', 'Role comes from legacy service')
    record('student_portal_menus',all(m['portal']=='STUDENT' and '/teacher' not in m['path'] for m in ok('GET','/api/course/menus',token=students[0]['token'])),'Student receives only personal portal entries')
    record('teacher_portal_menus',all(m['portal']=='TEACHER' and '/student/' not in m['path'] for m in ok('GET','/api/course/menus',token=st)),'Teacher receives management entries only')
    record('student_directory_denied',http('GET','/api/course/students',token=students[0]['token'])['code']==403,'Student cannot query school student profiles')
    record('staff_is_module_only', ok('GET', '/api/auth/me', token=st, base=LEGACY)['role'] == 'USER' and ok('GET', '/api/course/me', token=st)['role'] == 'STAFF', 'Legacy USER and course STAFF')
    for i,user in enumerate(students):
        ok('PUT', '/api/course/students/me', {'studentNo': f'VERIFY2099{tag}{i+1}', 'fullName': f'验收学生{i+1}', 'college': '验收测试学院', 'major': '事务验证', 'graduationYear': 2099, 'contact': '仅测试'}, user['token'])
    source=ROOT/'app/src/main/resources/resume-templates/word/multicolor.docx'
    uploaded=upload(source.read_bytes(),'verification-resume.docx',students[0]['token'])
    record('valid_docx_upload',uploaded['code']==200,'Real DOCX content validated and stored')
    fileid=int(uploaded['data']['id'])
    content,headers=http('GET',f'/api/course/files/{fileid}/download',token=students[0]['token'],raw=True)
    record('file_download_integrity',hashlib.sha256(content).digest()==hashlib.sha256(source.read_bytes()).digest() and 'filename' in headers.get('Content-Disposition',''),'Bytes and attachment filename preserved')
    record('file_ownership',http('GET',f'/api/course/files/{fileid}/download',token=students[1]['token'])['code']==403,'Student B cannot download Student A attachment')
    record('invalid_file_content',upload(b'not a word file','fake.docx',students[0]['token'])['code']==400,'Renaming arbitrary bytes to DOCX is rejected')
    object_key=sql(f'SELECT object_key FROM resume_files WHERE id={fileid};').stdout.strip()
    try:
        urlopen('http://127.0.0.1:19004/employment-course/'+object_key,timeout=5)
        private=False
    except HTTPError as e:private=e.code==403
    record('private_storage_bucket',private,'Anonymous object download rejected by MinIO')
    company = ok('POST', '/api/course/companies', {'code': 'VERIFY-'+tag, 'name': '验收测试企业 '+tag, 'industry': '测试', 'contact': '测试专用', 'enabled': True}, st)
    job = ok('POST', '/api/course/jobs', {'companyId': company['id'], 'title': '最后一个名额测试 '+tag, 'category': '测试', 'city': '测试城市', 'description': '仅用于并发验收', 'plannedCount': 1, 'deadline': future(), 'status': 'OPEN'}, st)
    applications=[]; interviews=[]
    for user in students[:2]:
        app=ok('POST', '/api/course/applications', {'jobId': job['id'],'resumeFileId':fileid if user['userId']==students[0]['userId'] else None}, user['token']); applications.append(app)
        ok('POST', f'/api/course/applications/{app["id"]}/review', token=st)
        round_=ok('POST', '/api/course/interviews', {'applicationId': app['id'], 'scheduledAt': future(), 'location': '测试地点', 'interviewer': '测试面试官'}, st); interviews.append(round_)
    record('duplicate_application', http('POST', '/api/course/applications', {'jobId': job['id']}, students[0]['token'])['code'] == 409, 'Unique student/job pair')
    teacher_file,_=http('GET',f'/api/course/files/{fileid}/download',token=st,raw=True)
    record('teacher_application_attachment',hashlib.sha256(teacher_file).digest()==hashlib.sha256(source.read_bytes()).digest(),'Teacher can download a resume attached to an application')
    other=ok('GET', '/api/course/applications', token=students[1]['token'])
    record('application_ownership', all(row['id']!=applications[0]['id'] for row in other['items']), 'Student A application absent from Student B list')
    record('withdraw_ownership', http('POST', f'/api/course/applications/{applications[0]["id"]}/withdraw', token=students[1]['token'])['code'] == 403, 'Foreign withdrawal rejected')
    record('scores_ownership', http('GET', f'/api/course/interviews/{interviews[0]["id"]}/scores', token=students[1]['token'])['code'] == 403, 'Foreign score details rejected')
    record('student_cannot_score', http('POST', f'/api/course/interviews/{interviews[0]["id"]}/scores', {'communication': 20,'professional':30,'fit':20}, students[0]['token'])['code'] == 403, 'Scoring permission required')
    roundid=int(interviews[0]['id']); trigger='verify_fail_third_score'
    sql(f'DROP TRIGGER IF EXISTS {trigger}; CREATE TRIGGER {trigger} BEFORE INSERT ON interview_scores FOR EACH ROW SET NEW.score=IF(NEW.interview_id={roundid} AND NEW.criterion_id=3,-1,NEW.score);')
    try:
        outcome=http('POST',f'/api/course/interviews/{roundid}/scores',{'communication':20,'professional':30,'fit':20},st)
        remaining=sql(f'SELECT COUNT(*) FROM interview_scores WHERE interview_id={roundid}; SELECT status,total_score FROM interview_rounds WHERE id={roundid};').stdout.strip()
        record('score_transaction_rollback',outcome['code']==409 and remaining.startswith('0\nSCHEDULED\tNULL'),'Third INSERT forced to fail; zero scores and unchanged round')
    finally: sql(f'DROP TRIGGER IF EXISTS {trigger};')
    for round_ in interviews:
        ok('POST',f'/api/course/interviews/{round_["id"]}/scores',{'communication':20,'professional':30,'fit':20,'comment':'实际验收评分'},st)
    record('no_regrading',http('POST',f'/api/course/interviews/{roundid}/scores',{'communication':1,'professional':1,'fit':1},st)['code']==409,'Completed round immutable')
    def hiring(app): return http('POST','/api/course/employment-results',{'applicationId':app['id'],'startDate':'2099-07-01','remarks':'并发验收'},st)
    with ThreadPoolExecutor(max_workers=2) as pool: outcomes=list(pool.map(hiring,applications))
    record('last_quota_concurrency',sorted(x['code'] for x in outcomes)==[200,409],'Exactly one success and one quota rejection')
    winner=applications[next(i for i,x in enumerate(outcomes) if x['code']==200)]
    before=sql(f'SELECT filled_count FROM jobs WHERE id={job["id"]};').stdout.strip()
    repeated=hiring(winner)
    after=sql(f'SELECT filled_count FROM jobs WHERE id={job["id"]};').stdout.strip()
    record('idempotent_hiring',repeated['code']==200 and before==after=='1','Repeat does not increment quota')
    record('quota_matches_results',sql('SELECT COUNT(*) FROM jobs j WHERE j.filled_count<>(SELECT COUNT(*) FROM employment_results er JOIN applications ap ON ap.id=er.application_id WHERE ap.job_id=j.id);').stdout.strip()=='0','Counters equal registered hiring records')
    record('database_fk',sql('INSERT INTO applications(student_id,job_id) VALUES (999999999,999999999);',allow_error=True).returncode!=0,'Invalid parent rejected by MySQL')
    record('database_score_check',sql(f'UPDATE interview_scores SET score=31 WHERE interview_id={roundid} AND criterion_id=3;',allow_error=True).returncode!=0,'Out-of-range update rejected by CHECK')
    ok('PUT',f'/api/course/admin/users/{students[2]["userId"]}',{'role':'USER','enabled':False},at)
    record('module_disable_scope',http('GET','/api/course/me',token=students[2]['token'])['code']==403 and ok('GET','/api/auth/me',token=students[2]['token'],base=LEGACY)['role']=='USER','Module disabled; original authentication works')
    ok('PUT',f'/api/course/admin/users/{students[2]["userId"]}',{'role':'USER','enabled':True},at)
    record('admin_protection',http('PUT',f'/api/course/admin/users/{admin["userId"]}',{'role':'USER','enabled':False},at)['code']==409,'Cannot downgrade original administrator')
    grants=ok('GET','/api/course/admin/permissions',token=at)
    original=[g['code'] for g in grants if g['role']=='USER']
    try:
        ok('PUT','/api/course/admin/permissions/USER',{'permissions':['dashboard','profile','jobs.read']},at)
        menu=ok('GET','/api/course/menus',token=students[0]['token'])
        record('dynamic_menu_and_permission',not any(m['permissionCode']=='apply' for m in menu) and http('GET','/api/course/applications',token=students[0]['token'])['code']==403,'Menu and backend react to permission removal')
        record('role_escalation_blocked',http('PUT','/api/course/admin/permissions/USER',{'permissions':['dashboard','admin']},at)['code']==409,'Cannot assign admin permission to student')
    finally: ok('PUT','/api/course/admin/permissions/USER',{'permissions':original},at)
    summary=ok('GET','/api/course/reports/jobs?companyId='+str(company['id']),token=st)
    row=next(r for r in summary['items'] if r['id']==job['id'])
    record('report_no_join_multiplication',row['applicationCount']==2 and row['interviewCount']==2 and row['hiredCount']==1,'2 applications, 2 interviewed applicants, 1 hiring')
    csv,_=http('GET','/api/course/reports/jobs/export?companyId='+str(company['id']),token=st,raw=True)
    record('csv_export',csv.startswith(b'\xef\xbb\xbf') and len(csv)>100,'UTF-8 BOM and data rows')
    ok('PUT',f'/api/course/companies/{company["id"]}',{'code':company['code'],'name':'=SUM(1,2) 仅验收','industry':'测试','contact':'测试专用','description':'CSV 公式防护测试','enabled':True},st)
    protected,_=http('GET','/api/course/reports/jobs/export?companyId='+str(company['id']),token=st,raw=True)
    record('csv_formula_protection',b"\"'=SUM(1,2)" in protected,'Formula prefix neutralized and comma quoted')
    record('sort_allowlist',http('GET','/api/course/jobs?sort=id%3BDROP%20TABLE%20jobs',token=st)['code']==400,'Invalid sort rejected')
    record('template_regression',len(ok('GET','/api/resume-templates',token=students[0]['token'],base=LEGACY))==65,'Original 65 templates retained')
    templates=ok('GET','/api/resume-templates',token=students[0]['token'],base=LEGACY)
    for index, filename in enumerate(['healthcare-autumn.docx','multicolor.docx']):
        content,_=http('GET',f'/api/resume-templates/{templates[index]["id"]}/download',token=students[0]['token'],base=LEGACY,raw=True)
        source=ROOT/'app/src/main/resources/resume-templates/word'/filename
        record('word_download_'+str(index+1),hashlib.sha256(content).digest()==hashlib.sha256(source.read_bytes()).digest(),'SHA-256 matches original file')
    output={'date':datetime.now(timezone.utc).isoformat(),'operator':'Codex 自动验收','seconds':round(time.perf_counter()-start,3),'results':results}
    (OUT/'api-acceptance.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Acceptance complete:',len(results),'passed')

def lifecycle():
    admin=account('course_demo_admin');token=admin['token']
    before=sql('SELECT COUNT(*) FROM applications; SELECT COUNT(*) FROM interview_scores; SELECT COUNT(*) FROM employment_results; SELECT COUNT(*) FROM resume_files;').stdout
    subprocess.run(['docker','stop','interview-submit-course-app'],check=True,capture_output=True)
    results={}
    try:
        results['legacy_auth']=ok('GET','/api/auth/me',token=token,base='http://127.0.0.1:18181')['role']=='ADMIN'
        results['legacy_templates']=len(ok('GET','/api/resume-templates',token=token,base='http://127.0.0.1:18181'))==65
        with urlopen('http://127.0.0.1:18181/community',timeout=10) as response: results['legacy_page']=response.status==200
        failed=http('GET','/api/course/health',base='http://127.0.0.1:18181')
        results['module_unavailable']=failed.get('code') in [502,503,504]
    finally: subprocess.run(['docker','start','interview-submit-course-app'],check=True,capture_output=True)
    subprocess.run(['docker','restart','interview-submit-course-mysql'],check=True,capture_output=True)
    for _ in range(90):
        try:
            if http('GET','/api/course/health').get('code')==200:break
        except Exception:pass
        time.sleep(1)
    else:raise RuntimeError('Course health did not recover')
    results['persistent_rows']=before==sql('SELECT COUNT(*) FROM applications; SELECT COUNT(*) FROM interview_scores; SELECT COUNT(*) FROM employment_results; SELECT COUNT(*) FROM resume_files;').stdout
    file=sql('SELECT id,original_name FROM resume_files ORDER BY id DESC LIMIT 1;').stdout.strip()
    if file:
        id_,name=file.split('\t')
        # Staff can access attachments once used in an application; administrator checks metadata only here.
        results['file_metadata_persistent']=int(id_)>0 and bool(name)
    # Validate that all pre-existing legacy account rows keep their original credentials and roles.
    restored=subprocess.run(['docker','exec','interview-submit-postgres','pg_restore','--data-only','--table=users','--file=-','/tmp/employment-before.dump'],capture_output=True,check=True).stdout.decode('utf-8')
    match=re.search(r'COPY public.users \((.*?)\) FROM stdin;\n(.*?)\n\\\.',restored,re.S)
    if match:
        fields=[x.strip() for x in match.group(1).split(',')]
        originals=[dict(zip(fields,line.split('\t'))) for line in match.group(2).splitlines() if line]
        actual=subprocess.run(['docker','exec','interview-submit-postgres','psql','-U','postgres','-d','interview_guide','-t','-A','-c','SELECT row_to_json(u) FROM users u ORDER BY id'],capture_output=True,check=True).stdout.decode()
        current={str(row['id']):row for row in map(json.loads,actual.splitlines()) if isinstance(row,dict)}
        results['legacy_accounts_unchanged']=all(all(str(current[row['id']][k])==row[k] for k in ['username','password_hash','role']) for row in originals)
        results['original_account_count']=len(originals)
    checks=[value for key,value in results.items() if key!='original_account_count']
    if not all(checks):raise AssertionError(results)
    (OUT/'lifecycle.json').write_text(json.dumps({'result':'PASS','checks':results},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Lifecycle and legacy isolation PASS')

def performance():
    name='employment_course_perf_'+datetime.now().strftime('%Y%m%d%H%M%S')
    if not re.fullmatch(r'employment_course_perf_\d{14}',name): raise ValueError('Unexpected temporary DB')
    sql(f'CREATE DATABASE `{name}` CHARACTER SET utf8mb4;')
    measurements={}
    try:
        schema=(ROOT/'course-app/src/main/resources/db/migration/V1__employment_schema.sql').read_text(encoding='utf-8')
        sql(schema,name)
        migration=(ROOT/'course-app/src/main/resources/db/migration/V2__teacher_student_portals.sql').read_text(encoding='utf-8')
        sql(migration,name)
        documentation=(ROOT/'course-app/src/main/resources/db/migration/V3__schema_comments_and_profile_integrity.sql').read_text(encoding='utf-8')
        sql(documentation,name)
        sql((ROOT/'course-app/src/main/resources/db/migration/V4__student_report_identity_scope.sql').read_text(encoding='utf-8'),name)
        sql("INSERT INTO companies(code,name,industry,contact) VALUES ('LOAD','虚构性能测试企业','测试','测试'); INSERT INTO jobs(company_id,title,category,city,description,planned_count,deadline) VALUES (1,'测试岗位','测试','测试','测试',10000,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 YEAR));",name)
        for batch in range(10):
            values=','.join(f"({i},'load_{i}',1)" for i in range(batch*100+1,batch*100+101))
            sql('INSERT INTO users(external_user_id,username,role_id) VALUES '+values+';',name)
        sql("INSERT INTO students(user_id,student_no,full_name,college,major,graduation_year,profile_state) SELECT id,CONCAT('LOAD',id),CONCAT('测试',id),'测试学院','测试专业',2099,'COMPLETE' FROM users; INSERT INTO applications(student_id,job_id) SELECT id,1 FROM students; INSERT INTO interview_rounds(application_id,round_no,scheduled_at,location,interviewer,status,total_score) SELECT id,1,UTC_TIMESTAMP(),'测试','测试','COMPLETED',70 FROM applications; INSERT INTO interview_rounds(application_id,round_no,scheduled_at,location,interviewer,status,total_score) SELECT id,2,UTC_TIMESTAMP(),'测试','测试','COMPLETED',80 FROM applications;",name)
        for label,query in [('job_summary','SELECT * FROM v_job_recruitment_summary'),('student_summary','SELECT * FROM v_student_hiring_summary ORDER BY id LIMIT 20'),('application_detail','SELECT * FROM v_application_detail ORDER BY id LIMIT 20')]:
            t=time.perf_counter();plan=sql('EXPLAIN ANALYZE '+query+';',name).stdout;elapsed=(time.perf_counter()-t)*1000
            measurements[label]={'roundTripMs':round(elapsed,3),'explainAnalyze':plan}
        (OUT/'performance.json').write_text(json.dumps({'students':1000,'applications':1000,'interviews':2000,'measurement':'Docker CLI round trip plus server EXPLAIN ANALYZE, not pure query latency','results':measurements},ensure_ascii=False,indent=2),encoding='utf-8')
        print('Performance verification complete: 1000 students, 1000 applications, 2000 interview rounds.')
    finally:
        if not re.fullmatch(r'employment_course_perf_\d{14}',name): raise ValueError('Unsafe cleanup target')
        sql(f'DROP DATABASE `{name}`;')

def backup():
    destination=OUT/'backup/employment-course.sql';destination.parent.mkdir(parents=True,exist_ok=True)
    cmd=['docker','exec','interview-submit-course-mysql','sh','-c','exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --no-tablespaces employment_course']
    output=subprocess.run(cmd,capture_output=True)
    if output.returncode: raise RuntimeError('MySQL backup failed')
    destination.write_bytes(output.stdout)
    container='employment-restore-verification-'+secrets.token_hex(4)
    env=dict(os.environ);env['MYSQL_ROOT_PASSWORD']=secrets.token_urlsafe(24)
    subprocess.run(['docker','run','-d','--name',container,'--tmpfs','/var/lib/mysql','-e','MYSQL_ROOT_PASSWORD','-e','MYSQL_DATABASE=employment_course','mysql:8.4'],env=env,check=True,capture_output=True)
    try:
        for _ in range(90):
            ping=subprocess.run(['docker','exec',container,'mysqladmin','ping','-h127.0.0.1','--silent'],capture_output=True)
            if ping.returncode==0: break
            time.sleep(1)
        else: raise RuntimeError('Restore test MySQL did not become ready')
        # Rebind views to the restore account; the original application's account
        # does not exist in this isolated server. Verify views, not only tables.
        portable=re.sub(r'DEFINER=`[^`]*`@`[^`]*`', 'DEFINER=CURRENT_USER', output.stdout.decode('utf-8'))
        sql(portable,container=container)
        checks='SELECT COUNT(*) FROM applications; SELECT COUNT(*) FROM interview_scores; SELECT COUNT(*) FROM employment_results; SELECT COUNT(*) FROM v_application_detail; SELECT COUNT(*) FROM v_job_recruitment_summary; SELECT COUNT(*) FROM v_student_hiring_summary;'
        original=sql(checks).stdout
        restored=sql(checks,container=container).stdout
        if original!=restored: raise AssertionError('Backup/restore row counts differ')
        (OUT/'backup-restore.json').write_text(json.dumps({'result':'PASS','rowCounts':original.strip().splitlines(),'viewsVerified':3,'method':'isolated temporary MySQL container, tmpfs, no published ports; view definers rebound to restore account','bytes':len(output.stdout)},ensure_ascii=False,indent=2),encoding='utf-8')
        print('Backup/restore verification PASS')
    finally: subprocess.run(['docker','rm','-f',container],capture_output=True,check=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('operation',choices=['seed','verify','performance','backup','lifecycle','attach-demo']);args=parser.parse_args()
    globals()[args.operation.replace('-','_')]()
