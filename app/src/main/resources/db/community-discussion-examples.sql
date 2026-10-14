-- Original editorial examples. Numbers, identities and conversations are illustrative.
DO $seed$
BEGIN
IF EXISTS (SELECT 1 FROM community_seed_versions WHERE version='discussion-examples-v1') THEN RETURN; END IF;
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','把“负责接口开发”写成可追问的项目经历','一位应届生的校园活动项目写着“负责接口开发，熟悉 Spring Boot”。看得出技术名称，却看不出独立做过什么。

## 场景拆解

可以写成：为活动报名实现名额校验、重复报名拦截和失败提示；用并发测试检查名额边界，并记录异常请求的处理结果。

如果确实测过性能，再补充测试条件、样本量和指标；没有记录就别填写看似漂亮的提升百分比。准备好一次失败用例，面试时更容易说明自己的判断。

## 一起讨论

你会优先补上业务场景、个人职责，还是验证方法？请把一句模糊描述改成可以继续追问的表述。','PUBLISHED','简历表达','/community/examples/discussion-example-01.svg','哈佛职业中心 · 简历表达建议','https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/','discussion-example-01',TRUE,TRUE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'先区分个人负责的接口与团队实现的模块，避免把团队成果全部写成个人贡献。',TRUE FROM community_posts WHERE seed_key='discussion-example-01';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'没有可靠的性能数据也能写清价值，例如消除了哪一种错误流程、增加了哪些边界校验。',TRUE FROM community_posts WHERE seed_key='discussion-example-01';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','没有实习，课程项目怎样讲出个人贡献？','四人合作完成校园二手交易网站，每个人都把整个平台写进了简历，面试却说不清自己改过哪一部分。

## 场景拆解

先画模块边界：商品发布、搜索、私信分别由谁负责。选择自己真正实现的一个模块，说明输入、输出、约束与一次取舍。

例如上传图片时，先限制文件大小和格式，再处理上传失败提示。演示一个失败场景，比笼统宣称“完成全栈系统”更具体。

## 一起讨论

你在合作项目里独立做过哪一次判断？欢迎用“我负责…，因为…，最后用…验证”描述。','PUBLISHED','简历表达','/community/examples/discussion-example-02.svg','牛客 · 项目经历与面试准备','https://api-cdn.nowcoder.com/discuss/353148589197172736','discussion-example-02',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'可以附上自己实现的页面、提交记录或设计说明，但先删除隐私和访问密钥。',TRUE FROM community_posts WHERE seed_key='discussion-example-02';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'项目规模小没有关系，关键是能解释为什么这样做，以及还有哪些没解决的问题。',TRUE FROM community_posts WHERE seed_key='discussion-example-02';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','同一份简历投前端和后端，要改哪里？','一个全栈项目同时有页面、接口和数据库，求职者给不同岗位发送完全相同的项目介绍，核心经历被埋在技术列表里。

## 场景拆解

先把岗位要求与自己的证据做两列对应：前端版本突出交互、状态管理与页面验证；后端版本突出接口约束、数据设计与异常处理。

调整内容顺序，保留真实经历。针对职位突出重点，不等于把没有做过的技术塞进技能栏。

## 一起讨论

如果你只有一个全栈项目，前端版和后端版的第一条项目描述分别会怎么写？','PUBLISHED','简历表达','/community/examples/discussion-example-03.svg','哈佛职业中心 · 简历表达建议','https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/','discussion-example-03',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'先判断最想申请的方向，再排序；一份简历不必证明自己对所有技术都很强。',TRUE FROM community_posts WHERE seed_key='discussion-example-03';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'关键词需要对应真实经验，最好每个关键词都能接一个具体例子。',TRUE FROM community_posts WHERE seed_key='discussion-example-03';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','两页简历太挤：删内容还是缩字号？','项目介绍挤满两页，正文小到需要放大才能读；校园活动、课程作业与目标岗位相关项目占用同样篇幅。

