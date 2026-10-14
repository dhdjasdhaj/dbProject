"""Generate additive COMMENT migration and dictionary from actual versioned column definitions."""
from pathlib import Path
import json,re

ROOT=Path(__file__).resolve().parents[1]
MIGRATIONS=ROOT/'course-app/src/main/resources/db/migration'
TABLES={
 'roles':'就业模块角色：USER学生、STAFF教师、ADMIN原站管理员',
 'permissions':'模块操作权限定义，以唯一权限代码进行服务端授权',
 'role_permissions':'角色与权限关联，表示角色可执行的操作',
 'menus':'教师端和学生端动态菜单，按身份与权限过滤',
 'users':'原站账户映射及模块访问状态，不存储密码或Token',
 'students':'学生档案，与模块账户一对一关联',
 'companies':'招聘企业基础资料，停用后保留历史关联',
 'jobs':'招聘岗位及名额，已录用人数由录用事务维护',
 'resume_files':'私有简历附件元数据，文件内容保存在MinIO',
 'applications':'学生岗位投递主记录，同一学生同一岗位仅一条',
 'interview_rounds':'投递的面试轮次与评价总分，完成后不可重评',
 'evaluation_criteria':'固定面试评分标准，三项上限合计100分',
 'interview_scores':'每轮面试的评分明细，三项与总分事务提交',
 'employment_results':'学生最终录用结果，每名学生仅登记一次',
 'audit_logs':'模块操作记录，不包含密码、Token或文件内容',
}
COMMON={
 'id':'本表主键，自增业务记录编号',
 'created_at':'创建时间，UTC，精确到毫秒',
 'updated_at':'最近业务更新时间，UTC，精确到毫秒',
}
FIELDS={
 'roles':{'code':'唯一角色代码：USER学生、STAFF教师、ADMIN管理员','name':'角色中文显示名称'},
 'permissions':{'code':'唯一权限代码，例如students.manage、apply','name':'权限中文显示名称'},
 'role_permissions':{'role_id':'角色外键，关联roles.id','permission_id':'权限外键，关联permissions.id'},
 'menus':{'parent_id':'父菜单外键，关联menus.id；为空表示一级菜单','label':'菜单中文显示文字','path':'前端路由路径，不是文件系统路径','permission_code':'所需权限代码，外键关联permissions.code','sort_order':'菜单排序值，较小值优先显示','portal':'所属端：TEACHER教师端、STUDENT学生端'},
 'users':{'external_user_id':'原站用户主键，唯一映射；身份由原站核验','username':'原站用户名快照，仅用于显示，不用于鉴权','role_id':'模块角色外键，关联roles.id；管理员以原站身份为准','enabled':'模块访问开关：1启用、0停用，不影响原站登录','last_seen_at':'最近通过原站核验的时间，UTC，毫秒'},
 'students':{'user_id':'账户外键，关联users.id，一账户一份档案','student_no':'学生学号，填写后唯一；待完善时可为空','full_name':'学生姓名；样例姓名为虚构，不含真实身份信息','college':'所属学院名称','major':'所学专业名称','graduation_year':'预计毕业年份，四位年份，范围2000至2100','contact':'联系方式，例如邮箱或脱敏电话，最长100字符','profile_state':'档案状态：DRAFT待完善、COMPLETE已完善'},
 'companies':{'code':'唯一企业业务代码；DEMO前缀表示课程样例','name':'企业显示名称，课程样例明确标注为示例','industry':'企业所属行业名称','contact':'招聘联系人及联系方式；样例使用演示邮箱','description':'企业介绍，允许为空，样例不代表真实调查','enabled':'企业启用开关：0停止新岗位开放和新投递，保留历史'},
 'jobs':{'company_id':'企业外键，关联companies.id，创建后不可变更','title':'招聘岗位名称','category':'岗位类别，例如技术、护理、运营','city':'工作城市名称','description':'职责、任职条件、培养安排及样例薪酬说明','planned_count':'计划招聘人数，单位人，必须大于0','filled_count':'已登记录用人数，单位人，不得超过计划名额','deadline':'新投递截止时间，UTC，毫秒','status':'岗位状态：OPEN开放、CLOSED关闭、ARCHIVED归档'},
 'resume_files':{'owner_id':'附件所有者外键，关联users.id','object_key':'私有桶内唯一对象键，由服务端生成，不直接公开','original_name':'原文件显示名称，不含目录和控制字符','content_type':'经内容验证的MIME类型，仅PDF或DOCX','file_size':'文件大小，单位字节，范围1至10485760'},
 'applications':{'student_id':'学生外键，关联students.id','job_id':'岗位外键，关联jobs.id；与学生共同唯一','resume_file_id':'可选简历附件外键，关联resume_files.id；需属于本人','status':'投递状态：SUBMITTED、REVIEWING、INTERVIEWING、ACCEPTED、REJECTED、WITHDRAWN','note':'求职说明或审核反馈，最长1000字符','submitted_at':'首次投递时间，UTC，毫秒；用于批次统计'},
 'interview_rounds':{'application_id':'投递外键，关联applications.id','round_no':'同一投递的面试轮次，正整数，组合唯一','scheduled_at':'预约面试时间，UTC，毫秒','location':'面试地点或线上会议说明','interviewer':'面试官姓名或称谓，支持教师与企业面试官','status':'面试状态：SCHEDULED待进行、COMPLETED完成、CANCELLED取消','total_score':'后端计算的面试总分，单位分，0至100，未评分为空','comment':'面试综合评价，最长1000字符','completed_at':'评分提交完成时间，UTC，毫秒；未完成为空'},
 'evaluation_criteria':{'code':'唯一评分项目代码：communication、professional、fit','name':'评分项目中文名称','max_score':'项目评分上限，单位分，固定为30、40、30'},
 'interview_scores':{'interview_id':'面试轮次外键，关联interview_rounds.id','criterion_id':'评分项目外键，关联evaluation_criteria.id','score':'项目实际得分，单位分，0至上限','max_score':'评分时的上限快照，单位分，保留评价依据'},
 'employment_results':{'student_id':'最终录用学生外键，唯一；关联students.id','application_id':'最终录用申请外键，唯一；组合外键校验学生一致','confirmed_at':'最终录用登记时间，UTC，毫秒','start_date':'预计入职日期，日期值，不含时区或时分秒','remarks':'录用备注，例如培养安排，最长1000字符'},
 'audit_logs':{'actor_id':'操作者外键，关联users.id','action':'业务操作代码，例如APPLY、SCORE、HIRE','resource_type':'业务对象类别，例如application、interview','resource_id':'对应业务记录编号，日志保留历史，不设多态外键','detail':'操作摘要，最长2000字符，不记录敏感凭据'},
}

