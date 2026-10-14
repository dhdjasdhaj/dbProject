# 简历模板展示模块 · 数据与代码摘要

> 历史摘要：以下记录模板模块的早期状态。当前已接入顶部“简历市场”入口、本地预览资源和前两个 Word 模板下载，原文中的“占位/未接入”等表述不代表当前实现。当前代码位置、导入步骤与部署以 `docs/project-handoff.md`、`database/README.md` 和根目录 README 为准。

> 用途：给后续「写这部分接口」做准备。这里只记录**数据在哪、代码在哪、现有接口长什么样、哪些字段/接口还没做**。

## 一、模块是干什么的

一个「简历市场」页面：原有 65 条模板记录继续保留。前两条（source_id=1000、1001）替换为用户提供的 Word 模板，可真实下载；其余模板展示爬取的预览图与元数据，Word 下载仍未开放。

前两条按顺序为「秋招医护类求职简历」「有多颜色模板，下放链接进群」。原文件分别保存于 `app/src/main/resources/resume-templates/word/healthcare-autumn.docx` 和 `multicolor.docx`，不依赖桌面路径，随后端 JAR / Docker 镜像发布。卡片使用本地 SVG 文档封面，封面为展示插画，不是 Word 正文截图。

---

## 二、数据在哪

### 1. 原始数据（爬虫产物，在硬盘上）

