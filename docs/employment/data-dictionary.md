# 就业管理数据字典

数据库：employment_course。15 张业务表与 3 张业务视图。主键 BIGINT 为系统关联编号，字段名采用英文 snake_case，中文解释同步写入 MySQL COMMENT。

模块账户不存储密码。UTC 时间在页面转换为北京时间。以下定义与实际迁移 SQL 对应。

## roles

就业模块角色：USER学生、STAFF教师、ADMIN原站管理员

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| code | VARCHAR(16) | 否 | 唯一 | 无显式默认 | 唯一角色代码：USER学生、STAFF教师、ADMIN管理员 |
| name | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 角色中文显示名称 |

表级完整性和索引：


## permissions

模块操作权限定义，以唯一权限代码进行服务端授权

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| code | VARCHAR(48) | 否 | 唯一 | 无显式默认 | 唯一权限代码，例如students.manage、apply |
| name | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 权限中文显示名称 |

表级完整性和索引：


## role_permissions

角色与权限关联，表示角色可执行的操作

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| role_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 角色外键，关联roles.id |
| permission_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 权限外键，关联permissions.id |

表级完整性和索引：

- `UNIQUE KEY uk_role_permission(role_id,permission_id)`
- `FOREIGN KEY (role_id) REFERENCES roles(id)`
- `FOREIGN KEY (permission_id) REFERENCES permissions(id)`

## menus

教师端和学生端动态菜单，按身份与权限过滤

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| parent_id | BIGINT | 是 | 见表级约束 | 无显式默认 | 父菜单外键，关联menus.id；为空表示一级菜单 |
| label | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 菜单中文显示文字 |
| path | VARCHAR(120) | 否 | 见表级约束 | 无显式默认 | 前端路由路径，不是文件系统路径 |
| permission_code | VARCHAR(48) | 否 | 见表级约束 | 无显式默认 | 所需权限代码，外键关联permissions.code |
| sort_order | INT | 否 | 见表级约束 | 0 | 菜单排序值，较小值优先显示 |
| portal | VARCHAR(16) | 否 | CHECK | 'STUDENT' | 所属端：TEACHER教师端、STUDENT学生端 |

表级完整性和索引：

- `FOREIGN KEY (parent_id) REFERENCES menus(id)`
- `FOREIGN KEY (permission_code) REFERENCES permissions(code)`

## users

原站账户映射及模块访问状态，不存储密码或Token

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| external_user_id | BIGINT | 否 | 唯一 | 无显式默认 | 原站用户主键，唯一映射；身份由原站核验 |
| username | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 原站用户名快照，仅用于显示，不用于鉴权 |
| role_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 模块角色外键，关联roles.id；管理员以原站身份为准 |
| enabled | BOOLEAN | 否 | 见表级约束 | TRUE | 模块访问开关：1启用、0停用，不影响原站登录 |
| last_seen_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 最近通过原站核验的时间，UTC，毫秒 |
| created_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 创建时间，UTC，精确到毫秒 |

表级完整性和索引：

- `FOREIGN KEY (role_id) REFERENCES roles(id)`

## students

学生档案，与模块账户一对一关联

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| user_id | BIGINT | 否 | 唯一 | 无显式默认 | 账户外键，关联users.id，一账户一份档案 |
| student_no | VARCHAR(32) | 是 | 唯一 | 无显式默认 | 学生学号，填写后唯一；待完善时可为空 |
| full_name | VARCHAR(64) | 是 | 见表级约束 | 无显式默认 | 学生姓名；样例姓名为虚构，不含真实身份信息 |
| college | VARCHAR(100) | 是 | 见表级约束 | 无显式默认 | 所属学院名称 |
| major | VARCHAR(100) | 是 | 见表级约束 | 无显式默认 | 所学专业名称 |
| graduation_year | INT | 是 | 见表级约束 | 无显式默认 | 预计毕业年份，四位年份，范围2000至2100 |
| contact | VARCHAR(100) | 是 | 见表级约束 | 无显式默认 | 联系方式，例如邮箱或脱敏电话，最长100字符 |
| profile_state | VARCHAR(16) | 否 | 见表级约束 | 'DRAFT' | 档案状态：DRAFT待完善、COMPLETE已完善 |
| updated_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 最近业务更新时间，UTC，精确到毫秒 |