def generate():
 sql=(MIGRATIONS/'V1__employment_schema.sql').read_text(encoding='utf-8')
 migration=['-- Additive schema documentation; do not change applied V1/V2 checksums.']
 dictionary=['# 就业管理数据字典','', '数据库：employment_course。15 张业务表与 3 张业务视图。主键 BIGINT 为系统关联编号，字段名采用英文 snake_case，中文解释同步写入 MySQL COMMENT。','', '模块账户不存储密码。UTC 时间在页面转换为北京时间。以下定义与实际迁移 SQL 对应。','']
 definitions=[]
 for table,body in re.findall(r'CREATE TABLE (\w+) \((.*?)\) ENGINE=InnoDB;',sql,re.S):
  cols=[]
  for line in body.splitlines():
   match=re.match(r'\s*(\w+)\s+(BIGINT|INT|VARCHAR\(\d+\)|TEXT|BOOLEAN|DATETIME\(3\)|DATE)\s+(.*)',line)
   if not match:continue
   field,typ,tail=match.groups();definition=(typ+' '+tail.rstrip(',')).replace(' PRIMARY KEY','').replace(' UNIQUE','')
   comment=FIELDS[table].get(field,COMMON.get(field))
   if not comment:raise ValueError(f'Missing field comment: {table}.{field}')
   cols.append({'field':field,'type':typ,'definition':definition,'comment':comment,'nullable':'否' if 'NOT NULL' in tail else '是','key':'PK，自增' if field=='id' else '唯一' if 'UNIQUE' in tail else '见表级约束'})
  if table=='menus':cols.append({'field':'portal','type':'VARCHAR(16)','definition':"VARCHAR(16) NOT NULL DEFAULT 'STUDENT'",'comment':FIELDS['menus']['portal'],'nullable':'否','key':'CHECK'})
  migration.append(f"ALTER TABLE `{table}` COMMENT='{TABLES[table]}';")
  modifications=[f"MODIFY COLUMN `{c['field']}` {c['definition']} COMMENT '{c['comment'].replace(chr(39),chr(39)*2)}'" for c in cols]
  migration.append(f"ALTER TABLE `{table}`\n "+',\n '.join(modifications)+';')
  dictionary.extend([f'## {table}', '',TABLES[table],'','| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |','| --- | --- | --- | --- | --- | --- |'])
  for c in cols:
   default=re.search(r'DEFAULT\s+([^,]+)',c['definition']);default=default.group(1).strip() if default else '自增' if c['field']=='id' else '无显式默认'
   dictionary.append(f"| {c['field']} | {c['type']} | {c['nullable']} | {c['key']} | {default} | {c['comment']} |")
  constraints=[line.strip().rstrip(',') for line in body.splitlines() if re.match(r'\s*(UNIQUE KEY|FOREIGN KEY|CONSTRAINT|KEY)',line)]
  dictionary.extend(['','表级完整性和索引：','',*['- `'+line+'`' for line in constraints],''])
  definitions.append({'table':table,'comment':TABLES[table],'columns':cols,'constraints':constraints})
 migration.append("ALTER TABLE students ADD CONSTRAINT ck_complete_profile CHECK (profile_state='DRAFT' OR (student_no IS NOT NULL AND CHAR_LENGTH(TRIM(student_no))>0 AND full_name IS NOT NULL AND CHAR_LENGTH(TRIM(full_name))>0 AND college IS NOT NULL AND CHAR_LENGTH(TRIM(college))>0 AND major IS NOT NULL AND CHAR_LENGTH(TRIM(major))>0 AND graduation_year IS NOT NULL));")
 migration.append("ALTER TABLE resume_files ADD CONSTRAINT ck_file_content_type CHECK (content_type IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'));")
 dictionary.extend(['## 补充检查约束','','- `ck_complete_profile`：COMPLETE 档案必须有非空学号、姓名、学院、专业及毕业年份。','- `ck_file_content_type`：附件元数据只允许验证后的 PDF、DOCX MIME 类型。','- `ck_menu_portal`：菜单所属端只能为 TEACHER 或 STUDENT。','','## 业务视图字段解释','','- `v_application_detail`：投递主记录字段、学生资料、企业和岗位名称；latest_interview_id 为最新轮次，latest_score 为该轮已提交总分，employment_id 为最终录用编号。','- `v_job_recruitment_summary`：application_count 为不同投递数；interview_count 为至少完成一轮面试的不同投递数；hired_count 为最终录用记录数；remaining_count 为 planned_count 减 filled_count。','- `v_student_hiring_summary`：application_count 为该学生累计投递数；employment_id、company_name、job_title、confirmed_at、start_date 表示其唯一最终录用。','- 视图中的姓名、学院、企业等基础字段含义与来源表相同，汇总字段在本字典定义；视图不保存独立业务事实。'])
 docs=ROOT/'docs/employment';docs.mkdir(parents=True,exist_ok=True)
 (MIGRATIONS/'V3__schema_comments_and_profile_integrity.sql').write_text('\n\n'.join(migration)+'\n',encoding='utf-8')
 (docs/'data-dictionary.md').write_text('\n'.join(dictionary)+'\n',encoding='utf-8')
 (docs/'schema-definition.json').write_text(json.dumps(definitions,ensure_ascii=False,indent=2),encoding='utf-8')
 print('Defined',len(definitions),'tables and',sum(len(t['columns']) for t in definitions),'commented fields.')

if __name__=='__main__':generate()
