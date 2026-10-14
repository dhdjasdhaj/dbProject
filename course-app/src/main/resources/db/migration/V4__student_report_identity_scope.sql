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