## 场景拆解

先按相关性排序，再压缩重复表述。把最重要的两段经历留下清晰的职责与结果，其余经历用更短的条目表达。

在正常缩放下检查字体、段落间距与 PDF 换页，别用不断缩字号解决信息过载。页数应服务于清楚表达，不必机械凑成一页。

## 一起讨论

你会删除哪种低信息量内容？也可以分享一次自己做过的排版取舍。','PUBLISHED','简历表达','/community/examples/discussion-example-04.svg','哈佛职业中心 · 简历表达建议','https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/','discussion-example-04',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'“认真负责、学习能力强”如果没有例子，通常不如一个具体的协作或解决问题场景。',TRUE FROM community_posts WHERE seed_key='discussion-example-04';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'导出 PDF 后还要复查行距、分页和链接，编辑器里正常不代表导出后也正常。',TRUE FROM community_posts WHERE seed_key='discussion-example-04';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','一分钟自我介绍：从“背履历”到“给线索”','求职者从入学时间讲到每门课程，结束时面试官仍不清楚他申请什么方向、最值得深挖的经历是什么。

## 场景拆解

试着用一个简短结构：当前学习或工作背景 → 与岗位相关的一段经历 → 希望继续做的方向。

示例：“我主要做 Web 开发，最近独立完成了活动报名模块，重点处理重复提交与名额边界。我希望在后端方向继续学习业务建模和稳定性验证。”根据实际时限调整，不照搬示例身份。

## 一起讨论

哪一句能把面试官自然引到你熟悉的经历？试写三句话，并请他人指出最想追问的一点。','PUBLISHED','面试复盘','/community/examples/discussion-example-05.svg','MIT CAPD · Interview primer','https://capd.mit.edu/resources/interview-primer/','discussion-example-05',TRUE,TRUE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'不用把所有技能都念出来，留一个具体项目线索更容易展开交流。',TRUE FROM community_posts WHERE seed_key='discussion-example-05';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'录一遍自己的表达，检查是否有很多空泛形容词，或没有明确说明岗位方向。',TRUE FROM community_posts WHERE seed_key='discussion-example-05';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','项目介绍总被打断：先说结论，再展开细节','介绍一个报名系统时，求职者花很多时间解释每个页面和文件夹，面试官不断打断，想直接了解最难的部分。

## 场景拆解

先用一句话说明系统服务谁、解决什么问题和个人职责。再挑一个具体难点，例如并发报名时如何检查名额边界，讲自己的思路与验证。

准备短版和长版：短版交代全貌，长版只在被追问时展开。不要把所有实现细节一口气讲完。

## 一起讨论

你会如何用一句话概括自己的项目？请让不了解项目的人也能听懂。','PUBLISHED','面试复盘','/community/examples/discussion-example-06.svg','MIT CAPD · Interview primer','https://capd.mit.edu/resources/interview-primer/','discussion-example-06',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'可以先询问“您希望我重点介绍业务流程还是技术难点”，让双方对范围有共同认识。',TRUE FROM community_posts WHERE seed_key='discussion-example-06';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'被打断不一定意味着回答不好，可能只是面试官在调整时间或想深入一个点。',TRUE FROM community_posts WHERE seed_key='discussion-example-06';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','一次失败经历，怎么讲得诚实又有成长？','一次上线前演示失败，原因是配置与本地不同。求职者担心讲出来显得能力不足，于是只说“最后顺利解决”。

## 场景拆解

用 STAR 组织自己的真实经历：交代演示目标与环境，说明自己漏掉的检查，描述定位和修正动作，再说后来如何避免重复发生。

把重点放在行动与反思，不把责任简单推给同伴。没有完整解决的部分也应坦诚说明。

## 一起讨论

