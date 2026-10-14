# 本机 Docker 部署

```powershell
Set-Location -LiteralPath 'D:\clone-interview-rag-submit'
docker compose up -d --build --wait --wait-timeout 180
docker compose ps -a
```

Compose 自动合并 `docker-compose.override.yml`，项目名为 `interview-submit`。
容器、网络、数据卷均与另一份面试项目分开。

就业后端与独立 MySQL 已接入默认配置，不必手动添加第三个 Compose 文件。已有镜像时可执行 `.\scripts\start-project.ps1` 启动整站并等待就绪；修改源码后的部署可执行 `.\scripts\deploy-employment.ps1`。不要只启动原站的几个容器而遗漏就业服务。

| 服务 | 地址或端口 |
| --- | --- |
| 网页 | http://localhost:18181 |
| 后端 API | http://localhost:18182 |
| 后端健康检查 | http://localhost:18182/api/resumes/health |
| API 文档 | http://localhost:18182/swagger-ui.html |
| MinIO API | http://localhost:19004 |
| MinIO 控制台 | http://localhost:19005 |
| PostgreSQL | 127.0.0.1:15434 |
| Redis | 127.0.0.1:16381 |
| 就业管理 | http://localhost:18181/employment |
| 就业后端 | 127.0.0.1:18184 |
| 就业 MySQL | 127.0.0.1:13308 |

除网页外，其余服务仅绑定本机回环地址。常驻容器配置了 `unless-stopped`。
MinIO 使用原项目账号 `minioadmin` / `minioadmin`。
`createbuckets` 是初始化任务，成功退出属于正常状态。
首次使用请注册账号。

`.env` 从本项目 `.env.example` 初始化，尚未填写真实 AI 密钥。
启动配置的 `local-key-not-configured` 占位值仅用于允许应用启动，不能调用 AI。
填写有效的 `AI_API_KEY`、对应的 `AI_BASE_URL` 和 `AI_MODEL` 后，执行
`docker compose up -d --force-recreate app`。语音、视频还需对应服务商密钥。

MinIO / mc 使用 `docker/minio/Dockerfile` 从官方固定版本源码构建，避开已无法拉取的原镜像。
前端使用项目已有的 `package-lock.json`，通过 `npm ci` 在 Docker 内构建。
`.dockerignore` 排除了密钥文件、本地依赖和构建产物。

```powershell
docker compose logs --tail 100 app
docker compose stop
docker compose up -d
```

`docker compose down` 保留数据卷；需要保留数据时不要使用 `down -v`。

## 重新部署验证（2026-10-13）

已按当前源码执行 `docker compose build app frontend`，再执行 `docker compose up -d --no-build --pull never`，复用已有 MinIO 镜像及 `interview-submit` 数据卷。网站端口继续使用 18181，部署前检查无监听或其他容器端口冲突。

前后端构建完成，五个常驻服务健康，存储桶初始化退出码 0；网站、后端直连、前端 API 代理、MinIO 健康接口均返回 HTTP 200，Nginx 配置校验通过，Redis 返回 PONG，PostgreSQL 的 vector 扩展可用。已有 3 个用户、65 个模板和 20 条社区精选记录可正常读取；65 张本地 PNG 预览均可访问。

Chrome 实测登录页、管理员登录接口、七项导航、简历市场、默认头像菜单、管理员用户目录、直接刷新，以及市场页 1440 / 390 / 320px 布局通过，无运行时异常。此轮验收仅查询已有数据，没有创建测试账号或帖子，没有删除数据卷。

## 验证结果（2026-10-12）

- 5 个常驻服务均为 `healthy`，存储桶初始化任务退出码为 0。
- 网页、API 代理、Swagger、MinIO 健康接口和控制台均返回 HTTP 200。
- PostgreSQL 的 `vector` 扩展可用，Redis 返回 `PONG`。
- Chrome 实测注册、登录、简历库路由、登录后的数据库接口和移动端登录页面通过，无 JavaScript 异常。
- 临时验证账号已清理；AI 功能因缺少真实密钥未调用。
- 已检查系统监听端口及运行和停止容器的保留端口，新的端口没有重复。

## 社区与管理员（2026-10-12）

社区入口：`http://localhost:18181/community`；管理入口：`/community/admin`。

