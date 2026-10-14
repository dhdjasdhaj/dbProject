# 就业模块部署、使用与回退

## 本机部署

项目目录：`D:\clone-interview-rag-submit`。需要 Docker Desktop、JDK 21 和 Node.js。

```powershell
Set-Location D:\clone-interview-rag-submit
.\scripts\deploy-employment.ps1
```

脚本从当前代码编译两个后端和前端，打包 Docker 运行镜像后接入现有网站。首次运行为 MySQL 生成独立随机密码并写入被忽略的 `.env`，保留既有密码。不要在已经初始化数据卷之后只修改密码变量，应通过 MySQL 正规修改密码流程同步账户。

标准多阶段构建也可使用：

```powershell
docker compose up -d --build --wait --wait-timeout 180
```

2026-10-14 修复了普通部署遗漏就业容器的问题：默认 `docker-compose.override.yml` 通过 extends 引用就业服务定义，直接执行 `docker compose up` 也会包含 course-app 和 course-mysql。已有镜像时使用 `.\scripts\start-project.ps1`，脚本等待各服务健康并验证网站代理的就业健康接口。显式合并原先三个文件的命令仍兼容。数据卷及密码保持原值，本机 3306 查看副本不参与此次运行修复。

如果模块停止，Nginx 返回带“就业服务暂不可用”说明的 JSON 503，页面保留登录并提供重新连接；原站接口继续使用原转发路径。检查命令为 `docker compose ps -a`、`docker compose logs --tail 100 course-app course-mysql`。

部署恢复回归脚本为 `node scripts/verify-employment-recovery.cjs`，使用本机已有的演示凭据，短暂停止就业模块后通过默认整站启动脚本恢复，不删除容器或数据卷。2026-10-14 实测 7 项通过：默认服务包含就业模块、停机 JSON 提示、登录态保留、原站登录及 65 个模板可用、学生重新连接、教师工作台恢复、投递及录用数据一致。脚本 finally 在失败时也尝试恢复服务；不建议在有其他人使用就业模块时运行。证据和恢复后的截图在本机 `verification/employment`。

本次 Docker Hub 的 Gradle 构建镜像下载失败，所以实际使用本机编译脚本。部署脚本每次编译当前源码，不依赖固定旧 jar。不要跳过源码构建后直接把旧编译文件当成新版本。

网站入口：`http://localhost:18181/employment`，按身份自动进入教师端 `/employment/teacher` 或学生端 `/employment/student`。学生访问教师地址会返回学生端，后端也拒绝管理接口。健康接口：`http://localhost:18181/api/course/health`。后端：`127.0.0.1:18184`。MySQL：`127.0.0.1:13308`，库 `employment_course`，用户名 `employment`，密码见本机 `.env` 的 COURSE_MYSQL_PASSWORD。

## 演示与验证

就业导航已改为独立玻璃悬浮面板：只在 `/employment` 及其子页面挂载；桌面端固定在左侧，内容区为它保留空间，滚动时保持在顶部导航下方。切换到其他模块会卸载面板并取消占位。指针靠近菜单时使用参考组件的 spring=0.19、damping=0.7 和 proximity=122 实现轻微弹性放大，选中项依据真实路由高亮。面板通过 React Portal 放到 body，避免页面的 transform 或 backdrop-filter 改变 fixed 定位。

900px 及以下宽度使用可收起的浮动导航面板。进入模块时展开，选择菜单、点击关闭或按 Escape 可收起，通过左下角“就业导航”重新打开。教师和管理员长菜单在面板内部滚动；系统减少动态效果设置会停用放大动画；打印报表会隐藏悬浮面板。`node scripts/verify-employment-floating-dock.cjs` 验证路由显示与卸载、桌面占位、滚动固定、320px 短屏、键盘焦点和打印等行为，真实证据保存于 `verification/employment`。

```powershell
python scripts/employment_acceptance.py seed
python scripts/realistic_employment_samples.py
python scripts/employment_acceptance.py attach-demo
python scripts/employment_acceptance.py verify
python scripts/employment_acceptance.py performance
python scripts/employment_acceptance.py backup
python scripts/employment_acceptance.py lifecycle
node scripts/verify-employment-ui.cjs
python scripts/cleanup_employment_verification.py
```

演示用户名为 `course_demo_admin`、`course_demo_staff`、`course_demo_student_01` 至 `course_demo_student_30`。随机密码位于本机 `verification/employment/demo-credentials.json`，不写入源码、报告或镜像。原站管理员账户也可以直接管理就业模块，无需使用演示管理员。