你遇到过怎样的失误？哪些修正动作是自己完成的，后来是否真的使用过新的检查办法？','PUBLISHED','面试复盘','/community/examples/discussion-example-07.svg','Amazon Jobs · 面试准备','https://www.amazon.jobs/content/en/faq/interview-prep','discussion-example-07',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'“加入环境配置检查”还可以说明检查哪些项，以及谁在什么环节执行。',TRUE FROM community_posts WHERE seed_key='discussion-example-07';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'不要把普通小失误包装成严重事故，更不要虚构一次英雄式救场。',TRUE FROM community_posts WHERE seed_key='discussion-example-07';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','面试结束后，复盘表应该记录什么？','面试后只记下“算法没答好”和“项目讲得一般”，过几天再次面试，相同的停顿仍然出现。

## 场景拆解

把记录拆成三栏：实际被问的问题、当时回答卡在哪里、下一次如何练习。

例如“没有先确认重复元素是否允许”对应的改进是开题前口头确认边界；“只报技术名词”对应的改进是练习一段个人行动与验证过程。未经同意不要录制或公开他人的面试内容。

## 一起讨论

选择最近一次卡住的问题，写一个十分钟内可以完成的改进动作。','PUBLISHED','面试复盘','/community/examples/discussion-example-08.svg','牛客 · 面试复盘讨论','https://ac.nowcoder.com/discuss/1655884','discussion-example-08',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'区分“没学过”与“学过但讲不清”，两者的准备方式不一样。',TRUE FROM community_posts WHERE seed_key='discussion-example-08';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'建议保留当时自己的原始表达，再和改进后的短版本比较，而不只写正确答案。',TRUE FROM community_posts WHERE seed_key='discussion-example-08';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','前端性能项目：先测什么，再改什么？','页面感觉慢，求职者给所有图片加懒加载后就写“首屏优化完成”，却没有说明哪些资源影响了首屏体验。

## 场景拆解

先在固定设备、网络与页面内容下记录加载情况。把首屏关键资源与后续内容区分开，检查请求瀑布，再决定是否延迟加载非关键资源。

不要把首屏关键图片也一律延后；修改后在相同条件下复测。示例讨论只演示方法，没有真实网站的性能提升数据。

## 一起讨论

你会如何证明某个修改改善了体验，而不是只让指标看起来更好？','PUBLISHED','技术交流','/community/examples/discussion-example-09.svg','MDN · Lazy loading','https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading','discussion-example-09',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'可以同时记录用户何时看到主要内容和何时能交互，避免只观察一个总加载时间。',TRUE FROM community_posts WHERE seed_key='discussion-example-09';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'对比时固定测试条件；如果页面内容或缓存状态不同，直接比较结果容易误导。',TRUE FROM community_posts WHERE seed_key='discussion-example-09';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','Redis 项目被追问：缓存失效后会发生什么？','项目写着“使用 Redis 优化查询”，面试官进一步问缓存没命中、数据被修改、服务不可用时怎么处理，回答开始混乱。

## 场景拆解

用一张读写路径图解释自己的实际实现：读缓存 → 未命中时读数据源 → 按策略回填。再分别讨论过期与更新后的数据新鲜度。

说明系统对短时旧数据的容忍度和故障处理，而不是声称“加了 TTL 就完全一致”。没有做过的策略可以作为待验证方案，别写成已上线能力。

## 一起讨论

你会如何回答“更新数据库之后，旧缓存怎么办”？请先说明业务需要多新的数据。','PUBLISHED','技术交流','/community/examples/discussion-example-10.svg','Redis · Cache-aside','https://redis.io/docs/latest/develop/use-cases/cache-aside/','discussion-example-10',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'先讲清读写路径，再讲失效策略；如果同时混用几种方案，面试官更难判断实际做过什么。',TRUE FROM community_posts WHERE seed_key='discussion-example-10';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'缓存失效或不可用的测试很有价值，可以说明系统如何降级，以及哪里仍可能增加数据库压力。',TRUE FROM community_posts WHERE seed_key='discussion-example-10';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','SQL 查得慢：为什么“有索引”还不够？','订单列表查询有索引仍然慢，求职者的第一反应是继续建索引，却没有检查筛选条件、返回行数和执行计划。

