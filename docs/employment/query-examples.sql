-- Run in employment_course. Read-only demonstrations unless explicitly marked otherwise.
SELECT * FROM v_application_detail ORDER BY id DESC LIMIT 20;
SELECT * FROM v_job_recruitment_summary ORDER BY hired_count DESC;
SELECT * FROM v_student_hiring_summary WHERE graduation_year=2027 ORDER BY id;

-- Multiple rounds must not multiply applicant totals.
SELECT j.id,j.title,COUNT(DISTINCT a.id) AS applicants,
       COUNT(DISTINCT CASE WHEN ir.status='COMPLETED' THEN a.id END) AS interviewed
FROM jobs j LEFT JOIN applications a ON a.job_id=j.id
LEFT JOIN interview_rounds ir ON ir.application_id=a.id
GROUP BY j.id,j.title HAVING COUNT(DISTINCT a.id)>0;

-- Reconciliation: should return zero rows.
SELECT j.id,j.filled_count,COUNT(er.id) AS registered
FROM jobs j LEFT JOIN applications a ON a.job_id=j.id
LEFT JOIN employment_results er ON er.application_id=a.id
GROUP BY j.id,j.filled_count HAVING j.filled_count<>COUNT(er.id);

-- Inspect constraints and indexed access.
SHOW CREATE TABLE applications;
SHOW CREATE TABLE interview_scores;
SHOW INDEX FROM interview_rounds;
EXPLAIN ANALYZE SELECT * FROM v_application_detail ORDER BY id DESC LIMIT 20;

-- Demonstrate rollback without modifying any record permanently.
START TRANSACTION;
SELECT id,planned_count,filled_count FROM jobs ORDER BY id LIMIT 1 FOR UPDATE;
ROLLBACK;

-- Illegal INSERT/UPDATE examples are executed in acceptance scripts on dedicated test rows.
-- No procedure or trigger is required by the guide. The fault-injection trigger used during
-- acceptance is temporary and is removed in finally; it is not a production business trigger.
