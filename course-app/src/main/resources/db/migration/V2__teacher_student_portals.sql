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
