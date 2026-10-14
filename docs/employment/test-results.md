# 实际验收记录

执行日期：2026-10-13 23:35 北京时间。测试地点：本机 Docker Desktop 与 Chrome。测试人员：Codex 自动验收。人工复核人员由实际课程组员补充。

接口验收 37 项通过；浏览器验收 25 项通过。以下直接来自脚本输出，不是预计结果。

## 接口与数据库测试

| 用例 | 结果 | 实际证据 |
| --- | --- | --- |
| 未登录拒绝 | PASS | Unauthenticated access rejected |
| 失效Token拒绝 | PASS | Legacy Result business code verified |
| 学生不能访问管理接口 | PASS | Backend authorization |
| 原站管理员继承身份 | PASS | Role comes from legacy service |
| 学生仅接收学生菜单 | PASS | Student receives only personal portal entries |
| 教师仅接收教师菜单 | PASS | Teacher receives management entries only |
| 学生不能查询全体档案 | PASS | Student cannot query school student profiles |
| 教师身份只在模块生效 | PASS | Legacy USER and course STAFF |
| 有效Word上传 | PASS | Real DOCX content validated and stored |
| 附件下载完整性 | PASS | Bytes and attachment filename preserved |
| 附件所有权校验 | PASS | Student B cannot download Student A attachment |
| 伪装Word内容拒绝 | PASS | Renaming arbitrary bytes to DOCX is rejected |
| 私有桶拒绝匿名访问 | PASS | Anonymous object download rejected by MinIO |
| 重复投递拒绝 | PASS | Unique student/job pair |
| 教师访问投递简历 | PASS | Teacher can download a resume attached to an application |
| 投递列表按本人隔离 | PASS | Student A application absent from Student B list |
| 跨学生撤回拒绝 | PASS | Foreign withdrawal rejected |
| 跨学生评分读取拒绝 | PASS | Foreign score details rejected |
| 学生不能评分 | PASS | Scoring permission required |
| 第三条评分失败时完整回滚 | PASS | Third INSERT forced to fail; zero scores and unchanged round |
| 已完成面试禁止重评 | PASS | Completed round immutable |
| 最后名额并发控制 | PASS | Exactly one success and one quota rejection |
| 重复录用不重复计数 | PASS | Repeat does not increment quota |
| 计数与录用表核对 | PASS | Counters equal registered hiring records |
| MySQL外键约束 | PASS | Invalid parent rejected by MySQL |
| MySQL得分检查约束 | PASS | Out-of-range update rejected by CHECK |
| 模块停用不影响原站 | PASS | Module disabled; original authentication works |
| 管理员身份保护 | PASS | Cannot downgrade original administrator |
| 动态菜单与后端权限同步 | PASS | Menu and backend react to permission removal |
| 越界权限授予拒绝 | PASS | Cannot assign admin permission to student |
| 多轮面试不放大报表 | PASS | 2 applications, 2 interviewed applicants, 1 hiring |
| UTF-8 CSV导出 | PASS | UTF-8 BOM and data rows |
| CSV公式字符保护 | PASS | Formula prefix neutralized and comma quoted |
| 排序白名单 | PASS | Invalid sort rejected |
| 原65个模板保留 | PASS | Original 65 templates retained |
| 首个Word原文件哈希 | PASS | SHA-256 matches original file |
| 第二个Word原文件哈希 | PASS | SHA-256 matches original file |

## 浏览器测试

