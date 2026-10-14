# AI Interview · 简历与高校就业管理平台

同一个网站提供简历管理、简历市场、社区讨论、AI 面试、知识库与问答助手，并新增符合数据库课程实践的高校就业管理模块。就业模块复用原站登录，分为教师端和学生端，业务事实独立保存在 MySQL。

## 当前技术栈

- 前端：React 18、TypeScript、Vite、Framer Motion、Lucide。
- 原后端：Java 21、Spring Boot 4.0.1、Spring AI；PostgreSQL 16 + pgvector。
- 就业后端：独立 course-app，Spring Boot、JPA validate、JDBC、Flyway、MySQL 8.4。
- 缓存和异步消息：Redis 7、Redis Stream。
- 文件：MinIO；就业及社区附件使用私有桶并通过后端授权下载。
- 部署：Docker Compose + Nginx；就业 API 按 /api/course/ 分流。

## 已实现功能

- 顶部悬浮导航、默认头像、管理员登录与账户目录。
- 社区频道、20 条原创图文讨论示例、评论评分、举报和管理员维护。
- 简历市场 65 个预览卡片，前两个模板可下载项目内打包的 Word 原文件。
- 教师查看全体学生档案与简历投递，维护企业和岗位，审核、安排多轮面试、评分、录用和报表。
- 学生维护本人档案、浏览岗位、投递和撤回、查看自己的面试与录用。
- 就业导航使用独立玻璃悬浮窗口，只在就业模块显示；手机支持收起，教师长菜单内部滚动。
- 评分和录用事务、最后名额并发保护、权限与数据归属校验、CSV 导出和打印报表。

AI、嵌入、语音及视频功能取决于相应服务商的有效密钥。原站登录与就业流程不调用 AI，可以在未配置真实 AI 密钥时演示。

## Windows 首次部署

需要 Docker Desktop、JDK 21、Node.js；Python 3 用于导入公开模板和生成课程演示数据。

```powershell
# 在克隆得到的仓库目录执行
.\scripts\init-local-config.ps1
.\scripts\deploy-employment.ps1
python scripts/import-resume-market.py
```

首次配置仅在 .env 不存在时生成独立随机密码。新机器的管理员用户名默认为 site_admin，密码查看该机器的 .env；已有管理员配置和数据不会被初始化脚本覆盖。不要将 .env 上传 GitHub。

deploy-employment.ps1 从当前源码编译并构建三个运行镜像，启动原站与就业服务并等待就绪。默认 Compose 配置已包含就业后端与 MySQL。也可以使用标准多阶段 Docker 构建：

```powershell
docker compose up -d --build --wait --wait-timeout 180
```

已有镜像的日常启动：

```powershell
.\scripts\start-project.ps1
```

## 地址与数据库

| 服务 | 本机地址 |
| --- | --- |
| 网站 | http://localhost:18181 |
| 就业管理 | http://localhost:18181/employment |
| 管理员登录 | http://localhost:18181/login?mode=admin |
| 原后端 | 127.0.0.1:18182 |
| 就业后端 | 127.0.0.1:18184 |
| PostgreSQL / interview_guide | 127.0.0.1:15434 |
| 就业 MySQL / employment_course | 127.0.0.1:13308 |
| Redis | 127.0.0.1:16381 |
| MinIO API / 控制台 | 127.0.0.1:19004 / 19005 |

MySQL 有 15 张业务表、99 个中文注释字段和 3 个报表视图，另外还有 Flyway 迁移历史表。本机 3306 的 MySQL 是用户自行安装并复制的课程查看副本，网站仍连接 Docker MySQL 13308，二者不会自动同步。

数据库结构由代码复现，GitHub 不保存数据库卷、真实账号、上传附件或密钥。不要执行 docker compose down -v，以免删除本机数据。

## 课程演示数据

```powershell
python scripts/employment_acceptance.py seed
```

生成 10 家虚构企业、20 个岗位、30 名学生、60 条投递及面试、评分和录用样例。脚本显式创建演示账号，随机凭据写入被 Git 忽略的 verification/employment。已有导入清单时不会重复生成或重置密码。

## 代码与文档

| 位置 | 内容 |
| --- | --- |
| frontend/src/course | 就业页面、玻璃悬浮导航与 API 封装 |
| course-app | 独立就业后端、完整性规则及 V1-V4 迁移 |
| app | 原站认证、社区、简历市场与 AI 功能 |
| docker-compose*.yml、docker/ | Docker 构建与默认部署配置 |
| database/ | 数据库存储说明和纯结构课程参考 SQL |
| docs/project-handoff.md | 本次改造的前后端、数据库和 Docker 定位清单 |
| docs/github-upload.md | 上传检查与新机器部署 |
| docs/employment/ | 字段字典、ER 图、课程报告、部署与实际验收记录 |
| scripts/ | 首次配置、编译部署、数据初始化和验证脚本 |

上传前运行 python scripts/check-github-upload.py，再检查 git status。该检查不会提交或推送远程仓库。

## 验证

```powershell
.\gradlew.bat :course-app:test
node scripts/verify-employment-ui.cjs
node scripts/verify-employment-floating-dock.cjs
```

浏览器脚本需要 Chrome 和 Playwright，运行凭据来自本机 seed 生成的 verification 文件。完整业务、恢复、并发与模块隔离测试见 docs/employment/deployment.md，其中部分测试会短暂停止服务或生成临时测试记录，应按说明运行。
