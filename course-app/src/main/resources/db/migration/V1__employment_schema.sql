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