表级完整性和索引：

- `FOREIGN KEY (user_id) REFERENCES users(id)`
- `CONSTRAINT ck_student_year CHECK (graduation_year IS NULL OR graduation_year BETWEEN 2000 AND 2100)`
- `CONSTRAINT ck_student_profile CHECK (profile_state IN ('DRAFT','COMPLETE'))`
- `KEY ix_student_cohort(graduation_year,college)`

## companies

招聘企业基础资料，停用后保留历史关联

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| code | VARCHAR(32) | 否 | 唯一 | 无显式默认 | 唯一企业业务代码；DEMO前缀表示课程样例 |
| name | VARCHAR(120) | 否 | 见表级约束 | 无显式默认 | 企业显示名称，课程样例明确标注为示例 |
| industry | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 企业所属行业名称 |
| contact | VARCHAR(100) | 否 | 见表级约束 | 无显式默认 | 招聘联系人及联系方式；样例使用演示邮箱 |
| description | TEXT | 是 | 见表级约束 | 无显式默认 | 企业介绍，允许为空，样例不代表真实调查 |
| enabled | BOOLEAN | 否 | 见表级约束 | TRUE | 企业启用开关：0停止新岗位开放和新投递，保留历史 |
| created_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 创建时间，UTC，精确到毫秒 |

表级完整性和索引：

- `KEY ix_company_enabled(enabled)`

## jobs

招聘岗位及名额，已录用人数由录用事务维护

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| company_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 企业外键，关联companies.id，创建后不可变更 |
| title | VARCHAR(120) | 否 | 见表级约束 | 无显式默认 | 招聘岗位名称 |
| category | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 岗位类别，例如技术、护理、运营 |
| city | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 工作城市名称 |
| description | TEXT | 否 | 见表级约束 | 无显式默认 | 职责、任职条件、培养安排及样例薪酬说明 |
| planned_count | INT | 否 | 见表级约束 | 无显式默认 | 计划招聘人数，单位人，必须大于0 |
| filled_count | INT | 否 | 见表级约束 | 0 | 已登记录用人数，单位人，不得超过计划名额 |
| deadline | DATETIME(3) | 否 | 见表级约束 | 无显式默认 | 新投递截止时间，UTC，毫秒 |
| status | VARCHAR(16) | 否 | 见表级约束 | 'OPEN' | 岗位状态：OPEN开放、CLOSED关闭、ARCHIVED归档 |
| created_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 创建时间，UTC，精确到毫秒 |

表级完整性和索引：

- `FOREIGN KEY (company_id) REFERENCES companies(id)`
- `CONSTRAINT ck_job_quota CHECK (planned_count > 0 AND filled_count >= 0 AND filled_count <= planned_count)`
- `CONSTRAINT ck_job_status CHECK (status IN ('OPEN','CLOSED','ARCHIVED'))`
- `KEY ix_job_open(status,deadline)`
- `KEY ix_job_company(company_id)`

## resume_files

私有简历附件元数据，文件内容保存在MinIO

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| owner_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 附件所有者外键，关联users.id |
| object_key | VARCHAR(200) | 否 | 唯一 | 无显式默认 | 私有桶内唯一对象键，由服务端生成，不直接公开 |
| original_name | VARCHAR(200) | 否 | 见表级约束 | 无显式默认 | 原文件显示名称，不含目录和控制字符 |
| content_type | VARCHAR(120) | 否 | 见表级约束 | 无显式默认 | 经内容验证的MIME类型，仅PDF或DOCX |
| file_size | BIGINT | 否 | 见表级约束 | 无显式默认 | 文件大小，单位字节，范围1至10485760 |
| created_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 创建时间，UTC，精确到毫秒 |

表级完整性和索引：