目录：`D:\clone-interview-rag-submit\scraper\resume_template\`

| 文件 | 说明 |
|------|------|
| `templates.json` | 65 条模板元数据（UTF-8），每条含 `source_id / title / style_tags / category_slug / usage_count / cover_url / local_image_path / detail_url / word_download_url / word_local_path` |
| `images/{source_id}.png` | 65 张预览图，命名 `1000.png` ~ `2005.png` |
| `crawler.py` | 爬虫主脚本（requests + lxml，按 9 个风格分类抓取、去重、下载图片） |
| `config.py` | 站点 URL / 分类 slug / UA / 限速等常量 |
| `import_to_postgresql.py` | **实际在用**的导入脚本（写入 PostgreSQL，幂等 upsert） |
| `import_to_mysql.py`、`schema.sql` | 早期 MySQL 方案的遗留物，**未使用**，可忽略 |

### 2. 数据库（实际存储）

- 引擎：**PostgreSQL 16（pgvector）**，运行在 Docker 容器 `interview-submit-postgres`。
- 库：`interview_guide`；表：`resume_template`；**65 行**。
- 宿主机连接：`127.0.0.1:15434`（`docker-compose.override.yml` 把容器 5432 映射到 15434），账号 `postgres` / `password`。
- 导入方式：`python import_to_postgresql.py`（幂等，`ON CONFLICT (source_id) DO UPDATE`）。

表结构（`resume_template`，11 列）：

| 列 | 类型 | 说明 |
|----|------|------|
| `id` | BIGSERIAL PK | 自增主键 |
| `source_id` | BIGINT UNIQUE | 源站模板 ID（去重键），1000~2005 |
| `title` | VARCHAR(255) | 标题 |
| `style_tags` | TEXT | **JSON 数组字符串**，如 `["简洁","时尚"]` |
| `category_slug` | VARCHAR(64) | 首次抓到的分类（`jianjie`/`table`/`english`…） |
| `usage_count` | INTEGER | 使用次数 |
| `cover_url` | VARCHAR(512) | 源站缩略图 URL |
| `local_image_path` | VARCHAR(255) | 本地图片相对路径（`images/1045.png`） |
| `detail_url` | VARCHAR(512) | 源站详情页 URL |
| `word_download_url` | VARCHAR(512) | ★预留：Word 下载地址（当前 null） |
| `word_local_path` | VARCHAR(255) | ★预留：Word 本地文件路径（当前 null） |
| `created_at` / `updated_at` | TIMESTAMPTZ | 时间戳 |

> 注意：`style_tags` 在库里是 **TEXT 存的 JSON 字符串**，不是原生 JSON 类型。这是项目惯例——实体里对应字段名 `styleTagsJson`，读出来用 Jackson `readValue` 转 `List<String>`。

### 3. 图片怎么显示（重要）

- 前端**当前用的是远程 `cover_url`**（`referrerPolicy="no-referrer"`），不是本地 `images/`。
- `local_image_path` 有值但**还没接入任何静态资源服务**——这就是「本地图片不显示」的原因。
- 若要改成显示本地图，需要：把 `images/` 挂进静态目录（或传到 MinIO），后端加静态映射，前端改用 `local_image_path`。

---

## 三、代码在哪

### 后端（Java，包 `interview.guide.modules.template`）

根路径：`D:\clone-interview-rag-submit\app\src\main\java\interview\guide\modules\template\`

| 文件 | 作用 |
|------|------|
| `model/ResumeTemplateEntity.java` | JPA 实体，`@Table(name="resume_template")`，11 个字段，`@PrePersist/@PreUpdate` 维护时间 |
| `model/ResumeTemplateDTO.java` | 返回 DTO（record，11 字段） |
| `repository/ResumeTemplateRepository.java` | `JpaRepository<…, Long>` + `findBySourceId(Long)` |
| `service/ResumeTemplateService.java` | `list(style, category)` 查询+过滤；`requireById(id)` |
| `ResumeTemplateController.java` | 两个接口（见下） |

另有：`interview/guide/common/exception/ErrorCode.java` 里加了两个错误码：
- `TEMPLATE_NOT_FOUND(10001, "简历模板不存在")`
- `TEMPLATE_DOWNLOAD_NOT_READY(10002, "Word模板下载功能暂未开放")`

### 前端（React + TS）

根路径：`D:\clone-interview-rag-submit\frontend\src\`

| 文件 | 作用 |
|------|------|
| `api/resumeTemplate.ts` | API 封装（`list` / `download`），含 `ResumeTemplate` 接口类型 |
| `pages/ResumeTemplateLibraryPage.tsx` | 展示页：卡片墙 + 风格筛选 chips + 标题搜索 + 下载按钮 |
| `App.tsx`（第 168 行） | 路由 `resume-templates` → `ResumeTemplateLibraryPage`（在 `RequireAuth` 内，需登录） |
| `components/layout/Layout.tsx` | 顶部悬浮导航 `navItems` 已添加「简历市场」入口，使用 `LayoutTemplate` 图标，点击访问 `/resume-templates`；导航宽度随菜单数量自适应，移动端保持全部入口可见 |

---

## 四、现有接口（已实现并上线）

统一返回 `Result<T>` 包装：`{ code, data, message, success }`，`code === 200` 表示成功。

### 1. `GET /api/resume-templates`
- 参数（都可选）：`style`（按风格标签过滤）、`category`（按分类 slug 过滤）。
- 返回：`Result<List<ResumeTemplateDTO>>`。
- **需要登录**（JWT）。未登录返回 `{"code":401,"message":"请先登录"}`（HTTP 仍是 200，前端拦截器靠 `code===401` 跳登录）。
- 实现：`ResumeTemplateService.list()` → `findAll(Sort.by("sourceId"))` 内存过滤 + map 成 DTO。

DTO 字段（前后端一致）：
```
id, sourceId, title, styleTags(string[]), categorySlug, usageCount,
coverUrl, localImagePath, detailUrl, wordDownloadUrl, wordLocalPath
```

### 2. `GET /api/resume-templates/{id}/download`
- 需登录。前两条返回原始 DOCX 文件字节，类型为 `application/vnd.openxmlformats-officedocument.wordprocessingml.document`，使用带 UTF-8 中文文件名的 `Content-Disposition: attachment`。
- 仅允许 `BundledResumeTemplates.TEMPLATES` 中登记且数据库路径一致的 classpath 文件，不读取任意磁盘路径或远程地址。其余条目返回 `TEMPLATE_DOWNLOAD_NOT_READY(10002)`；不存在的 ID 返回 `TEMPLATE_NOT_FOUND(10001)`。
- 前端以 Blob 接收成功的文件响应、触发浏览器保存；JSON 错误会显示提示，登录失效时清理登录态并跳转登录。
- `BundledResumeTemplates` 在启动时幂等更新 source_id=1000、1001 的标题、分类、封面和资源路径，保留记录 ID、使用次数及其他 63 条模板。首次空数据库可创建这两条；后续重新导入爬虫元数据时，再启动后端即可重新应用这两条文件绑定。

---

## 五、还没做的（后续写接口的落点）

1. **其他模板的 Word 下载**：前两条已开放，其余条目需要补充实际文件并登记受信资源后才能开放。
2. **本地预览已接入**：65 张既有 PNG 已复制到 `frontend/public/resume-template-previews/{sourceId}.png`，由前端 Docker / Nginx 随构建发布。展示页对有 `localImagePath` 的条目优先使用同源图片，本地图片缺失时回退 `coverUrl`；后续新增模板时需同步新增预览图。
3. **（可选）详情接口**：`GET /api/resume-templates/{id}` 单条详情。
4. **（可选）分页/聚合**：现在是一次性全量返回 65 条；标签列表（用于筛选 chips）是前端从数据里动态算出来的，后端没提供 `/tags` 聚合接口。

---

## 六、写新接口要记住的项目约定

- **语言/框架**：Java 21 + Spring Boot 4.0.1，Spring Data JPA，**Jackson 3**（包名是 `tools.jackson.*`，不是 `com.fasterxml`）。
- **返回包装**：所有接口用 `Result.success(data)` / `throw new BusinessException(ErrorCode.xxx)`。
- **鉴权**：不在 `SecurityConfig` 白名单里的 `/api/**` 都要 JWT；前端 `request.ts` 拦截器 `code===200` 拆 `data`，`code===401` 清 session 跳登录。
- **List 存库**：`style_tags` 这类集合字段存成 TEXT 的 JSON 字符串，实体字段命名 `xxxJson`，读时 `objectMapper.readValue(json, new TypeReference<>(){})`。
- **改表**：`ddl-auto: update` 会自动加列，但新列类型要和已存在的 `import_to_postgresql.py` 建表脚本保持一致（该脚本建的是 `TIMESTAMPTZ` + `TEXT`）。
