# AI 简历与模拟面试项目数据库应用报告

> 阅读范围：本文记录原站 PostgreSQL、Redis 和对象存储，不包含后来新增的 MySQL 就业模块。完整存储分工见 `database/README.md`；就业模块的课程报告、99 字段字典和 ER 图见 `docs/employment/`。

撰写日期：2026 年 10 月 13 日。本文依据项目当前源码、Docker 配置及运行中数据库结构编写，重点说明各类数据的组织方式、读写机制与业务协作。

## 一、数据存储架构与职责划分

本项目围绕简历管理、模拟面试、知识库问答和社区交流开展业务，需要处理账号、评分、文档、任务进度等不同类型的数据。系统采用 PostgreSQL、Redis 与 MinIO 协同存储：PostgreSQL 保存长期业务记录，并通过 pgvector 扩展提供向量检索；Redis 保存阶段性状态，承担缓存、异步队列和限流；MinIO 保存用户上传的原始文件。这种分工让结构化记录、实时状态和大体积文件各有明确的存放位置。

用户所连接的向量数据库实际位于 PostgreSQL 内部，与业务表共用 interview_guide 数据库。代码中部分日志使用 RustFS 名称，当前 Docker 部署运行的是 MinIO，后端通过兼容 S3 的接口访问对象存储。判断服务类型应以实际镜像和连接配置为依据。三个服务分别挂载独立数据卷，使应用容器重建后仍能读取原有记录和文件。

## 二、PostgreSQL 的业务数据管理机制

PostgreSQL 是项目业务事实的主要保存位置。目前数据库共有十五张业务表。users 保存账号和身份；resumes、resume_analyses 保存简历信息与分析结果；interview_sessions、interview_answers 保存面试会话和回答；knowledge_bases 保存文档元数据与处理状态。问答会话、消息和知识库关联分别存于 rag_chat_sessions、rag_chat_messages、rag_session_knowledge_bases，形成可追溯的交流记录。

社区通过帖子、评论、举报和示例导入版本四张表管理交流内容；resume_template 保存模板标题、标签、封面及下载路径；vector_store 保存知识库文本片段与向量。表之间通过编号、关联字段和约束组织数据，因此系统能够从一场面试找到对应回答，也能从聊天会话找到所使用的知识库。前端展示的是接口返回的结果，数据库连接与查询在后端完成。

后端主要采用 JPA 的 Entity 与 Repository 管理数据。实体定义字段、类型和关联，Repository 提供查询、保存、分页等操作。社区服务、管理员用户目录和向量清理则通过 JdbcTemplate 执行 SQL，处理审核、统计和指定记录的删除。两种访问方式共同使用 PostgreSQL，数据库能力并不局限于某一种代码框架。

主键用于区分记录，唯一约束用于限制重复数据。简历和知识库采用“所属用户与文件哈希值”的组合约束，使同一用户重复上传相同内容时能够识别重复，而不同用户仍能独立管理自己的资料。文件哈希反映内容特征，原始文件名用于展示，两者职责不同。账号密码经过 BCrypt 处理后保存为散列值；请求认证读取数据库中的真实身份，管理员权限不会因前端切换页面而自动产生。