## 场景拆解

先复现具体查询与数据分布，查看 EXPLAIN 计划中的访问方式与估计行数，再分析索引是否适合实际条件。

在可控测试环境验证候选方案。EXPLAIN ANALYZE 会执行语句，使用时要理解查询的副作用与运行成本。不要把测试环境的结论直接套到生产环境。

## 一起讨论

你会先检查哪些信息，才能判断是索引、查询写法，还是数据分布的问题？','PUBLISHED','技术交流','/community/examples/discussion-example-11.svg','PostgreSQL · Using EXPLAIN','https://www.postgresql.org/docs/current/using-explain.html','discussion-example-11',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'还可以确认返回了多少列、多少行，避免把大量传输和排序的时间全部归因于扫描。',TRUE FROM community_posts WHERE seed_key='discussion-example-11';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'计划中出现顺序扫描不一定是坏事，是否合理要结合表大小和选择性判断。',TRUE FROM community_posts WHERE seed_key='discussion-example-11';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','RAG 面试：回答有出处，为什么仍可能答错？','知识库问答返回了参考文档，但回答中的某个时间或条件不在原文中。求职者只用“检索成功率高”概括系统效果。

## 场景拆解

把问题拆成两步：检索内容是否与问题相关，生成回答是否受到检索内容支持。准备少量可人工检查的测试问题，记录无答案、文档冲突与条件限制的案例。

例子是一个验证流程，不代表网站已完成正式效果评估，也不预设某个单一指标就能说明全部能力。

## 一起讨论

如果知识库没有答案，你希望系统如何回应？哪些内容需要给出更具体的原文证据？','PUBLISHED','技术交流','/community/examples/discussion-example-12.svg','Microsoft Learn · RAG 评价','https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators','discussion-example-12',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'可以先保存检索片段和最终回答，便于区分是没有找到证据，还是找到了却使用错误。',TRUE FROM community_posts WHERE seed_key='discussion-example-12';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'有引用链接不等于每个断言都被支持，尤其要检查日期、主体与适用条件。',TRUE FROM community_posts WHERE seed_key='discussion-example-12';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','算法题卡住了：如何把思考过程说出来？','遇到数组题后马上写代码，写到一半才发现没问重复元素、空输入和返回形式；即使思路不错也很难说明复杂度。

## 场景拆解

先确认输入、输出与边界，用一个小例子验证理解，再给出可行的基础解法。若继续优化，说明自己希望减少哪部分时间或空间开销。

卡住时可以坦诚说出当前假设，用具体反例调整；不要为了持续说话而堆砌不确定的术语。

## 一起讨论

你通常在哪个环节最容易省略检查？欢迎分享一个用小例子发现错误的过程。','PUBLISHED','技术交流','/community/examples/discussion-example-13.svg','MIT CAPD · Interview primer','https://capd.mit.edu/resources/interview-primer/','discussion-example-13',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'先用简单解法把题意说清楚，可以为后面的优化建立共同基线。',TRUE FROM community_posts WHERE seed_key='discussion-example-13';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'复杂度说明最好对应实际循环、存储和输入规模，不只背一个结论。',TRUE FROM community_posts WHERE seed_key='discussion-example-13';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','产品实习面试：把“我有很多想法”变成验证计划','求职者提出给校园应用加很多功能，却不能回答这些功能服务哪一类用户，也没有说明如何判断是否值得开发。

## 场景拆解

选择一个具体问题，例如活动报名后用户找不到签到说明。先记录用户反馈与现有路径，再提出假设和轻量验证方案。

面试里可以讨论如何收集反馈、比较使用路径及处理不同意见；区分自己的设想和已经获得的证据，不虚构访谈或转化数据。

## 一起讨论

