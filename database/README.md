# 数据库结构、初始化与复现

数据库代码随 GitHub 仓库保存，运行中的数据卷不属于 Git 文件。

| 存储 | 作用 | 本机运行地址 | 初始化依据 |
| --- | --- | --- | --- |
| PostgreSQL 16 + pgvector | 原站账户、简历、社区、简历市场、知识库资料与向量 | 127.0.0.1:15434 / interview_guide | docker/postgres/init.sql、app 实体及社区初始化代码 |
| MySQL 8.4 | 就业模块账户映射、学生、企业、岗位、投递、面试、评分、录用和日志 | 127.0.0.1:13308 / employment_course | course-app 的 V1-V4 Flyway 迁移 |
| Redis 7 | 缓存、Redis Stream 异步任务 | 127.0.0.1:16381 | Redis AOF 数据卷，由应用运行时写入 |
| MinIO | 简历、社区附件、知识库文件和就业附件 | API 19004；控制台 19005 | createbuckets 任务、社区和就业文件服务 |

用户本机 MySQL 3306 的 `employment_course` 是另外复制的查看和课程实验副本，网站不连接它，两个库不自动同步。该副本的账号和密码不作为其他开发者的部署凭据。

## 就业模块

15 张业务表：roles、permissions、role_permissions、menus、users、students、companies、jobs、resume_files、applications、interview_rounds、evaluation_criteria、interview_scores、employment_results、audit_logs。

另有 Flyway 自己维护的 `flyway_schema_history` 表。业务表共有 99 个字段，表和字段带中文 COMMENT。三个报表视图为 `v_application_detail`、`v_job_recruitment_summary`、`v_student_hiring_summary`。

权威迁移位于 `course-app/src/main/resources/db/migration/`。服务启动时自动应用迁移，JPA 使用 validate；不要修改已经执行成功的迁移。`employment/schema-for-study.sql` 是按 V1-V4 顺序合并的课程阅读版本，只用于新空库的结构实验，**不能用它直接初始化之后再启动 Flyway 服务**，因为它没有 Flyway 迁移历史。实际部署始终由 Flyway 初始化。

字典、主外键、唯一和检查约束、索引、ER 图和事务查询示例位于 `docs/employment/`。模块 users 只映射原站身份，不保存密码。

样例复现使用 `python scripts/employment_acceptance.py seed`：通过原站正常注册演示账号、显式建立一个独立演示管理员，再建立 10 家企业、20 个岗位、30 名学生、60 条投递及面试和录用记录。企业和学生是明确标注的虚构教学样例。脚本会调用真实业务接口验证状态与权限。随机演示密码、导入清单和验收证据保存在被 Git 忽略的 `verification/employment/`，不要公开它们。

## 原站和简历市场

`postgres/schema-for-study.sql` 是本次运行数据库的纯结构快照，不含用户记录、密码哈希、聊天、真实投递或上传文件内容。新部署由旧后端 JPA 和初始化代码创建结构，纯结构快照供课程阅读；它可能包含需要 pgvector 扩展的表，不是 MySQL SQL。

社区示例源位于 `app/src/main/resources/db/community-discussion-examples.*`，启动时按版本幂等导入。简历市场有 65 条公开模板元数据，原始源数据为 `scraper/resume_template/templates.json`，本地预览图在 `frontend/public/resume-template-previews/`。新环境先启动原后端，再执行 `python scripts/import-resume-market.py` 导入元数据，不需要安装 Python 数据库驱动。可阅读的公开数据 SQL 同时保存在 `postgres/resume-market-seed.sql`，按 source_id 只插入缺失条目。两份已打包 Word 模板保留在 `app/src/main/resources/resume-templates/word/`，后端启动时按固定资源白名单登记下载信息；它们是本项目的公开模板资源，用户私有上传文件不存放在此目录。

## 备份与持久化

MySQL 独立数据卷 `interview-submit_employment_mysql_data`；原站的 PostgreSQL、Redis 和 MinIO 使用各自的数据卷。停止或重建容器时保留这些卷，不要执行 `down -v`。

`python scripts/employment_acceptance.py backup` 在本机导出 MySQL，并在隔离容器实际恢复、比较业务表及三个视图。备份文件留在 `verification/`，不上传 GitHub。附件元数据不是文件本身，完整恢复还需保留 MinIO 私有桶及对象；GitHub 无法代替数据备份。

本机副本创建脚本为 `scripts/copy_employment_to_local_mysql.py`，仅允许新库，拒绝覆盖已有库。密码从当前进程环境传入，视图定义者绑定目标导入账户。