- `FOREIGN KEY (owner_id) REFERENCES users(id)`
- `CONSTRAINT ck_file_size CHECK (file_size > 0 AND file_size <= 10485760)`

## applications

学生岗位投递主记录，同一学生同一岗位仅一条

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| student_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 学生外键，关联students.id |
| job_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 岗位外键，关联jobs.id；与学生共同唯一 |
| resume_file_id | BIGINT | 是 | 见表级约束 | 无显式默认 | 可选简历附件外键，关联resume_files.id；需属于本人 |
| status | VARCHAR(20) | 否 | 见表级约束 | 'SUBMITTED' | 投递状态：SUBMITTED、REVIEWING、INTERVIEWING、ACCEPTED、REJECTED、WITHDRAWN |
| note | VARCHAR(1000) | 是 | 见表级约束 | 无显式默认 | 求职说明或审核反馈，最长1000字符 |
| submitted_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 首次投递时间，UTC，毫秒；用于批次统计 |
| updated_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 最近业务更新时间，UTC，精确到毫秒 |

表级完整性和索引：

- `UNIQUE KEY uk_student_job(student_id,job_id)`
- `UNIQUE KEY uk_application_student(id,student_id)`
- `FOREIGN KEY (student_id) REFERENCES students(id)`
- `FOREIGN KEY (job_id) REFERENCES jobs(id)`
- `FOREIGN KEY (resume_file_id) REFERENCES resume_files(id)`
- `CONSTRAINT ck_application_status CHECK (status IN ('SUBMITTED','REVIEWING','INTERVIEWING','ACCEPTED','REJECTED','WITHDRAWN'))`
- `KEY ix_application_job_status(job_id,status)`
- `KEY ix_application_date(submitted_at)`

## interview_rounds

投递的面试轮次与评价总分，完成后不可重评

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| application_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 投递外键，关联applications.id |
| round_no | INT | 否 | 见表级约束 | 无显式默认 | 同一投递的面试轮次，正整数，组合唯一 |
| scheduled_at | DATETIME(3) | 否 | 见表级约束 | 无显式默认 | 预约面试时间，UTC，毫秒 |
| location | VARCHAR(200) | 否 | 见表级约束 | 无显式默认 | 面试地点或线上会议说明 |
| interviewer | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 面试官姓名或称谓，支持教师与企业面试官 |
| status | VARCHAR(16) | 否 | 见表级约束 | 'SCHEDULED' | 面试状态：SCHEDULED待进行、COMPLETED完成、CANCELLED取消 |
| total_score | INT | 是 | 见表级约束 | 无显式默认 | 后端计算的面试总分，单位分，0至100，未评分为空 |
| comment | VARCHAR(1000) | 是 | 见表级约束 | 无显式默认 | 面试综合评价，最长1000字符 |
| completed_at | DATETIME(3) | 是 | 见表级约束 | 无显式默认 | 评分提交完成时间，UTC，毫秒；未完成为空 |

表级完整性和索引：

- `UNIQUE KEY uk_interview_round(application_id,round_no)`
- `FOREIGN KEY (application_id) REFERENCES applications(id)`
- `CONSTRAINT ck_round_no CHECK (round_no > 0)`
- `CONSTRAINT ck_interview_status CHECK (status IN ('SCHEDULED','COMPLETED','CANCELLED'))`
- `CONSTRAINT ck_interview_total CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100)`
- `KEY ix_interview_schedule(status,scheduled_at)`

## evaluation_criteria

固定面试评分标准，三项上限合计100分

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| code | VARCHAR(32) | 否 | 唯一 | 无显式默认 | 唯一评分项目代码：communication、professional、fit |
| name | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 评分项目中文名称 |
| max_score | INT | 否 | 见表级约束 | 无显式默认 | 项目评分上限，单位分，固定为30、40、30 |

表级完整性和索引：

- `CONSTRAINT ck_criterion_max CHECK (max_score BETWEEN 1 AND 100)`

## interview_scores

