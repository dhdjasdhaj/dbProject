# GitHub 上传与新机器部署

## 本次准备内容

本仓库包含完整前后端源码、教师与学生就业模块、玻璃悬浮菜单、社区和简历市场、Docker 和 Nginx 配置、环境变量示例、数据库迁移与字段字典、虚构数据生成脚本以及课程报告。

`.gitignore` 排除 .env、IDEA 配置、依赖、编译产物、运行日志、verification 私有凭据与数据库备份、data 私有上传目录、tmp 页面渲染和 output 重复导出。正式课程 PDF 位于 `docs/employment/course-report.pdf`，保留在待上传文件中。应用自带的两个公开 Word 模板与 65 个预览资源继续保留，以便重新部署可以下载和显示。

## 上传步骤

在项目目录执行：

```powershell
python scripts/check-github-upload.py
git status --short
git add .
git diff --cached --stat
git commit -m "Add employment portals, database design and Docker deployment"
```

目标仓库为 https://github.com/dhdjasdhaj/dbProject 。检查 `git remote -v` 后，将当前分支推送到目标仓库。不要把实际 Token 写入源码或远程地址。首次公开上传采用当前文件快照，原项目历史留在本机；后续改动可以正常提交和推送。

检查脚本只读扫描 Git 当前已跟踪和未忽略的候选文件，核对必要交付文件、当前 .env 私密值是否出现在候选文本中、明显的 API Key 模式和本地备份路径，以及较大文件。它不能替代全面的历史审计；如果秘密曾经提交过，后加 .gitignore 不会清除提交历史。

## 克隆后部署

需要 Docker Desktop、JDK 21、Node.js 和 Python 3（生成样例数据时）。Compose 需要支持此仓库使用的 `!override` 标签。

```powershell
git clone <你的仓库地址>
cd <仓库目录>
.\scripts\init-local-config.ps1
.\scripts\deploy-employment.ps1
python scripts/import-resume-market.py
```

首次配置脚本仅在 .env 不存在时创建它，为管理员和 MySQL 生成随机密码，不会更改已有密码。新管理员用户名默认为 site_admin，密码查看新机器自己的 .env；不使用原电脑的管理员凭据。可在首次启动前改成所需用户名与密码。已有数据卷不可通过随意替换环境变量来重置数据库或管理员密码。

登录与就业演示不必填写真实 AI 密钥；AI、向量嵌入和语音视频能力需按服务商另行配置。DeepSeek 文本密钥不能代替所有语音、视频和 embedding 服务的密钥。

网页：`http://localhost:18181`；就业模块：`http://localhost:18181/employment`。日常启动使用 `scripts/start-project.ps1`。标准 Docker 多阶段构建可使用 `docker compose up -d --build --wait --wait-timeout 180`，但本机编译脚本可避免 Gradle 构建镜像拉取问题。

需要课程样例时执行 `python scripts/employment_acceptance.py seed`。脚本显式创建新的演示管理员、教师和学生，不复制原机器真实账号，也不修改真实账号密码。随机演示凭据和清单保存在本机 verification 下，不加入 Git。测试步骤和模块回退见 `docs/employment/deployment.md`。

## 真实数据迁移

Git 仓库不包含运行中的 PostgreSQL、MySQL、Redis 或 MinIO 数据卷。仅克隆代码不会恢复旧用户、真实投递、聊天和上传附件。数据库结构由应用创建，公开示例由代码复现。

如需把真实业务迁到另一台电脑，应私下保存数据库和对象存储备份，再按部署说明恢复；不要上传这些备份到公开 GitHub。就业 MySQL 的 resume_files 只是元数据，必须与对应私有存储桶一起备份。
