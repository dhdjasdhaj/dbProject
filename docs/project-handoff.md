# 项目改造交接清单

项目代码、数据库说明与 Docker 部署文件统一保存在本仓库，下面按功能定位，便于其他开发者克隆后维护。当前网页端口为 18181。

## 本次改造

| 功能 | 前端位置 | 后端及数据位置 |
| --- | --- | --- |
| 顶部悬浮导航与默认头像 | frontend/src/components/layout、frontend/src/authStorage.ts、frontend/src/hooks/useProfile.ts | app/modules/auth，管理员启动变量见 .env.example |
| 管理员登录和用户目录 | frontend/src/pages/LoginPage.tsx、AdminUsersPage.tsx | app/modules/auth/web/AdminUserController.java；PostgreSQL users |
| 社区、图文讨论与审核 | frontend/src/pages/CommunityPage.tsx、components/community、public/community | app/modules/community、resources/db/community-discussion-examples.*；PostgreSQL；私有附件桶 |
| 65 个简历市场预览及两份 Word 下载 | frontend/src/pages/ResumeTemplateLibraryPage.tsx、public/resume-template-previews | app/modules/template、resources/resume-templates/word；scraper/resume_template/templates.json |
| 教师端与学生端就业管理 | frontend/src/course | course-app/src/main/java/interview/course；MySQL employment_course |
| 左侧 Glass Dock 悬浮面板 | frontend/src/course/EmploymentDock.tsx、employmentDock.css；Layout.tsx 的就业模式 | 仅就业路由挂载，菜单来源为 /api/course/menus |

表内 app/modules 指 `app/src/main/java/interview/guide/modules/`，resources 指 `app/src/main/resources/`。

悬浮面板独立挂载到 body，桌面预留内容空间，手机可收起，切换原站模块时卸载。教师可查看学生资料、简历投递、面试、评分、录用和报表；学生仅访问本人资料与业务结果。管理员继承原站身份，工作人员只在就业模块生效。业务权限和归属校验位于后端，不靠前端隐藏按钮保证安全。

## 数据库与文件

就业 MySQL 的 15 张表、99 个中文注释字段与 3 个视图由 V1-V4 Flyway 管理，JPA validate。字典、ER 图、事务示例、课程报告见 `docs/employment/`。纯结构 SQL 参考与各存储用途见 `database/README.md`。

原站认证与旧业务仍用 PostgreSQL/pgvector，Redis 管理缓存与异步消息，MinIO 管理对象文件。课程服务通过内部网络核验原站 Token，不复制原站 JWT 密钥，也不保存原站密码。AI 业务密钥与就业业务无关，登录和就业可独立演示。

MySQL 13308 是网站运行库。本机 MySQL 3306 是用户建立的查看副本，不自动同步。公开仓库保存结构和虚构样例生成代码，不保存真实账户、个人上传文件、数据库密码及数据卷。

## 主要就业业务接口

所有课程接口都携带原站 Bearer Token，统一返回 Result；列表默认每页 20 条、最多 100 条，后端控制排序字段与角色范围。

| 路径 | 业务 |
| --- | --- |
| GET /api/course/me、/menus | 当前身份、个人档案与可用菜单 |
| /api/course/students、/students/me | 教师学生目录及学生本人档案 |
| /api/course/companies、/jobs | 企业和招聘岗位 |
| /api/course/applications | 本人投递或教师审核目录 |
| POST /applications/{id}/withdraw、/review、/reject | 状态转换，均位于 /api/course 前缀下 |
| /api/course/interviews；POST /interviews/{id}/scores | 面试安排、三项评分和原子提交 |
| /api/course/employment-results | 最终录用，幂等与招聘名额事务 |
| /api/course/reports | 三类报表、覆盖比例与 CSV 导出 |
| /api/course/files | PDF、DOCX 授权上传与下载 |
| /api/course/admin/users、/admin/permissions | 模块身份、启用状态及角色权限 |
| GET /api/admin/users/{id} | 原站管理员只读核对账户信息 |

## Docker 文件与运维

- `docker-compose.yml`：原站基本服务。
- `docker-compose.override.yml`：本项目独立容器名、端口、默认接入就业服务。
- `docker-compose.employment.yml`：就业后端、MySQL、独立卷及依赖检查。
- `frontend/nginx.conf`：就业 API 与原站 API 分流；就业停机返回明确 JSON 503。
- `course-app/Dockerfile`、`app/Dockerfile`、`frontend/Dockerfile`：标准构建。
- `docker/employment/Dockerfile.runtime`、`scripts/deploy-employment.ps1`：本机编译后构建运行镜像的备用部署方式。
- `scripts/init-local-config.ps1`：首次配置生成，已有配置不覆盖。
- `scripts/start-project.ps1`：启动已有镜像、等待健康并验证就业转发。

原站和就业的数据库卷相互独立。首次部署管理员由本机 .env 配置，不将当前机器的管理员密码写入公开文档。新机器应使用自己的账号和随机密码。

## 可复现验证

就业业务：`scripts/employment_acceptance.py`。数据库完整性和注释：迁移及字典。恢复与模块隔离：`scripts/verify-employment-recovery.cjs`。玻璃悬浮面板：`scripts/verify-employment-floating-dock.cjs`；其他课程页面：`scripts/verify-employment-ui.cjs`。社区和模板另有 verify-community、verify-template-downloads 脚本。

真实验收结果及课程报告在 `docs/employment/`。截图、凭据和备份的本机原始证据在被 Git 忽略的 `verification/`，没有作为新机器自动继承的登录凭据。验收脚本可能创建测试账号或短暂停止模块，运行范围与清理方法见部署说明。

## GitHub 上传前

阅读 `docs/github-upload.md`，运行 `python scripts/check-github-upload.py`。目标仓库为 https://github.com/dhdjasdhaj/dbProject 。首次公开上传使用当前检查过的工作树快照；原项目提交历史保留在本机，不随快照发布。