事务使一组数据库操作能够共同提交或回滚，减少部分修改成功、部分失败造成的不一致。但事务保护范围取决于具体方法的事务边界，不能将所有接口都视为同一个事务。数据库事务也不会自动撤销已经上传到对象存储的文件。项目中的用户、帖子、文档等记录需要依靠数据库约束与后端身份校验共同维护正确性。[PostgreSQL 事务说明](https://www.postgresql.org/docs/16/tutorial-transactions.html)

## 三、pgvector 的知识库检索机制

知识库问答需要从文档中找到与问题相关的内容。项目使用 pgvector 为 PostgreSQL 增加向量类型和相似度检索能力。运行中的 vector_store 表包含编号、文本片段、元数据和向量四类字段，其中向量列为一千零二十四维。文本负责提供回答依据，元数据记录知识库编号与用户编号，向量用于计算语义接近程度，三者共同组成可检索的知识片段。

文档上传后，系统先提取文本，再通过文本分块器拆成适合模型处理的片段。向量服务为片段附加归属信息，并分批调用 Embedding 模型，将文本转成数值向量后写入数据库。当前配置的模型为 text-embedding-v3，每批最多处理十个片段。这个过程不直接生成回答，而是建立文档内容的检索表示，使问题与资料能够在同一向量空间中比较。

用户提问时，系统根据问题构造检索请求，按选定知识库限制候选范围，并结合相似度阈值与返回数量筛选片段。项目使用余弦距离衡量向量方向的接近程度，并建立 HNSW 索引，通过图结构进行近似近邻搜索。索引可以减少检索中的比较开销，但相似度高不等于内容必然正确，回答仍需依赖实际文本与上下文。[pgvector 官方说明](https://github.com/pgvector/pgvector)

检索结果被组合成上下文，再交给对话模型生成回答，构成检索增强生成流程。项目还根据问题长度调整候选数量，并提供问题改写能力；没有有效命中时，可退回通用问答。因此，回答是否来自知识库需要结合检索结果判断。向量生成和文本回答依赖不同模型接口，配置有效密钥、匹配向量维度，并检查知识库处理状态，才能形成完整的问答链路。

## 四、Redis 的缓存与异步处理机制

Redis 以键值方式组织数据，项目主要使用零号逻辑数据库。后端通过 Redisson 封装访问，将面试会话、创建任务等对象序列化后缓存。面试会话默认保存二十四小时，面试创建任务默认保存两小时。键名使用统一前缀区分用途，过期时间负责回收阶段性状态，避免缓存无限增长，也减少后台任务进度查询对关系数据库的重复访问。

缓存服务于正在进行的业务过程，正式的面试记录和分析结果仍需要写入 PostgreSQL。缓存键过期意味着相应临时状态被清理，不应将其解释为全部业务历史已经删除。系统在设计时需要区分可重新构建的缓存内容与必须长期保留的正式记录，明确任务查询超时、会话恢复和历史查看各自依赖哪一层数据。

简历分析、知识库向量化和面试评价通过 Redis Streams 排队。生产者把业务编号、文本内容和重试次数写入对应消息流；后台消费者以消费者组方式读取任务，随后更新处理状态、调用业务服务并保存结果。这样，上传接口可以先返回受理结果，耗时的模型调用交由后台完成，前端再根据状态展示等待、处理中、完成或失败。

消费者处理成功后发送确认；发生可捕获异常时，项目最多重新入队三次，超过次数后保存失败信息并确认原消息。确认用于移除消费者组中的待确认引用，不会自动删除消息流正文。项目另设消息长度限制，采用近似裁剪控制旧消息数量，避免持续积累。[Redis Streams 说明](https://redis.io/docs/latest/develop/data-types/streams/)、[消息确认说明](https://redis.io/docs/latest/commands/xack/)

这一机制仍需要考虑异常恢复。当前读取逻辑主要消费尚未投递的新消息，进程突然退出时留下的待确认消息，需要进一步完善接管处理；任务也应具备重复执行保护。Redis 已启用 AOF，运行时采用每秒同步策略，写操作日志可在重启后恢复数据，但尚未落盘的最近写入仍存在丢失可能。持久化有助于恢复队列，不能替代业务补偿与备份。[Redis 持久化说明](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

Redis 还承担接口限流。项目通过 Lua 脚本处理时间窗口内的请求记录，在同一次脚本执行中完成过期记录回收、额度判断与扣减，降低并发请求分别检查时造成的计数竞争。限流保护上传、重新向量化等入口，帮助控制任务数量和外部模型调用压力。

## 五、MinIO 的文件对象存储机制

MinIO 保存 PDF、Word、知识库文档及面试媒体等二进制内容。文件存放在存储桶中，每个对象通过对象键定位，并附带类型、大小等元数据。项目通过 S3Client 执行上传、读取、存在性检查和删除。对象键结合业务前缀、日期、随机标识及处理后的文件名生成，便于区分用途并降低重名覆盖风险。[S3 对象存储说明](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingObjects.html)

原文件写入对象存储后，PostgreSQL 保存对象键、文件名、大小、所属用户和处理状态。用户下载时，后端依据业务记录找到对象，再把文件内容返回浏览器。这样的组织方式让数据库负责管理关系，让对象存储负责保存文件本体，便于分别查询、下载、清理和备份。

社区附件使用独立的私有存储桶，下载接口先检查登录身份与帖子的可见性。通用文件桶当前配置了公开读取策略，其权限范围与社区附件不同。简历市场前两份 Word 原件则随后端资源打包，数据库记录其路径，下载接口仅允许已登记的资源。文件保存位置应结合具体模块判断，不能认为所有文档都位于同一个桶内。

## 六、三类存储的协作与可靠性边界

以知识库上传为例，后端先校验文件并提取文本，将原件写入 MinIO，再在 PostgreSQL 保存文档记录，最后通过 Redis 投递向量化任务。消费者生成向量后写入 pgvector，并更新完成状态。问答阶段读取相关片段、调用对话模型，再保存会话和消息。三类存储通过文档编号、用户编号、任务编号及对象键关联，形成从原件到检索再到回答的数据链路。

这条链路包含数据库写入、对象上传、消息投递和模型调用，当前没有覆盖全部步骤的分布式事务。某一步失败可能留下待处理记录、未清理文件或待确认消息，需要通过状态记录、重试及后续核对恢复一致性。项目的部分删除逻辑在文件或向量清理失败后仍继续删除业务记录，因此正式运行还应完善补偿与遗留对象巡检。数据库、Redis 和 MinIO 的数据卷需要分别备份；容器重建保留数据，不代表宿主机故障后能够自动恢复全部内容。

## 七、应用价值与改进方向

本项目通过关系存储、内存键值存储和对象存储分工，分别支撑业务追溯、语义检索、后台调度和原始资料保存。向量库扩展了 PostgreSQL 的查询方式，Redis 缩短了前台等待过程，MinIO 为文件管理提供了独立载体。后续应围绕任务接管、重复执行保护、跨存储补偿、权限隔离及备份恢复持续完善，并通过真实上传、模型调用和检索测试验证业务链路。服务健康检查说明基础设施已就绪，业务可用性还需要结合数据处理结果与模型接口状态判断。各层数据均可通过管理工具核查。

---

## 项目代码依据

以下为报告事实对应的主要代码入口，便于核对和后续维护，未计入正文篇幅。

- [数据库、向量及 Redis 配置](../app/src/main/resources/application.yml:30)、[Docker 存储与数据卷配置](../docker-compose.yml:13)。
- [账号与身份认证](../app/src/main/java/interview/guide/modules/auth/service/AuthService.java)、[JWT 请求身份校验](../app/src/main/java/interview/guide/modules/auth/web/JwtAuthenticationFilter.java)。
- [知识库上传流程](../app/src/main/java/interview/guide/modules/knowledgebase/service/KnowledgeBaseUploadService.java)、[向量写入与检索](../app/src/main/java/interview/guide/modules/knowledgebase/service/KnowledgeBaseVectorService.java)、[检索与回答](../app/src/main/java/interview/guide/modules/knowledgebase/service/KnowledgeBaseQueryService.java)。
- [面试会话缓存](../app/src/main/java/interview/guide/infrastructure/redis/InterviewSessionCache.java)、[面试创建任务缓存](../app/src/main/java/interview/guide/infrastructure/redis/InterviewCreationTaskCache.java)。
- [Redis 访问封装](../app/src/main/java/interview/guide/infrastructure/redis/RedisService.java)、[消息消费与重试](../app/src/main/java/interview/guide/common/async/AbstractStreamConsumer.java)、[队列参数](../app/src/main/java/interview/guide/common/constant/AsyncTaskStreamConstants.java)。
- [限流脚本](../app/src/main/resources/scripts/rate_limit_single.lua)、[文件存储服务](../app/src/main/java/interview/guide/infrastructure/file/FileStorageService.java)。
- [社区数据及附件权限](../app/src/main/java/interview/guide/modules/community/CommunityService.java)、[模板资源登记](../app/src/main/java/interview/guide/modules/template/service/BundledResumeTemplates.java)、[知识库删除流程](../app/src/main/java/interview/guide/modules/knowledgebase/service/KnowledgeBaseDeleteService.java)。
