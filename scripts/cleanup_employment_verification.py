"""Remove only acceptance fixtures owned by this run's private vault. Never touches DEMO rows.
Real verification evidence remains in JSON, and teacher audit entries remain historical records.
"""
import json,os,re,subprocess
from urllib.parse import quote
from employment_acceptance import OUT,vault,VAULT,sql

def cleanup():
 saved=vault();names=[name for name in saved if re.fullmatch(r'course_verify_(?:[0-9a-f]{8}_[1-3]|student_[1-3])',name)]
 if not names:print('No owned acceptance accounts remain.');return
 external=[int(saved[name]['userId']) for name in names]
 if any(i<=0 for i in external):raise ValueError('Unexpected account id')
 ids=','.join(map(str,external))
 mappings=sql(f'SELECT id,external_user_id,username FROM users WHERE external_user_id IN ({ids});').stdout.strip().splitlines()
 users=[]
 for line in mappings:
  if not line:continue
  uid,eid,name=line.split('\t')
  if name not in names or int(saved[name]['userId'])!=int(eid):raise ValueError('Fixture ownership mismatch')
  users.append(int(uid))
 if users:
  userids=','.join(map(str,users))
  students=sql(f'SELECT id FROM students WHERE user_id IN ({userids});').stdout.strip().splitlines()
  studentids=','.join(str(int(i)) for i in students) or '0'
  files=sql(f'SELECT owner_id,object_key FROM resume_files WHERE owner_id IN ({userids});').stdout.strip().splitlines()
  metadata=json.loads(subprocess.run(['docker','inspect','interview-submit-course-app'],capture_output=True,check=True).stdout)[0]
  variables=dict(x.split('=',1) for x in metadata['Config']['Env'] if '=' in x)
  bucket=variables.get('COURSE_STORAGE_BUCKET','employment-course')
  if bucket!='employment-course':raise ValueError('Refusing to clean a different bucket')
  objects=[]
  for line in files:
   if not line:continue
   owner,key=line.split('\t')
   if int(owner) not in users or not re.fullmatch(r'resumes/'+re.escape(owner)+r'/[0-9a-f-]{36}',key):raise ValueError('Unexpected object key')
   objects.append('courseclean/'+bucket+'/'+key)
  if objects:
   access=variables['COURSE_STORAGE_ACCESS_KEY'];secret=variables['COURSE_STORAGE_SECRET_KEY']
   environment=dict(os.environ);environment['MC_HOST_courseclean']='http://'+quote(access,safe='')+':'+quote(secret,safe='')+'@minio:9000'
   result=subprocess.run(['docker','run','--rm','--network','interview-submit_default','-e','MC_HOST_courseclean','--entrypoint','/usr/local/bin/mc','interview-submit-mc:local','rm',*objects],env=environment,capture_output=True)
   if result.returncode:raise RuntimeError('Could not remove private acceptance objects; no database cleanup applied')
  jobs=sql(f"SELECT j.id FROM jobs j JOIN companies c ON c.id=j.company_id WHERE c.code REGEXP '^VERIFY-[0-9a-f]{{8}}$' AND c.contact='测试专用' AND NOT EXISTS(SELECT 1 FROM applications a WHERE a.job_id=j.id AND a.student_id NOT IN ({studentids}));").stdout.strip().splitlines()
  jobids=','.join(str(int(i)) for i in jobs) or '0'
  commands=f'''START TRANSACTION;
DELETE FROM interview_scores WHERE interview_id IN (SELECT id FROM interview_rounds WHERE application_id IN (SELECT id FROM applications WHERE student_id IN ({studentids})));
DELETE FROM interview_rounds WHERE application_id IN (SELECT id FROM applications WHERE student_id IN ({studentids}));
DELETE FROM employment_results WHERE student_id IN ({studentids});
DELETE FROM applications WHERE student_id IN ({studentids});
DELETE FROM resume_files WHERE owner_id IN ({userids});
DELETE FROM audit_logs WHERE actor_id IN ({userids});
DELETE FROM students WHERE user_id IN ({userids});
DELETE FROM users WHERE id IN ({userids});
DELETE FROM jobs WHERE id IN ({jobids});
DELETE FROM companies WHERE code REGEXP '^VERIFY-[0-9a-f]{{8}}$' AND contact='测试专用' AND NOT EXISTS(SELECT 1 FROM jobs WHERE jobs.company_id=companies.id);
COMMIT;'''
  sql(commands)
 tuples=','.join(f"({int(saved[name]['userId'])},'{name}')" for name in names)
 result=subprocess.run(['docker','exec','-i','interview-submit-postgres','psql','-U','postgres','-d','interview_guide','-v','ON_ERROR_STOP=1'],input=f'DELETE FROM users WHERE (id,username) IN ({tuples});',text=True,capture_output=True)
 if result.returncode:raise RuntimeError('Legacy FK protection kept acceptance accounts; never delete linked legacy data')
 for name in names:saved.pop(name)
 VAULT.write_text(json.dumps(saved,ensure_ascii=False,indent=2),encoding='utf-8')
 (OUT/'fixture-cleanup.json').write_text(json.dumps({'result':'PASS','accountsRemoved':len(names),'scope':'Only exact vault-owned verification IDs and UUID objects; DEMO and pre-existing accounts preserved'},ensure_ascii=False,indent=2),encoding='utf-8')
 print('Removed',len(names),'owned verification accounts and their course fixtures. Demo records preserved.')

if __name__=='__main__':cleanup()
