-- Teaching reference: run only in a new empty MySQL 8.0.16+ schema.
-- Actual deployment uses Flyway V1-V4; this reference does not create Flyway history.
-- No real account records, passwords or business data are exported.


-- SOURCE: V1__employment_schema.sql
CREATE TABLE roles (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(16) NOT NULL UNIQUE,
 name VARCHAR(64) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE permissions (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(48) NOT NULL UNIQUE,
 name VARCHAR(64) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE role_permissions (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 role_id BIGINT NOT NULL,
 permission_id BIGINT NOT NULL,
 UNIQUE KEY uk_role_permission(role_id,permission_id),
 FOREIGN KEY (role_id) REFERENCES roles(id),
 FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;
CREATE TABLE menus (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 parent_id BIGINT NULL,
 label VARCHAR(64) NOT NULL,
 path VARCHAR(120) NOT NULL,
 permission_code VARCHAR(48) NOT NULL,
 sort_order INT NOT NULL DEFAULT 0,
 FOREIGN KEY (parent_id) REFERENCES menus(id),
 FOREIGN KEY (permission_code) REFERENCES permissions(code)
) ENGINE=InnoDB;
CREATE TABLE users (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 external_user_id BIGINT NOT NULL UNIQUE,
 username VARCHAR(64) NOT NULL,
 role_id BIGINT NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 last_seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;
CREATE TABLE students (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT NOT NULL UNIQUE,
 student_no VARCHAR(32) NULL UNIQUE,
 full_name VARCHAR(64) NULL,
 college VARCHAR(100) NULL,
 major VARCHAR(100) NULL,
 graduation_year INT NULL,
 contact VARCHAR(100) NULL,
 profile_state VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (user_id) REFERENCES users(id),
 CONSTRAINT ck_student_year CHECK (graduation_year IS NULL OR graduation_year BETWEEN 2000 AND 2100),
 CONSTRAINT ck_student_profile CHECK (profile_state IN ('DRAFT','COMPLETE')),
 KEY ix_student_cohort(graduation_year,college)
) ENGINE=InnoDB;
CREATE TABLE companies (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(32) NOT NULL UNIQUE,
 name VARCHAR(120) NOT NULL,
 industry VARCHAR(64) NOT NULL,
 contact VARCHAR(100) NOT NULL,
 description TEXT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 KEY ix_company_enabled(enabled)
) ENGINE=InnoDB;
CREATE TABLE jobs (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 company_id BIGINT NOT NULL,
 title VARCHAR(120) NOT NULL,
 category VARCHAR(64) NOT NULL,
 city VARCHAR(64) NOT NULL,
 description TEXT NOT NULL,
 planned_count INT NOT NULL,
 filled_count INT NOT NULL DEFAULT 0,
 deadline DATETIME(3) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (company_id) REFERENCES companies(id),
 CONSTRAINT ck_job_quota CHECK (planned_count > 0 AND filled_count >= 0 AND filled_count <= planned_count),
 CONSTRAINT ck_job_status CHECK (status IN ('OPEN','CLOSED','ARCHIVED')),
 KEY ix_job_open(status,deadline),
 KEY ix_job_company(company_id)
) ENGINE=InnoDB;
CREATE TABLE resume_files (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 owner_id BIGINT NOT NULL,
 object_key VARCHAR(200) NOT NULL UNIQUE,
 original_name VARCHAR(200) NOT NULL,
 content_type VARCHAR(120) NOT NULL,
 file_size BIGINT NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (owner_id) REFERENCES users(id),
 CONSTRAINT ck_file_size CHECK (file_size > 0 AND file_size <= 10485760)
) ENGINE=InnoDB;
CREATE TABLE applications (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id BIGINT NOT NULL,
 job_id BIGINT NOT NULL,
 resume_file_id BIGINT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
 note VARCHAR(1000) NULL,
 submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY uk_student_job(student_id,job_id),
 UNIQUE KEY uk_application_student(id,student_id),
 FOREIGN KEY (student_id) REFERENCES students(id),
 FOREIGN KEY (job_id) REFERENCES jobs(id),
 FOREIGN KEY (resume_file_id) REFERENCES resume_files(id),
 CONSTRAINT ck_application_status CHECK (status IN ('SUBMITTED','REVIEWING','INTERVIEWING','ACCEPTED','REJECTED','WITHDRAWN')),
 KEY ix_application_job_status(job_id,status),
 KEY ix_application_date(submitted_at)
) ENGINE=InnoDB;
CREATE TABLE interview_rounds (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 application_id BIGINT NOT NULL,
 round_no INT NOT NULL,
 scheduled_at DATETIME(3) NOT NULL,
 location VARCHAR(200) NOT NULL,
 interviewer VARCHAR(64) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED',
 total_score INT NULL,
 comment VARCHAR(1000) NULL,
 completed_at DATETIME(3) NULL,
 UNIQUE KEY uk_interview_round(application_id,round_no),
 FOREIGN KEY (application_id) REFERENCES applications(id),
 CONSTRAINT ck_round_no CHECK (round_no > 0),
 CONSTRAINT ck_interview_status CHECK (status IN ('SCHEDULED','COMPLETED','CANCELLED')),
 CONSTRAINT ck_interview_total CHECK (total_score IS NULL OR total_score BETWEEN 0 AND 100),
 KEY ix_interview_schedule(status,scheduled_at)
) ENGINE=InnoDB;
CREATE TABLE evaluation_criteria (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(32) NOT NULL UNIQUE,
 name VARCHAR(64) NOT NULL,
 max_score INT NOT NULL,
 CONSTRAINT ck_criterion_max CHECK (max_score BETWEEN 1 AND 100)
) ENGINE=InnoDB;
CREATE TABLE interview_scores (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 interview_id BIGINT NOT NULL,
 criterion_id BIGINT NOT NULL,
 score INT NOT NULL,
 max_score INT NOT NULL,
 UNIQUE KEY uk_interview_criterion(interview_id,criterion_id),
 FOREIGN KEY (interview_id) REFERENCES interview_rounds(id),
 FOREIGN KEY (criterion_id) REFERENCES evaluation_criteria(id),
 CONSTRAINT ck_score_range CHECK (max_score BETWEEN 1 AND 100 AND score BETWEEN 0 AND max_score)
) ENGINE=InnoDB;
CREATE TABLE employment_results (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 student_id BIGINT NOT NULL UNIQUE,
 application_id BIGINT NOT NULL UNIQUE,
 confirmed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 start_date DATE NOT NULL,
 remarks VARCHAR(1000) NULL,
 FOREIGN KEY (student_id) REFERENCES students(id),
 FOREIGN KEY (application_id,student_id) REFERENCES applications(id,student_id)
) ENGINE=InnoDB;
CREATE TABLE audit_logs (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 actor_id BIGINT NOT NULL,
 action VARCHAR(64) NOT NULL,
 resource_type VARCHAR(48) NOT NULL,
 resource_id BIGINT NOT NULL,
 detail VARCHAR(2000) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 FOREIGN KEY (actor_id) REFERENCES users(id),
 KEY ix_audit_time(created_at),
 KEY ix_audit_resource(resource_type,resource_id,action)
) ENGINE=InnoDB;
INSERT INTO roles(id,code,name) VALUES (1,'USER','学生'),(2,'STAFF','就业中心工作人员'),(3,'ADMIN','管理员');
INSERT INTO permissions(id,code,name) VALUES
 (1,'dashboard','工作台'),(2,'profile','个人档案'),(3,'jobs.read','浏览岗位'),(4,'apply','本人投递'),
 (5,'students.manage','学生档案管理'),(6,'companies.manage','企业维护'),(7,'jobs.manage','岗位维护'),
 (8,'applications.manage','投递审核'),(9,'interviews.manage','面试安排与评分'),(10,'employment.manage','录用登记'),
 (11,'reports','统计与导出'),(12,'admin','模块管理');
INSERT INTO role_permissions(role_id,permission_id) SELECT 1,id FROM permissions WHERE id IN (1,2,3,4);
INSERT INTO role_permissions(role_id,permission_id) SELECT 2,id FROM permissions WHERE id IN (1,3,5,6,7,8,9,10,11);
INSERT INTO role_permissions(role_id,permission_id) SELECT 3,id FROM permissions;
INSERT INTO menus(label,path,permission_code,sort_order) VALUES
 ('就业工作台','/employment','dashboard',1),('我的档案','/employment/profile','profile',2),
 ('学生档案','/employment/students','students.manage',3),('企业管理','/employment/companies','companies.manage',4),
 ('招聘岗位','/employment/jobs','jobs.read',5),('我的投递','/employment/applications','apply',6),
 ('投递审核','/employment/review','applications.manage',7),('面试管理','/employment/interviews','interviews.manage',8),
 ('我的面试','/employment/my-interviews','apply',9),('录用登记','/employment/results','employment.manage',10),
 ('我的录用','/employment/my-results','apply',11),('统计报表','/employment/reports','reports',12),
 ('模块管理','/employment/admin','admin',13);
INSERT INTO evaluation_criteria(id,code,name,max_score) VALUES (1,'communication','沟通表达',30),(2,'professional','专业能力',40),(3,'fit','岗位匹配',30);
CREATE VIEW v_application_detail AS
 SELECT a.id,a.student_id,s.user_id,s.student_no,s.full_name,s.college,s.major,s.graduation_year,
 a.job_id,j.title AS job_title,c.name AS company_name,a.status,a.note,a.resume_file_id,a.submitted_at,a.updated_at,
 ir.id AS latest_interview_id,ir.total_score AS latest_score,ir.status AS latest_interview_status,
 er.id AS employment_id,er.confirmed_at
 FROM applications a JOIN students s ON s.id=a.student_id JOIN jobs j ON j.id=a.job_id
 JOIN companies c ON c.id=j.company_id
 LEFT JOIN interview_rounds ir ON ir.application_id=a.id AND ir.round_no=(SELECT MAX(i2.round_no) FROM interview_rounds i2 WHERE i2.application_id=a.id)
 LEFT JOIN employment_results er ON er.application_id=a.id;
CREATE VIEW v_job_recruitment_summary AS
 SELECT j.id,j.company_id,c.name AS company_name,j.title,j.category,j.city,j.status,j.deadline,j.planned_count,j.filled_count,
 j.planned_count-j.filled_count AS remaining_count,
 COALESCE(a.application_count,0) AS application_count,COALESCE(i.interview_count,0) AS interview_count,
 COALESCE(e.hired_count,0) AS hired_count
 FROM jobs j JOIN companies c ON c.id=j.company_id
 LEFT JOIN (SELECT job_id,COUNT(*) AS application_count FROM applications GROUP BY job_id) a ON a.job_id=j.id
 LEFT JOIN (SELECT ap.job_id,COUNT(DISTINCT ap.id) AS interview_count FROM applications ap JOIN interview_rounds ir ON ir.application_id=ap.id WHERE ir.status='COMPLETED' GROUP BY ap.job_id) i ON i.job_id=j.id
 LEFT JOIN (SELECT ap.job_id,COUNT(*) AS hired_count FROM employment_results er JOIN applications ap ON ap.id=er.application_id GROUP BY ap.job_id) e ON e.job_id=j.id;
CREATE VIEW v_student_hiring_summary AS
 SELECT s.id,s.user_id,s.student_no,s.full_name,s.college,s.major,s.graduation_year,s.profile_state,u.enabled,
 COALESCE(ac.application_count,0) AS application_count,er.id AS employment_id,er.confirmed_at,er.start_date,
 j.title AS job_title,c.name AS company_name
 FROM students s JOIN users u ON u.id=s.user_id
 LEFT JOIN (SELECT student_id,COUNT(*) AS application_count FROM applications GROUP BY student_id) ac ON ac.student_id=s.id
 LEFT JOIN employment_results er ON er.student_id=s.id LEFT JOIN applications ap ON ap.id=er.application_id
 LEFT JOIN jobs j ON j.id=ap.job_id LEFT JOIN companies c ON c.id=j.company_id;


-- SOURCE: V2__teacher_student_portals.sql
ALTER TABLE menus ADD COLUMN portal VARCHAR(16) NOT NULL DEFAULT 'STUDENT';
ALTER TABLE menus ADD CONSTRAINT ck_menu_portal CHECK (portal IN ('TEACHER','STUDENT'));
UPDATE roles SET name='教师' WHERE code='STAFF';
UPDATE menus SET label='学生工作台',path='/employment/student',portal='STUDENT' WHERE id=1;
UPDATE menus SET path='/employment/student/profile',portal='STUDENT' WHERE id=2;
UPDATE menus SET path='/employment/teacher/students',portal='TEACHER' WHERE id=3;
UPDATE menus SET path='/employment/teacher/companies',portal='TEACHER' WHERE id=4;
UPDATE menus SET path='/employment/student/jobs',portal='STUDENT' WHERE id=5;
UPDATE menus SET path='/employment/student/applications',portal='STUDENT' WHERE id=6;
UPDATE menus SET label='学生投递',path='/employment/teacher/review',portal='TEACHER' WHERE id=7;
UPDATE menus SET path='/employment/teacher/interviews',portal='TEACHER' WHERE id=8;
UPDATE menus SET path='/employment/student/my-interviews',portal='STUDENT' WHERE id=9;
UPDATE menus SET path='/employment/teacher/results',portal='TEACHER' WHERE id=10;
UPDATE menus SET path='/employment/student/my-results',portal='STUDENT' WHERE id=11;
UPDATE menus SET path='/employment/teacher/reports',portal='TEACHER' WHERE id=12;
UPDATE menus SET path='/employment/teacher/admin',portal='TEACHER' WHERE id=13;
INSERT INTO menus(label,path,permission_code,sort_order,portal) VALUES
 ('教师工作台','/employment/teacher','dashboard',1,'TEACHER'),
 ('招聘岗位','/employment/teacher/jobs','jobs.read',5,'TEACHER');


-- SOURCE: V3__schema_comments_and_profile_integrity.sql
-- Additive schema documentation; do not change applied V1/V2 checksums.

ALTER TABLE `roles` COMMENT='就业模块角色：USER学生、STAFF教师、ADMIN原站管理员';

ALTER TABLE `roles`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `code` VARCHAR(16) NOT NULL COMMENT '唯一角色代码：USER学生、STAFF教师、ADMIN管理员',
 MODIFY COLUMN `name` VARCHAR(64) NOT NULL COMMENT '角色中文显示名称';

ALTER TABLE `permissions` COMMENT='模块操作权限定义，以唯一权限代码进行服务端授权';

ALTER TABLE `permissions`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `code` VARCHAR(48) NOT NULL COMMENT '唯一权限代码，例如students.manage、apply',
 MODIFY COLUMN `name` VARCHAR(64) NOT NULL COMMENT '权限中文显示名称';

ALTER TABLE `role_permissions` COMMENT='角色与权限关联，表示角色可执行的操作';

ALTER TABLE `role_permissions`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `role_id` BIGINT NOT NULL COMMENT '角色外键，关联roles.id',
 MODIFY COLUMN `permission_id` BIGINT NOT NULL COMMENT '权限外键，关联permissions.id';

ALTER TABLE `menus` COMMENT='教师端和学生端动态菜单，按身份与权限过滤';

ALTER TABLE `menus`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `parent_id` BIGINT NULL COMMENT '父菜单外键，关联menus.id；为空表示一级菜单',
 MODIFY COLUMN `label` VARCHAR(64) NOT NULL COMMENT '菜单中文显示文字',
 MODIFY COLUMN `path` VARCHAR(120) NOT NULL COMMENT '前端路由路径，不是文件系统路径',
 MODIFY COLUMN `permission_code` VARCHAR(48) NOT NULL COMMENT '所需权限代码，外键关联permissions.code',
 MODIFY COLUMN `sort_order` INT NOT NULL DEFAULT 0 COMMENT '菜单排序值，较小值优先显示',
 MODIFY COLUMN `portal` VARCHAR(16) NOT NULL DEFAULT 'STUDENT' COMMENT '所属端：TEACHER教师端、STUDENT学生端';

ALTER TABLE `users` COMMENT='原站账户映射及模块访问状态，不存储密码或Token';

ALTER TABLE `users`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `external_user_id` BIGINT NOT NULL COMMENT '原站用户主键，唯一映射；身份由原站核验',
 MODIFY COLUMN `username` VARCHAR(64) NOT NULL COMMENT '原站用户名快照，仅用于显示，不用于鉴权',
 MODIFY COLUMN `role_id` BIGINT NOT NULL COMMENT '模块角色外键，关联roles.id；管理员以原站身份为准',
 MODIFY COLUMN `enabled` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '模块访问开关：1启用、0停用，不影响原站登录',
 MODIFY COLUMN `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最近通过原站核验的时间，UTC，毫秒',
 MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC，精确到毫秒';

ALTER TABLE `students` COMMENT='学生档案，与模块账户一对一关联';

ALTER TABLE `students`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `user_id` BIGINT NOT NULL COMMENT '账户外键，关联users.id，一账户一份档案',
 MODIFY COLUMN `student_no` VARCHAR(32) NULL COMMENT '学生学号，填写后唯一；待完善时可为空',
 MODIFY COLUMN `full_name` VARCHAR(64) NULL COMMENT '学生姓名；样例姓名为虚构，不含真实身份信息',
 MODIFY COLUMN `college` VARCHAR(100) NULL COMMENT '所属学院名称',
 MODIFY COLUMN `major` VARCHAR(100) NULL COMMENT '所学专业名称',
 MODIFY COLUMN `graduation_year` INT NULL COMMENT '预计毕业年份，四位年份，范围2000至2100',
 MODIFY COLUMN `contact` VARCHAR(100) NULL COMMENT '联系方式，例如邮箱或脱敏电话，最长100字符',
 MODIFY COLUMN `profile_state` VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT '档案状态：DRAFT待完善、COMPLETE已完善',
 MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最近业务更新时间，UTC，精确到毫秒';

ALTER TABLE `companies` COMMENT='招聘企业基础资料，停用后保留历史关联';

ALTER TABLE `companies`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `code` VARCHAR(32) NOT NULL COMMENT '唯一企业业务代码；DEMO前缀表示课程样例',
 MODIFY COLUMN `name` VARCHAR(120) NOT NULL COMMENT '企业显示名称，课程样例明确标注为示例',
 MODIFY COLUMN `industry` VARCHAR(64) NOT NULL COMMENT '企业所属行业名称',
 MODIFY COLUMN `contact` VARCHAR(100) NOT NULL COMMENT '招聘联系人及联系方式；样例使用演示邮箱',
 MODIFY COLUMN `description` TEXT NULL COMMENT '企业介绍，允许为空，样例不代表真实调查',
 MODIFY COLUMN `enabled` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '企业启用开关：0停止新岗位开放和新投递，保留历史',
 MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC，精确到毫秒';

ALTER TABLE `jobs` COMMENT='招聘岗位及名额，已录用人数由录用事务维护';

ALTER TABLE `jobs`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `company_id` BIGINT NOT NULL COMMENT '企业外键，关联companies.id，创建后不可变更',
 MODIFY COLUMN `title` VARCHAR(120) NOT NULL COMMENT '招聘岗位名称',
 MODIFY COLUMN `category` VARCHAR(64) NOT NULL COMMENT '岗位类别，例如技术、护理、运营',
 MODIFY COLUMN `city` VARCHAR(64) NOT NULL COMMENT '工作城市名称',
 MODIFY COLUMN `description` TEXT NOT NULL COMMENT '职责、任职条件、培养安排及样例薪酬说明',
 MODIFY COLUMN `planned_count` INT NOT NULL COMMENT '计划招聘人数，单位人，必须大于0',
 MODIFY COLUMN `filled_count` INT NOT NULL DEFAULT 0 COMMENT '已登记录用人数，单位人，不得超过计划名额',
 MODIFY COLUMN `deadline` DATETIME(3) NOT NULL COMMENT '新投递截止时间，UTC，毫秒',
 MODIFY COLUMN `status` VARCHAR(16) NOT NULL DEFAULT 'OPEN' COMMENT '岗位状态：OPEN开放、CLOSED关闭、ARCHIVED归档',
 MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC，精确到毫秒';

ALTER TABLE `resume_files` COMMENT='私有简历附件元数据，文件内容保存在MinIO';

ALTER TABLE `resume_files`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `owner_id` BIGINT NOT NULL COMMENT '附件所有者外键，关联users.id',
 MODIFY COLUMN `object_key` VARCHAR(200) NOT NULL COMMENT '私有桶内唯一对象键，由服务端生成，不直接公开',
 MODIFY COLUMN `original_name` VARCHAR(200) NOT NULL COMMENT '原文件显示名称，不含目录和控制字符',
 MODIFY COLUMN `content_type` VARCHAR(120) NOT NULL COMMENT '经内容验证的MIME类型，仅PDF或DOCX',
 MODIFY COLUMN `file_size` BIGINT NOT NULL COMMENT '文件大小，单位字节，范围1至10485760',
 MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC，精确到毫秒';

ALTER TABLE `applications` COMMENT='学生岗位投递主记录，同一学生同一岗位仅一条';

ALTER TABLE `applications`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `student_id` BIGINT NOT NULL COMMENT '学生外键，关联students.id',
 MODIFY COLUMN `job_id` BIGINT NOT NULL COMMENT '岗位外键，关联jobs.id；与学生共同唯一',
 MODIFY COLUMN `resume_file_id` BIGINT NULL COMMENT '可选简历附件外键，关联resume_files.id；需属于本人',
 MODIFY COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' COMMENT '投递状态：SUBMITTED、REVIEWING、INTERVIEWING、ACCEPTED、REJECTED、WITHDRAWN',
 MODIFY COLUMN `note` VARCHAR(1000) NULL COMMENT '求职说明或审核反馈，最长1000字符',
 MODIFY COLUMN `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '首次投递时间，UTC，毫秒；用于批次统计',
 MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最近业务更新时间，UTC，精确到毫秒';

ALTER TABLE `interview_rounds` COMMENT='投递的面试轮次与评价总分，完成后不可重评';

ALTER TABLE `interview_rounds`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `application_id` BIGINT NOT NULL COMMENT '投递外键，关联applications.id',
 MODIFY COLUMN `round_no` INT NOT NULL COMMENT '同一投递的面试轮次，正整数，组合唯一',
 MODIFY COLUMN `scheduled_at` DATETIME(3) NOT NULL COMMENT '预约面试时间，UTC，毫秒',
 MODIFY COLUMN `location` VARCHAR(200) NOT NULL COMMENT '面试地点或线上会议说明',
 MODIFY COLUMN `interviewer` VARCHAR(64) NOT NULL COMMENT '面试官姓名或称谓，支持教师与企业面试官',
 MODIFY COLUMN `status` VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED' COMMENT '面试状态：SCHEDULED待进行、COMPLETED完成、CANCELLED取消',
 MODIFY COLUMN `total_score` INT NULL COMMENT '后端计算的面试总分，单位分，0至100，未评分为空',
 MODIFY COLUMN `comment` VARCHAR(1000) NULL COMMENT '面试综合评价，最长1000字符',
 MODIFY COLUMN `completed_at` DATETIME(3) NULL COMMENT '评分提交完成时间，UTC，毫秒；未完成为空';

ALTER TABLE `evaluation_criteria` COMMENT='固定面试评分标准，三项上限合计100分';

ALTER TABLE `evaluation_criteria`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `code` VARCHAR(32) NOT NULL COMMENT '唯一评分项目代码：communication、professional、fit',
 MODIFY COLUMN `name` VARCHAR(64) NOT NULL COMMENT '评分项目中文名称',
 MODIFY COLUMN `max_score` INT NOT NULL COMMENT '项目评分上限，单位分，固定为30、40、30';

ALTER TABLE `interview_scores` COMMENT='每轮面试的评分明细，三项与总分事务提交';

ALTER TABLE `interview_scores`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `interview_id` BIGINT NOT NULL COMMENT '面试轮次外键，关联interview_rounds.id',
 MODIFY COLUMN `criterion_id` BIGINT NOT NULL COMMENT '评分项目外键，关联evaluation_criteria.id',
 MODIFY COLUMN `score` INT NOT NULL COMMENT '项目实际得分，单位分，0至上限',
 MODIFY COLUMN `max_score` INT NOT NULL COMMENT '评分时的上限快照，单位分，保留评价依据';

ALTER TABLE `employment_results` COMMENT='学生最终录用结果，每名学生仅登记一次';

ALTER TABLE `employment_results`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `student_id` BIGINT NOT NULL COMMENT '最终录用学生外键，唯一；关联students.id',
 MODIFY COLUMN `application_id` BIGINT NOT NULL COMMENT '最终录用申请外键，唯一；组合外键校验学生一致',
 MODIFY COLUMN `confirmed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最终录用登记时间，UTC，毫秒',
 MODIFY COLUMN `start_date` DATE NOT NULL COMMENT '预计入职日期，日期值，不含时区或时分秒',
 MODIFY COLUMN `remarks` VARCHAR(1000) NULL COMMENT '录用备注，例如培养安排，最长1000字符';

ALTER TABLE `audit_logs` COMMENT='模块操作记录，不包含密码、Token或文件内容';

ALTER TABLE `audit_logs`
 MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本表主键，自增业务记录编号',
 MODIFY COLUMN `actor_id` BIGINT NOT NULL COMMENT '操作者外键，关联users.id',
 MODIFY COLUMN `action` VARCHAR(64) NOT NULL COMMENT '业务操作代码，例如APPLY、SCORE、HIRE',
 MODIFY COLUMN `resource_type` VARCHAR(48) NOT NULL COMMENT '业务对象类别，例如application、interview',
 MODIFY COLUMN `resource_id` BIGINT NOT NULL COMMENT '对应业务记录编号，日志保留历史，不设多态外键',
 MODIFY COLUMN `detail` VARCHAR(2000) NOT NULL COMMENT '操作摘要，最长2000字符，不记录敏感凭据',
 MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间，UTC，精确到毫秒';

ALTER TABLE students ADD CONSTRAINT ck_complete_profile CHECK (profile_state='DRAFT' OR (student_no IS NOT NULL AND CHAR_LENGTH(TRIM(student_no))>0 AND full_name IS NOT NULL AND CHAR_LENGTH(TRIM(full_name))>0 AND college IS NOT NULL AND CHAR_LENGTH(TRIM(college))>0 AND major IS NOT NULL AND CHAR_LENGTH(TRIM(major))>0 AND graduation_year IS NOT NULL));

ALTER TABLE resume_files ADD CONSTRAINT ck_file_content_type CHECK (content_type IN ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'));


-- SOURCE: V4__student_report_identity_scope.sql
-- Teachers and administrators are not part of the student employment denominator.
CREATE OR REPLACE VIEW v_student_hiring_summary AS
 SELECT s.id,s.user_id,s.student_no,s.full_name,s.college,s.major,s.graduation_year,s.profile_state,u.enabled,
 COALESCE(ac.application_count,0) AS application_count,er.id AS employment_id,er.confirmed_at,er.start_date,
 j.title AS job_title,c.name AS company_name
 FROM students s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id
 LEFT JOIN (SELECT student_id,COUNT(*) AS application_count FROM applications GROUP BY student_id) ac ON ac.student_id=s.id
 LEFT JOIN employment_results er ON er.student_id=s.id LEFT JOIN applications ap ON ap.id=er.application_id
 LEFT JOIN jobs j ON j.id=ap.job_id LEFT JOIN companies c ON c.id=j.company_id
 WHERE r.code='USER';