- 两个频道：交流讨论、社区公告。社区的“简历模板”频道已移除；原有模板帖子迁移到“简历表达”讨论，保留数据和附件。网站简历生成器的模板选择功能保留。
- 讨论按简历表达、面试复盘、技术交流、成长计划、求职沟通五个话题筛选，每页 12 条。普通用户讨论直接公开；公告仅管理员可发布。
- 支持 Markdown 正文、评论、1～5 星评价、修改建议、搜索、分页、可选附件下载和举报。同一用户对同一帖子只能评星一次，可继续发表建议。附件支持 PDF / DOC / DOCX / UTF-8 TXT，最大 10MB，不强制上传。
- “我的分享”显示待审核、已驳回、已下架内容及管理员反馈。作者只能删除自己的帖子和评论。
- 管理员可以切换用户视图和管理视图，审核通过、驳回、下架、恢复、置顶、删除帖子、清理评论、处理举报。切换视图不改变数据库权限，普通用户无法自行成为管理员。

本机已经在未跟踪的 `.env` 中配置独立的管理员账号：`APP_ADMIN_USERNAME` 与 `APP_ADMIN_PASSWORD`。请用其中的账号密码在普通登录页登录；不要把 `.env` 提交到 Git。
新部署需要设置这两个变量，并执行 `docker compose up -d --build`。首次启动创建 ADMIN 用户；已有管理员的密码不会因重启或改动环境变量而重置，也不会把同名普通账号自动提升为管理员。

帖子、评论、评分、举报和角色保存在 PostgreSQL 数据卷，讨论附件保存在 MinIO 数据卷中的私有 `community-templates` 桶。下载接口会检查登录身份与帖子可见性；未审核/驳回/下架附件仅作者与管理员可访问。删除帖子为软删除以保留管理记录，附件不自动清除。
后台启动会运行可重复的建表与索引初始化，不会重置已有社区数据。保留 `.env` 和 `postgres_data` / `minio_data` 卷，重新构建即可保留内容；不要使用 `docker compose down -v`。

