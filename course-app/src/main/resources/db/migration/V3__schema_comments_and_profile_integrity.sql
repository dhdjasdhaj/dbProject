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
