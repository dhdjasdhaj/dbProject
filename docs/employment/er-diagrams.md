# 组织、业务、数据流和 ER 图

## 组织职能

```mermaid
flowchart TD
 A[高校就业服务中心教学案例] --> B[管理员：模块授权与维护]
 A --> C[教师：招聘与面试管理]
 A --> D[学生：档案与求职申请]
```

## 业务与数据流

```mermaid
flowchart LR
 A[原站登录] --> B[服务端核验身份]
 B --> C[模块账户与权限]
 D[学生档案与附件] --> E[岗位投递]
 F[企业与岗位资料] --> E
 C --> E
 E --> G[审核与面试轮次]
 G --> H[评分明细与总分事务]
 H --> I[名额与录用登记事务]
 I --> J[视图：招聘汇总与就业明细]
 J --> K[查询、CSV、打印报表]
```

## 全局 ER 图

```mermaid
erDiagram
 roles ||--o{ users : module_role
 roles ||--o{ role_permissions : grants
 permissions ||--o{ role_permissions : allowed_action
 permissions ||--o{ menus : controls
 menus o|--o{ menus : parent
 users ||--|| students : profile
 users ||--o{ resume_files : owns
 users ||--o{ audit_logs : operates
 companies ||--o{ jobs : publishes
 students ||--o{ applications : submits
 jobs ||--o{ applications : receives
 resume_files o|--o{ applications : optional_attachment
 applications ||--o{ interview_rounds : rounds
 interview_rounds ||--o{ interview_scores : items
 evaluation_criteria ||--o{ interview_scores : standard
 students ||--o| employment_results : final_result
 applications ||--o| employment_results : confirmed
```

## 概念设计说明

学生与岗位通过 applications 建立多对多关系；面试轮次与评分明细拆表展示主从结构。录用同时关联申请及其学生，并用组合外键确保两者一致。模块 users 只映射原站账户，不包含密码；模块教师身份不改变原站 USER 身份。

局部授权分图由 roles、permissions、role_permissions、menus 和 users 组成；局部招聘分图由 students、companies、jobs、applications、interview_rounds、evaluation_criteria、interview_scores、employment_results 和 resume_files 组成。两图通过 users 合并，audit_logs 记录跨模块操作。