每轮面试的评分明细，三项与总分事务提交

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| interview_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 面试轮次外键，关联interview_rounds.id |
| criterion_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 评分项目外键，关联evaluation_criteria.id |
| score | INT | 否 | 见表级约束 | 无显式默认 | 项目实际得分，单位分，0至上限 |
| max_score | INT | 否 | 见表级约束 | 无显式默认 | 评分时的上限快照，单位分，保留评价依据 |

表级完整性和索引：

- `UNIQUE KEY uk_interview_criterion(interview_id,criterion_id)`
- `FOREIGN KEY (interview_id) REFERENCES interview_rounds(id)`
- `FOREIGN KEY (criterion_id) REFERENCES evaluation_criteria(id)`
- `CONSTRAINT ck_score_range CHECK (max_score BETWEEN 1 AND 100 AND score BETWEEN 0 AND max_score)`

## employment_results

学生最终录用结果，每名学生仅登记一次

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| student_id | BIGINT | 否 | 唯一 | 无显式默认 | 最终录用学生外键，唯一；关联students.id |
| application_id | BIGINT | 否 | 唯一 | 无显式默认 | 最终录用申请外键，唯一；组合外键校验学生一致 |
| confirmed_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 最终录用登记时间，UTC，毫秒 |
| start_date | DATE | 否 | 见表级约束 | 无显式默认 | 预计入职日期，日期值，不含时区或时分秒 |
| remarks | VARCHAR(1000) | 是 | 见表级约束 | 无显式默认 | 录用备注，例如培养安排，最长1000字符 |

表级完整性和索引：

- `FOREIGN KEY (student_id) REFERENCES students(id)`
- `FOREIGN KEY (application_id,student_id) REFERENCES applications(id,student_id)`

## audit_logs

模块操作记录，不包含密码、Token或文件内容

| 字段 | 类型 | 可空 | 键与规则 | 默认值 | 中文注释 |
| --- | --- | --- | --- | --- | --- |
| id | BIGINT | 否 | PK，自增 | 自增 | 本表主键，自增业务记录编号 |
| actor_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 操作者外键，关联users.id |
| action | VARCHAR(64) | 否 | 见表级约束 | 无显式默认 | 业务操作代码，例如APPLY、SCORE、HIRE |
| resource_type | VARCHAR(48) | 否 | 见表级约束 | 无显式默认 | 业务对象类别，例如application、interview |
| resource_id | BIGINT | 否 | 见表级约束 | 无显式默认 | 对应业务记录编号，日志保留历史，不设多态外键 |
| detail | VARCHAR(2000) | 否 | 见表级约束 | 无显式默认 | 操作摘要，最长2000字符，不记录敏感凭据 |
| created_at | DATETIME(3) | 否 | 见表级约束 | CURRENT_TIMESTAMP(3) | 创建时间，UTC，精确到毫秒 |

表级完整性和索引：

- `FOREIGN KEY (actor_id) REFERENCES users(id)`
- `KEY ix_audit_time(created_at)`
- `KEY ix_audit_resource(resource_type,resource_id,action)`

## 补充检查约束

- `ck_complete_profile`：COMPLETE 档案必须有非空学号、姓名、学院、专业及毕业年份。
- `ck_file_content_type`：附件元数据只允许验证后的 PDF、DOCX MIME 类型。
- `ck_menu_portal`：菜单所属端只能为 TEACHER 或 STUDENT。

## 业务视图字段解释

- `v_application_detail`：投递主记录字段、学生资料、企业和岗位名称；latest_interview_id 为最新轮次，latest_score 为该轮已提交总分，employment_id 为最终录用编号。
- `v_job_recruitment_summary`：application_count 为不同投递数；interview_count 为至少完成一轮面试的不同投递数；hired_count 为最终录用记录数；remaining_count 为 planned_count 减 filled_count。
- `v_student_hiring_summary`：application_count 为该学生累计投递数；employment_id、company_name、job_title、confirmed_at、start_date 表示其唯一最终录用。
- 视图中的姓名、学院、企业等基础字段含义与来源表相同，汇总字段在本字典定义；视图不保存独立业务事实。