如果只能做一个小改动，你会如何确认它改善了用户的问题？','PUBLISHED','技术交流','/community/examples/discussion-example-14.svg','牛客 · 项目经历与面试准备','https://api-cdn.nowcoder.com/discuss/353148589197172736','discussion-example-14',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'功能列表不是需求依据，先把用户在什么场景下被阻碍说清楚。',TRUE FROM community_posts WHERE seed_key='discussion-example-14';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'可以讨论验证失败后怎么办，这比只描述理想结果更能展示判断。',TRUE FROM community_posts WHERE seed_key='discussion-example-14';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','准备时间只有两周：学习清单怎样排优先级？','求职者的计划每天包含多个框架、十几道题与一段项目开发，三天后完成不了就全部放弃。

## 场景拆解

先围绕目标岗位选最重要的准备内容，把每天的任务写成可检查的产出：一个项目短介绍、一道题的边界分析、一个知识点的口头解释。

预留复习与缓冲时间。下面的学习安排只是示例，不保证在固定天数内获得面试或录用。

## 一起讨论

如果今天只能做一件事，你会选择哪项最能减少自己的面试短板？','PUBLISHED','成长计划','/community/examples/discussion-example-15.svg','MIT CAPD · Interview primer','https://capd.mit.edu/resources/interview-primer/','discussion-example-15',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'不要把“学习某框架”当成单日任务，可以改成做一个小功能并解释为何这样实现。',TRUE FROM community_posts WHERE seed_key='discussion-example-15';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'复盘连续两天没有完成的任务，先调整范围，而不是简单增加学习时长。',TRUE FROM community_posts WHERE seed_key='discussion-example-15';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','模拟面试怎么互评，才不只是互相鼓励？','两人互相模拟面试后只说“挺好的，多练练”，被评价的人不知道具体应该改变哪里。

## 场景拆解

把反馈限定在可观察的表达：问题是否先被澄清，个人贡献是否说清，结果是否有依据。每条建议配一个当时的句子或停顿位置。

示例反馈：“你介绍了团队目标，但没有说自己负责哪一段；下次用一句话先划出个人职责。”以讨论为主，不把互评当成招聘结论。

## 一起讨论

你希望收到怎样的反馈？尝试把“表达不够好”改成可以执行的具体建议。','PUBLISHED','成长计划','/community/examples/discussion-example-16.svg','MIT CAPD · Interview primer','https://capd.mit.edu/resources/interview-primer/','discussion-example-16',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'先问对方最想练习的部分，再安排问题，模拟面试才更有针对性。',TRUE FROM community_posts WHERE seed_key='discussion-example-16';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'反馈也可以指出做得好的具体动作，例如先举小例子解释抽象概念。',TRUE FROM community_posts WHERE seed_key='discussion-example-16';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','GitHub 作品集：让别人三分钟知道项目做了什么','项目仓库只有源代码和默认 README，面试官无法快速了解功能、运行方式与个人完成的部分。

## 场景拆解

准备一张系统或流程图、一段短演示和清楚的 README：说明目标、主要功能、启动要求与已知限制。提供可复现的示例数据，移除密钥与私人信息。

把没完成的功能标注清楚。作品集可展示思路，不需要为了好看虚构用户规模或商业结果。

## 一起讨论

你最希望别人打开仓库后先看到什么？哪一条运行说明曾经让别人卡住？','PUBLISHED','成长计划','/community/examples/discussion-example-17.svg','牛客 · 项目经历与面试准备','https://api-cdn.nowcoder.com/discuss/353148589197172736','discussion-example-17',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'README 可以从“这个项目解决什么问题”开始，而不先放一长串徽章和技术名称。',TRUE FROM community_posts WHERE seed_key='discussion-example-17';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'若演示无法长期在线，保留短录屏和复现步骤也有助于交流。',TRUE FROM community_posts WHERE seed_key='discussion-example-17';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','面试反问环节：问什么才能帮助双向了解？','面试官询问是否还有问题，求职者只问“公司做什么业务”，但招聘介绍已经回答过这个问题。