| 用例 | 结果 | 实际证据 |
| --- | --- | --- |
| teacher_auto_route | PASS | Original entry automatically selects teacher portal |
| teacher_no_student_menu | PASS | Teacher navigation contains management pages only |
| same_site_navigation | PASS | Employment entry inside original dock |
| admin_menu | PASS | Administrator module controls visible |
| responsive_2530 | PASS | {"width":2530,"scrollWidth":2530,"fit":true} |
| responsive_1440 | PASS | {"width":1440,"scrollWidth":1440,"fit":true} |
| responsive_1250 | PASS | {"width":1250,"scrollWidth":1250,"fit":true} |
| responsive_1100 | PASS | {"width":1100,"scrollWidth":1100,"fit":true} |
| responsive_1024 | PASS | {"width":1024,"scrollWidth":1024,"fit":true} |
| responsive_840 | PASS | {"width":840,"scrollWidth":840,"fit":true} |
| responsive_800 | PASS | {"width":800,"scrollWidth":800,"fit":true} |
| responsive_768 | PASS | {"width":768,"scrollWidth":768,"fit":true} |
| responsive_740 | PASS | {"width":740,"scrollWidth":740,"fit":true} |
| responsive_390 | PASS | {"width":390,"scrollWidth":390,"fit":true} |
| responsive_320 | PASS | {"width":320,"scrollWidth":320,"fit":true} |
| teacher_no_apply_button | PASS | Teacher job page does not contain student actions |
| dialog_1440 | PASS | {"x":0,"y":0,"width":650,"height":758.28125} |
| dialog_390 | PASS | {"x":0,"y":0,"width":354,"height":808} |
| dialog_320 | PASS | {"x":0,"y":0,"width":284,"height":808} |
| mobile_table_contained | PASS | Wide table scrolls inside its container |
| student_auto_route | PASS | Student routed to personal portal |
| student_menu | PASS | Account switching replaces module identity and menus |
| student_teacher_route_blocked | PASS | Student cannot enter teacher student directory |
| profile_form_populated | PASS | Existing student values restored in editor |
| no_browser_errors | PASS | [] |

## 字段注释、恢复和运行隔离

- 业务表：15；字段：99，注释检查结果 PASS。
- MySQL 备份在无宿主机端口的临时容器恢复：PASS。
- 原站隔离和持久化：PASS。
- 原有账户密码哈希、用户名和角色：保持不变。

## 性能与执行计划

独立临时库：1000 名学生、1000 条投递、2000 轮面试。CLI 往返时间包含 Docker 开销，服务器 actual time 由 EXPLAIN ANALYZE 提供。

- job_summary：CLI 往返 270.626 ms。服务器执行计划起始项：-> Left hash join (e.job_id = j.id)  (cost=8.14 rows=0) (actual time=3.69..3.7 rows=1 loops=1)\n    -> Nested loop left join  (cost=53.3 rows=0) (actual time=3.35..3.36 rows=1 loops=1)\n        -> Nested loop left join  (cost=3.3 
- student_summary：CLI 往返 255.436 ms。服务器执行计划起始项：-> Limit: 20 row(s)  (actual time=4.05..4.05 rows=20 loops=1)\n    -> Sort: v_student_hiring_summary.id, limit input to 20 row(s) per chunk  (actual time=4.05..4.05 rows=20 loops=1)\n        -> Stream results  (cost=414 rows=1000)
- application_detail：CLI 往返 243.225 ms。服务器执行计划起始项：-> Limit: 20 row(s)  (actual time=8.24..8.24 rows=20 loops=1)\n    -> Sort: v_application_detail.id, limit input to 20 row(s) per chunk  (actual time=8.24..8.24 rows=20 loops=1)\n        -> Stream results  (cost=106 rows=1000) (ac

## 本机 MySQL 复制核对

目标 127.0.0.1:3306/employment_course，MySQL 8.0.42。与 Docker 源库逐项比较通过：15 张业务表、99 个注释字段、3 个可查询视图、30 名学生、60 条投递、12 条录用。网站运行数据源保持 Docker MySQL 13308，两个库不会自动同步。附件只复制元数据，文件仍保存在原有私有存储桶。

## 问题、原因、修复与复测

| 问题 | 原因 | 修复 | 复测结果 |
| --- | --- | --- | --- |
| 布尔实体无法启动 | Connector将BOOLEAN识别为BIT，实体定义为TINYINT | 映射改为Boolean | JPA validate通过 |
| CHECK错误提示为500 | MySQL HY000/3819未被默认翻译器分类 | 显式识别约束错误 | 评分回滚与非法得分通过 |
| 恢复初次连接失败 | 初始化服务器尚未切换为最终TCP服务 | 等待TCP就绪 | 独立容器恢复通过 |
| 正常Word上传被拒绝 | 流式ZIP读取与部分归档描述符不兼容 | 中央目录读取、限制解压、增加原文件测试 | 原Word上传和哈希通过 |
| 字段COMMENT迁移失败 | 列注释不能使用COMMENT等号语法 | 修正并在隔离库验证，仅清除失败V3标记后重放 | V1-V4成功，99个字段注释完整 |

说明：这些问题是在本次实施中发现并处理。Docker运行时及构建镜像网络问题不写成数据库业务错误；整站回退命令已提供，未在现用环境执行回退。