seed 只首次生成数据，已有清单时不重复生成、不重置密码。verify 显式生成带验收标识的测试账户和记录，并短暂修改测试用约束与角色授权，finally 恢复临时状态。不要在存在真实并发业务的生产时段运行验收脚本。

performance 使用独立临时数据库；backup 使用无宿主机端口的临时 MySQL 容器恢复，不覆盖当前数据库；lifecycle 会短暂停止就业模块并重启它自己的 MySQL 来验证原站隔离和持久化。测试结果在 `verification/employment`，不包含公开可用的生产密码。

cleanup 脚本只删除本机验收凭据清单中、名称明确为 course_verify 的临时账户及其业务记录和私有对象，保留 DEMO 样例、原有账户和测试证据。不要手动用宽泛条件清空业务表。当前演示环境已移除验收杂项，保留 30 名学生、60 条投递、20 个岗位、12 条录用和两份示例简历附件。

## 本机 MySQL 与 IDEA 查看副本

2026-10-13 已将就业模块复制到用户已有的 MySQL 8.0.42：`127.0.0.1:3306`，库名 `employment_course`，账户为用户提供的“数据库项目”。密码继续使用用户本机已保存的值，不写入源码或报告。IDEA 项目数据源 URL 已补为 `jdbc:mysql://localhost:3306/employment_course`；若 IDEA 尚未刷新，重新选择这个库并同步。

核对结果：15 张业务表、99 个完整中文注释字段、3 个视图，10 家示例企业、20 个岗位、30 名已完善档案的学生、60 条投递、36 轮面试、84 条评分、12 条录用、2 条附件元数据。4 条 Flyway 迁移均成功，三个视图可以直接查询。另有一张 Flyway 版本管理表，不属于 15 张业务表。

本机库是此次复制时的查看和课程实践副本，网站仍连接 Docker MySQL 13308。两个库不会自动同步；在本机库做 SQL 实验不会改变网站页面数据。原站 PostgreSQL、其他本机课程库均未迁移或覆盖。附件二进制仍位于现有 MinIO 私有桶，本机表只保存对象键和元数据。

可复用 `scripts/copy_employment_to_local_mysql.py --user 数据库项目 --database 新的空库名` 创建其他副本；密码通过当前进程的 `EMPLOYMENT_TARGET_MYSQL_PASSWORD` 环境变量传入。脚本拒绝覆盖任何已存在的库，并保存源备份、逐表统计和注释检查证据至本机 `verification/employment`。跨服务器复制时将视图定义者绑定到导入账户，避免缺失 Docker 用户导致视图不可查询。

## 共享认证与附件

原站 `/api/auth/me` 为身份来源。课程服务不可自行创建管理员，STAFF 只存于模块 MySQL。原站认证停机时模块受保护请求不可用；已有登录态不会因为上游超时被自动清除。

附件存入 `employment-course` 私有桶。MySQL 备份包含对象键，不包含对象本身。完整文件恢复须备份现有 MinIO 数据卷或该桶。两个 Word 模板仍来自旧后端资源，下载接口保持不变。

## 回退

首次部署前旧镜像保存为 `interview-submit-app:before-employment` 和 `interview-submit-frontend:before-employment`，PostgreSQL 备份位于本机 `verification/employment/backup/postgres-before.dump`。回退运行镜像不需要恢复或覆盖旧数据库。

```powershell
docker tag interview-submit-app:before-employment interview-submit-app:latest
docker tag interview-submit-frontend:before-employment interview-submit-frontend:latest
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --no-build --no-deps app frontend
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.employment.yml stop course-app course-mysql
```

不要执行 `down -v`，不要删除或复用原站数据卷。课程配置包含新的独立 MySQL 数据卷。回退命令为操作手册；本次未对运行环境执行整站回退。

## 十分钟演示脚本

1. 原站登录，点击就业管理，展示三类身份和动态菜单。
2. 展示企业与岗位、学生档案及其表关系。
3. 学生投递，教师开始审核并安排面试。
4. 提交三项评分，说明明细、总分与日志的事务。
5. 登记录用，展示剩余名额和幂等处理。
6. 查询视图、统计并导出 CSV 或打印 PDF。
7. 展示回滚、并发和恢复的真实验收记录，下载两个 Word 模板。