## 场景拆解

围绕岗位真实工作提问：新人通常先解决哪类问题，怎样与相关团队协作，工作成果如何获得反馈。结合之前的对话选择两三个问题，不照单念一大串。

问题要帮助你了解环境与预期，不把某一种回答直接当成公司好坏的结论。

## 一起讨论

你问过哪一个问题，让自己更理解岗位？欢迎分享问题本身，而不公开未获授权的面试信息。','PUBLISHED','求职沟通','/community/examples/discussion-example-18.svg','MIT CAPD · Interview primer','https://capd.mit.edu/resources/interview-primer/','discussion-example-18',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'可以追问一个面试中提到的业务难点，显示你确实听懂了对方的说明。',TRUE FROM community_posts WHERE seed_key='discussion-example-18';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'如果时间很短，选择最影响自己判断的问题即可，不必为了反问而反问。',TRUE FROM community_posts WHERE seed_key='discussion-example-18';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','等待面试结果时，如何写一封清楚的跟进消息？','面试结束后没有确定的反馈时间，求职者连续发送“有结果了吗”，对方缺少上下文，也不清楚需要回复什么。

## 场景拆解

整理一封简短消息：说明姓名、岗位与面试日期，询问是否方便告知后续安排，并表达感谢。若对方已约定反馈时间，先尊重该安排。

示例：“您好，我是上周参加 Web 开发实习面试的同学，想了解后续流程是否已有安排。若还在评估，我愿意补充相关材料。感谢您的时间。”根据真实经历改写。

## 一起讨论

你会如何让跟进消息既清楚，又不给对方造成催促感？','PUBLISHED','求职沟通','/community/examples/discussion-example-19.svg','MIT CAPD · Interview primer','https://capd.mit.edu/resources/interview-primer/','discussion-example-19',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'先写清岗位与面试时间，通常比重复发送一句“有结果吗”更容易得到有效回复。',TRUE FROM community_posts WHERE seed_key='discussion-example-19';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'沟通渠道和节奏可以先向招聘联系人确认，不同团队的流程可能不同。',TRUE FROM community_posts WHERE seed_key='discussion-example-19';
INSERT INTO community_posts(author_id,channel,title,content,status,topic,cover_image,source_title,source_url,seed_key,is_example,pinned) VALUES (${EDITOR_ID},'DISCUSSION','AI 润色后的简历很漂亮，怎样检查有没有失真？','AI 把“参与开发”改成“主导架构设计”，还补上没有测过的指标。求职者担心原来的描述不够有吸引力，犹豫是否保留。

## 场景拆解

逐句检查责任动词、技术名词与数字。只有能由真实经历或记录支持的内容才保留；不确定的事实回到自己的笔记、代码或实验记录确认。

再模拟追问：“你具体改了什么？为什么选择这个方案？如何验证？”如果自己无法解释，就重新写成准确的范围。AI 可以辅助组织语言，不能替你创造经历。

## 一起讨论

哪类润色最容易悄悄改变事实？你会怎样设置自己的核对清单？','PUBLISHED','求职沟通','/community/examples/discussion-example-20.svg','哈佛职业中心 · 简历表达建议','https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/','discussion-example-20',TRUE,FALSE);
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'“主导、负责、参与、协助”表达的职责不同，不要只因为更有气势就替换。',TRUE FROM community_posts WHERE seed_key='discussion-example-20';
INSERT INTO community_comments(post_id,author_id,content,is_example) SELECT id,${EDITOR_ID},'也要检查岗位关键词是否被过度添加；能讲清楚自己做过的部分，比装成全都精通更稳妥。',TRUE FROM community_posts WHERE seed_key='discussion-example-20';
INSERT INTO community_seed_versions(version) VALUES('discussion-examples-v1');
END $seed$;