UI 的布局、字号、玻璃面板、粒子连线和光晕效果均已写入 `frontend/src`。顶部为约 64px 的紧凑悬浮 Command Bar，品牌在左、横向图标与文字 Dock 居中、当前用户默认头像在右，六个导航入口始终显示。使用所提供组件的 spring=0.19、damping=0.7、widthGrowth=17、heightGrowth=16、drop=3.5 参数：指针靠近时菜单项弹性变宽、变高并向下展开，整体轨道保持固定。中屏导航换行，窄屏导航呈三列两行，滚动时保持顶部可访问。动效遵循系统“减少动态效果”设置，页面隐藏后暂停动画。
顶部参考 ThreeUI 的 [Animated Top Dock / Modern](https://threeui.com/css/animated-top-dock/modern)；社区精选区参考 [Orb Gallery](https://threeui.com/ui-elements/orb-gallery)，用本地 DOM/CSS 实现球形排列、自动旋转、拖拽惯性、悬停突出、点击阅读，并提供暂停和方向按钮。所有帖子还可通过下方列表访问，不依赖外部素材服务。

### 20 条图文讨论示例

讨论涵盖项目经历写法、岗位定制、面试自我介绍、STAR 复盘、前端性能、Redis、SQL、RAG、算法、作品集和求职沟通等具体场景。每条含独立配图、场景拆解、讨论问题和两条示例回复，共 20 条帖子、20 张本地 SVG、40 条示例回复。

示例是根据公开阅读资料整理的原创场景，页面明确标注“原创场景示例”和“示例回复”，不冒充真实用户评价。详情链接到 Harvard / MIT 职业服务、Amazon 面试准备、牛客公开讨论，以及 MDN、Redis、PostgreSQL、Microsoft 官方资料等相关阅读。

初始化 SQL/JSON 保存于 `app/src/main/resources/db/community-discussion-examples.*`，配图保存于 `frontend/public/community/examples/`，可通过 `python scripts/generate-community-example-assets.py` 重新生成源文件。启动时通过 `community_seed_versions` 和事务锁只导入一次：重新部署不会重复插入，也不会重新公开管理员隐藏或删除的示例。

Nginx 为 `/community` 与 `/community/` 明确返回 SPA 页面，配图路径 `/community/examples/` 单独处理，避免同名目录引发跳转到错误端口。

可重复验证：

```powershell
node scripts/verify-community.cjs
```

该脚本创建独立临时账户与帖子，验证 20 条配图示例、40 条示例回复、五个话题、频道移除、角色隔离、私有下载、评论评分、举报、后端重启后的持久化与版本化导入，并清理测试数据。它会短暂重启 `app`。如需浏览器验证，设置 `PLAYWRIGHT_MODULE_PATH` 为已安装 Playwright 模块路径（需要 Chrome），可设置 `TEST_OUTPUT_DIR` 指定截图与报告目录；脚本不会输出管理员密码或 JWT。脚本按初始 20 条示例的验收数据库编写，社区已有其他正式讨论或管理员调整示例后需相应修改数量断言。

### 社区与 UI 验收结果

- 前后端 Docker 构建成功，管理员账号初始化成功，原有账户保留普通用户身份。
- 本次 API 验证通过 20 条独立图文示例、40 条标注回复、五话题统计、12 条分页及旧频道移除。
- 普通用户无法注册为 ADMIN、调用管理接口、访问他人隐藏内容、删除他人评论；讨论发布、私有附件下载、举报处理、下架与恢复正常。
- 重启后端不会重复插入示例，也不会恢复已隐藏的示例；真实评论、帖子与附件内容仍可读取。
- 本次共通过 37 项 API / Chrome 检查：Dock 始终可见、接近放大、顶部悬浮、画廊旋转/拖拽/悬停/点击、帖子详情、话题筛选、分页、无附件发布、管理员视图切换及页面刷新均正常。
- 社区和首页在 2530 / 1440 / 1024 / 768 / 390 / 320px 下没有页面横向溢出；管理员页面在 1440 / 768 / 390 / 320px 下正常，减少动态效果可停止自动旋转，无浏览器运行时异常。
- 临时账户、帖子、评论、举报和附件已清理；验证报告和截图由 `scripts/verify-community.cjs` 生成。

### 默认头像、管理员登录与用户列表

右上角使用本地 `frontend/public/avatar-default.svg` 默认头像，点击显示当前用户名和身份，以及账号切换、退出操作。管理员还可从头像菜单进入“查看用户”“社区管理”“用户视图”。切换到另一种账号会清除当前登录态并进入相应登录页，需要输入该账号的密码。

- 用户登录：`/login?mode=user`；管理员登录：`/login?mode=admin`。登录页也可直接切换两种模式。
- 管理员登录调用独立的 `/api/auth/admin/login`，后端验证 ADMIN 角色后才签发 JWT，普通用户无法通过登录模式切换获得权限。
- 管理员登录成功默认进入 `/admin/users`，可查看已注册用户的用户名、ID、身份、注册时间和统计，按用户名搜索、按身份筛选、分页及刷新。
- 用户目录接口 `/api/admin/users` 受后端 ADMIN 权限限制，每页 20 条，仅返回列表必要字段，不返回密码散列或 JWT。此列表为已注册账号，不表示实时在线用户。
- 本机管理员账号由 `.env` 的 `APP_ADMIN_USERNAME` / `APP_ADMIN_PASSWORD` 提供；已有管理员密码不会因重建重置。

验收脚本：`node scripts/verify-admin-dock.cjs`。使用已安装 Chrome 和 `PLAYWRIGHT_MODULE_PATH` 指定的 Playwright（未设置时尝试本机 Codex 缓存路径），支持 `TEST_OUTPUT_DIR`。它会创建 21 个随机临时普通账号测试分页和权限，完成后清理，仅查询已有用户，不修改其密码或身份。

本次顶栏、登录身份和用户目录共通过 20 项实际 API / Chrome 检查。桌面顶栏高度约 64px，Dock 中心固定，菜单随指针弹性变宽、变高、下移；默认头像、当前用户名、退出、账号切换、管理员用户目录、搜索、身份筛选和分页正常。已检查 2530 / 1440 / 1024 / 960 / 900 / 850 / 768 / 390 / 320px 的目录、首页、导航及头像菜单，没有横向溢出，320px 管理员登录正常，无浏览器运行时异常。临时测试账号已清理。

更新后的社区回归脚本另外通过 37 项检查，覆盖原有 20 条示例及 40 条回复、发布、评论、附件、管理权限、筛选分页、图文球形画廊、直接打开/刷新、顶栏滚动悬浮与重启持久化。已有账号和社区内容保留。

### 顶栏点击边框溢出修复

菜单基础高度调整为 34px，固定轨道改为垂直居中，保留原有 16px 高度增长与 3.5px 下移的弹簧参数；焦点轮廓改为向内绘制。动画峰值和键盘焦点方框均留在顶栏内，不通过裁切隐藏菜单，也不增加顶栏高度。

本次复现了旧版约 12.8px 的方框/焦点轮廓溢出，并在 Chrome 中逐帧检查全部六个菜单项的悬停、点击和键盘操作。2530 / 2504 / 1440 / 1024 / 960 / 900 / 768 / 641 / 640 / 390 / 320px 的菜单方框保持在顶栏边界内，默认头像菜单仍可打开；减少动态效果模式和浏览器运行正常。前端 Docker 构建与重新部署完成。

### 简历市场入口与本地预览

顶部悬浮导航新增“简历市场”，点击进入 `/resume-templates`，复用需要登录的 `/api/resume-templates` 接口和 PostgreSQL 中现有的 65 条模板记录。页面支持风格筛选、标题搜索和空结果提示。前两条现已接入 Word 原文件下载，其他模板需要补充真实文件后才能开放。

65 张既有 PNG 已保存到 `frontend/public/resume-template-previews/`，随前端 Docker 构建发布。有 `localImagePath` 的条目优先读取 `/resume-template-previews/{sourceId}.png`，缺失时回退远程 `coverUrl`。后续增加模板时需同步此目录的图片。

导航轨道宽度根据菜单数量计算；1100px 以下导航独占第二行，740px 以下采用四列排列，保持全部七个入口可见。保留向内焦点轮廓和弹簧峰值边界约束。

已完成前端 TypeScript / Vite 构建及 Docker 重新部署，原端口 18181 保留。Chrome 检查通过市场入口、65 条记录、风格筛选、标题搜索、空结果、刷新及全部 65 张本地 PNG 的 HTTP 200；市场页在 1440 / 1024 / 390 / 320px 下无横向溢出。七个导航的悬停、点击、键盘弹簧动画在 2530 / 1440 / 1101 / 1100 / 1024 / 900 / 768 / 741 / 740 / 641 / 640 / 390 / 320px 下保持在顶栏内，头像菜单和减少动态效果模式正常，无浏览器运行时异常。

### 前两条 Word 原文件下载（2026-10-13）

“全部”中前两张卡片分别绑定 `秋招医护类求职简历.docx`、`有多颜色模板，下放链接进群.docx`，原件保存于 `app/src/main/resources/resume-templates/word/`，随后端构建进入 JAR。启动时 `BundledResumeTemplates` 幂等更新原 source_id=1000、1001，保持总数 65，不增加重复卡片，不依赖桌面文件或容器临时拷贝。卡片采用本地 SVG 文档封面。

接口返回 DOCX 文件字节和 UTF-8 原文件名，继续要求登录，并限制为已登记的 classpath 文件。前端识别文件与 JSON 错误，显示下载进度，未配置的其他模板仍提示未开放。

验收命令：`node scripts/verify-template-downloads.cjs`，可设置 `TEST_OUTPUT_DIR`、`TEST_BASE_URL` 和 `PLAYWRIGHT_MODULE_PATH`。脚本创建一名临时普通用户，验证列表顺序、鉴权、错误处理、两份 API 文件及浏览器下载的原文件名和 SHA-256、一致的桌面及窄屏布局，最后删除该临时用户。

本次已通过全部下载验收：普通用户的两次 Chrome 按钮下载与两份 API 响应都和仓库原件逐字节一致，仓库原件与用户桌面文件的 SHA-256 相同；原中文文件名、手机端下载、未配置模板的错误提示、登录鉴权及 1440 / 390 / 320px 布局正常，无浏览器运行时异常。前后端 Docker 部署已更新，五个常驻服务健康，模板总数仍为 65，临时测试用户已删除。后端构建增加持久依赖缓存与最多三次打包尝试，以处理依赖仓库偶发 TLS 连接中断；最终构建成功。
