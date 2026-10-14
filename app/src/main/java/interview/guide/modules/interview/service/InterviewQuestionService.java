package interview.guide.modules.interview.service;

import interview.guide.common.ai.StructuredOutputInvoker;
import interview.guide.common.exception.ErrorCode;
import interview.guide.modules.interview.model.InterviewQuestionDTO;
import interview.guide.modules.interview.model.InterviewQuestionDTO.QuestionType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class InterviewQuestionService {
    private static final Logger log = LoggerFactory.getLogger(InterviewQuestionService.class);
    private static final int MAX_FOLLOW_UP_COUNT = 2;
    private static final Pattern SPLIT_PATTERN = Pattern.compile("[，。；、,;\\n]");

    private final ChatClient chatClient;
    private final PromptTemplate systemPromptTemplate;
    private final PromptTemplate userPromptTemplate;
    private final BeanOutputConverter<QuestionListDTO> outputConverter;
    private final StructuredOutputInvoker structuredOutputInvoker;
    private final int followUpCount;

    private record QuestionListDTO(List<QuestionDTO> questions) {}
    private record QuestionDTO(String question, String type, String category, List<String> followUps) {}
    private record DistributionBucket(String label, QuestionType type, int weight, String description) {}
    private record QuestionSeed(String question, QuestionType type, String category, int priority) {}

    public InterviewQuestionService(
        ChatClient.Builder chatClientBuilder,
        StructuredOutputInvoker structuredOutputInvoker,
        @Value("classpath:prompts/interview-question-system.st") Resource systemPromptResource,
        @Value("classpath:prompts/interview-question-user.st") Resource userPromptResource,
        @Value("${app.interview.follow-up-count:1}") int followUpCount
    ) throws IOException {
        this.chatClient = chatClientBuilder.build();
        this.structuredOutputInvoker = structuredOutputInvoker;
        this.systemPromptTemplate = new PromptTemplate(systemPromptResource.getContentAsString(StandardCharsets.UTF_8));
        this.userPromptTemplate = new PromptTemplate(userPromptResource.getContentAsString(StandardCharsets.UTF_8));
        this.outputConverter = new BeanOutputConverter<>(QuestionListDTO.class);
        this.followUpCount = Math.max(0, Math.min(MAX_FOLLOW_UP_COUNT, followUpCount));
    }

    public List<InterviewQuestionDTO> generateQuestions(String resumeText, int questionCount, List<String> historicalQuestions) {
        String safeResumeText = resumeText == null ? "" : resumeText;
        log.info("开始生成面试问题，简历长度: {}, 问题数量: {}, 历史问题数: {}",
            safeResumeText.length(), questionCount, historicalQuestions != null ? historicalQuestions.size() : 0);
        try {
            Map<String, Object> vars = new HashMap<>();
            vars.put("questionCount", questionCount);
            vars.put("followUpCount", followUpCount);
            vars.put("resumeText", safeResumeText);
            vars.put("distributionPlan", buildDistributionPlan(safeResumeText, questionCount));
            vars.put("generationHint", buildGenerationHint(safeResumeText, historicalQuestions));
            vars.put("historicalQuestions", formatHistoricalQuestions(historicalQuestions));

            QuestionListDTO dto = structuredOutputInvoker.invoke(
                chatClient,
                systemPromptTemplate.render() + "\n\n" + outputConverter.getFormat(),
                userPromptTemplate.render(vars),
                outputConverter,
                ErrorCode.INTERVIEW_QUESTION_GENERATION_FAILED,
                "面试问题生成失败：",
                "结构化问题生成",
                log
            );

            List<InterviewQuestionDTO> questions = convertToQuestions(dto);
            if (!questions.isEmpty()) {
                return questions;
            }
            log.warn("AI 返回空题目，使用动态兜底题库");
        } catch (Exception e) {
            log.error("生成面试问题失败: {}", e.getMessage(), e);
        }
        return generateDefaultQuestions(safeResumeText, questionCount, historicalQuestions);
    }

    public List<InterviewQuestionDTO> generateQuestions(String resumeText, int questionCount) {
        return generateQuestions(resumeText, questionCount, null);
    }

    private List<DistributionBucket> inferDistributionBuckets(String resumeText) {
        String text = resumeText == null ? "" : resumeText.toLowerCase(Locale.ROOT);
        List<DistributionBucket> buckets = new ArrayList<>();
        buckets.add(new DistributionBucket("项目经历", QuestionType.PROJECT, 35, "重点追问代表项目、职责边界、决策依据与结果复盘"));

        if (containsAny(text, "产品", "prd", "需求", "原型", "axure", "用户研究", "竞品", "增长", "转化")) {
            buckets.add(new DistributionBucket("产品设计", QuestionType.PROJECT, 25, "关注需求分析、用户洞察、方案设计与指标验证"));
            buckets.add(new DistributionBucket("业务分析", QuestionType.PROJECT, 20, "关注目标拆解、数据判断、优先级与跨团队协同"));
        }
        if (containsAny(text, "测试", "test", "jmeter", "postman", "自动化", "接口测试", "性能测试", "selenium")) {
            buckets.add(new DistributionBucket("测试设计", QuestionType.PROJECT, 25, "关注用例设计、缺陷分析、自动化与质量保障"));
            buckets.add(new DistributionBucket("质量保障", QuestionType.PROJECT, 20, "关注测试策略、回归体系、线上质量与风险控制"));
        }
        if (containsAny(text, "前端", "vue", "react", "typescript", "javascript", "html", "css", "uniapp", "小程序")) {
            buckets.add(new DistributionBucket("前端工程", QuestionType.PROJECT, 25, "关注组件设计、状态管理、性能优化与交互实现"));
            buckets.add(new DistributionBucket("浏览器与性能", QuestionType.PROJECT, 15, "关注渲染机制、网络优化、工程化与用户体验"));
        }
        if (containsAny(text, "python", "数据分析", "sql", "bi", "报表", "指标", "埋点", "a/b", "实验")) {
            buckets.add(new DistributionBucket("数据分析", QuestionType.PROJECT, 20, "关注指标体系、分析方法、实验设计与结论落地"));
        }
        if (containsAny(text, "算法", "机器学习", "模型", "推荐", "召回", "排序", "特征", "训练")) {
            buckets.add(new DistributionBucket("算法与模型", QuestionType.PROJECT, 25, "关注建模思路、特征工程、评估指标与线上效果"));
        }
        if (containsAny(text, "运营", "活动", "投放", "社群", "内容", "留存", "拉新", "复购")) {
            buckets.add(new DistributionBucket("运营策略", QuestionType.PROJECT, 25, "关注活动设计、用户分层、转化路径与复盘优化"));
        }
        if (containsAny(text, "设计", "ui", "ux", "交互", "视觉", "figma", "sketch")) {
            buckets.add(new DistributionBucket("设计方法", QuestionType.PROJECT, 20, "关注设计思路、用户体验、规范沉淀与协作过程"));
        }

        if (containsAny(text, "mysql", "sql", "索引", "事务", "数据库")) {
            buckets.add(new DistributionBucket("MySQL / 数据库", QuestionType.MYSQL, 20, "围绕数据库设计、SQL 优化、事务与数据建模提问"));
        }
        if (containsAny(text, "redis", "缓存", "分布式锁", "lua")) {
            buckets.add(new DistributionBucket("Redis / 缓存", QuestionType.REDIS, 15, "围绕缓存策略、一致性、分布式协同与热点问题提问"));
        }
        if (containsAny(text, "spring boot", "springboot", "spring")) {
            buckets.add(new DistributionBucket("Spring 生态", QuestionType.SPRING_BOOT, 12, "围绕框架机制、工程组织、依赖注入与常见实践提问"));
        }
        if (containsAny(text, "线程池", "并发", "多线程", "锁", "线程")) {
            buckets.add(new DistributionBucket("并发与稳定性", QuestionType.JAVA_CONCURRENT, 12, "围绕并发控制、异步编排、稳定性和性能治理提问"));
        }
        if (containsAny(text, "jvm", "gc", "内存", "异常", "java")) {
            buckets.add(new DistributionBucket("Java 基础", QuestionType.JAVA_BASIC, 10, "围绕语言基础、JVM、异常治理与工程实践提问"));
        }
        if (containsAny(text, "hashmap", "map", "list", "set", "集合")) {
            buckets.add(new DistributionBucket("Java 集合", QuestionType.JAVA_COLLECTION, 8, "围绕集合使用场景、底层结构与取舍提问"));
        }

        if (buckets.size() == 1) {
            buckets.add(new DistributionBucket("通用能力", QuestionType.PROJECT, 20, "补充问题拆解、协作推进、复盘优化与职业判断"));
        }
        return buckets;
    }

    private String buildDistributionPlan(String resumeText, int questionCount) {
        List<DistributionBucket> buckets = inferDistributionBuckets(resumeText);
        int totalWeight = buckets.stream().mapToInt(DistributionBucket::weight).sum();
        if (totalWeight <= 0) {
            return "- 项目经历：至少 1 题，重点考察候选人最核心的项目经验与业务价值。";
        }

        List<String> lines = new ArrayList<>();
        int assigned = 0;
        for (int i = 0; i < buckets.size(); i++) {
            DistributionBucket bucket = buckets.get(i);
            int count = (i == buckets.size() - 1)
                ? Math.max(1, questionCount - assigned)
                : Math.max(1, (int) Math.round((double) questionCount * bucket.weight() / totalWeight));
            assigned += count;
            lines.add(String.format("- %s：约 %d 题，%s", bucket.label(), count, bucket.description()));
        }
        return String.join("\n", lines);
    }

    private List<InterviewQuestionDTO> convertToQuestions(QuestionListDTO dto) {
        List<InterviewQuestionDTO> questions = new ArrayList<>();
        if (dto == null || dto.questions() == null) {
            return questions;
        }
        int index = 0;
        for (QuestionDTO q : dto.questions()) {
            if (q == null || q.question() == null || q.question().isBlank()) {
                continue;
            }
            QuestionType type = parseQuestionType(q.type());
            questions.add(InterviewQuestionDTO.create(index++, enrichQuestionText(q.question()), type, q.category(), false, null));
        }
        return questions;
    }

    private QuestionType parseQuestionType(String typeStr) {
        try {
            return QuestionType.valueOf(typeStr.toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            return QuestionType.JAVA_BASIC;
        }
    }

    private String enrichQuestionText(String question) {
        if (question == null) {
            return "请结合你最有代表性的项目，完整说明背景、你的职责、关键决策、技术实现与结果复盘。";
        }
        String text = question.trim();
        if (text.isBlank()) {
            return "请结合你最有代表性的项目，完整说明背景、你的职责、关键决策、技术实现与结果复盘。";
        }
        if (text.length() >= 24) {
            return text;
        }
        return text + " 请结合一个具体项目场景，补充说明背景、你的职责、关键决策和最终结果。";
    }

    private List<InterviewQuestionDTO> generateDefaultQuestions(String resumeText, int count, List<String> historicalQuestions) {
        Set<String> history = toNormalizedSet(historicalQuestions);
        List<QuestionSeed> seeds = buildFallbackSeeds(resumeText).stream()
            .filter(seed -> !history.contains(normalizeQuestion(seed.question())))
            .collect(Collectors.toCollection(ArrayList::new));
        if (seeds.isEmpty()) {
            seeds = buildFallbackSeeds(resumeText);
        }

        List<InterviewQuestionDTO> result = new ArrayList<>();
        int index = 0;
        for (QuestionSeed seed : seeds.stream().limit(count).toList()) {
            result.add(InterviewQuestionDTO.create(index++, seed.question(), seed.type(), seed.category(), false, null));
        }
        return result;
    }

    private List<QuestionSeed> buildFallbackSeeds(String resumeText) {
        String text = resumeText == null ? "" : resumeText.toLowerCase(Locale.ROOT);
        List<QuestionSeed> seeds = new ArrayList<>();
        seeds.add(new QuestionSeed("请挑一个你简历里最能体现业务价值的项目，详细说明你的职责分工、关键方案以及最终结果。", QuestionType.PROJECT, "项目经历", 100));
        seeds.add(new QuestionSeed("请分享一次你在项目中遇到的最大挑战，你是如何分析问题、推进协作并最终落地解决的？", QuestionType.PROJECT, "问题解决", 99));

        if (containsAny(text, "产品", "prd", "需求", "原型", "axure", "用户研究", "竞品", "增长", "转化")) {
            seeds.add(new QuestionSeed("请结合一个你主导或深度参与的需求，说明你如何完成用户洞察、需求拆解、方案设计与效果验证。", QuestionType.PROJECT, "产品设计", 96));
            seeds.add(new QuestionSeed("如果某个核心功能上线后数据不及预期，你会如何判断问题出在需求、交互、节奏还是目标用户？", QuestionType.PROJECT, "业务分析", 95));
        }
        if (containsAny(text, "测试", "jmeter", "postman", "自动化", "接口测试", "性能测试", "selenium")) {
            seeds.add(new QuestionSeed("请结合实际项目说明你是如何设计测试方案、覆盖关键风险点，并保障上线质量的。", QuestionType.PROJECT, "测试设计", 96));
            seeds.add(new QuestionSeed("请分享一次你定位复杂缺陷或线上质量问题的过程，你是怎么缩小范围并验证根因的？", QuestionType.PROJECT, "缺陷分析", 95));
        }
        if (containsAny(text, "前端", "vue", "react", "typescript", "javascript", "html", "css", "uniapp", "小程序")) {
            seeds.add(new QuestionSeed("请结合你的项目说明前端架构、组件拆分和状态管理是如何设计的，为什么这么设计？", QuestionType.PROJECT, "前端工程", 96));
            seeds.add(new QuestionSeed("如果页面性能、首屏速度或交互体验出现问题，你通常会如何分析并优化？", QuestionType.PROJECT, "性能优化", 95));
        }
        if (containsAny(text, "python", "数据分析", "sql", "bi", "报表", "指标", "埋点", "a/b", "实验")) {
            seeds.add(new QuestionSeed("请结合一个分析场景说明你如何定义指标、清洗数据、分析结论并推动业务动作。", QuestionType.PROJECT, "数据分析", 95));
        }
        if (containsAny(text, "算法", "机器学习", "模型", "推荐", "召回", "排序", "特征", "训练")) {
            seeds.add(new QuestionSeed("请结合一个模型或算法场景说明你的建模思路、特征选择、评估方式以及效果落地。", QuestionType.PROJECT, "算法与模型", 95));
        }
        if (containsAny(text, "运营", "活动", "投放", "社群", "内容", "留存", "拉新", "复购")) {
            seeds.add(new QuestionSeed("请结合一次运营活动或增长项目，说明你如何制定策略、拆解目标、跟踪数据并复盘优化。", QuestionType.PROJECT, "运营策略", 95));
        }
        if (containsAny(text, "设计", "ui", "ux", "交互", "视觉", "figma", "sketch")) {
            seeds.add(new QuestionSeed("请结合你的作品或项目，说明你是如何平衡用户体验、业务目标与实现成本的。", QuestionType.PROJECT, "设计方法", 94));
        }
        if (containsAny(text, "mysql", "sql", "索引", "事务", "数据库")) {
            seeds.add(new QuestionSeed("你在项目里是如何做 MySQL 索引设计和 SQL 调优的？请结合一个慢查询优化案例展开说明。", QuestionType.MYSQL, "MySQL / 数据库", 93));
        }
        if (containsAny(text, "redis", "缓存", "分布式锁", "lua")) {
            seeds.add(new QuestionSeed("你在项目中是如何使用 Redis 的？缓存一致性、击穿或分布式锁问题你是怎么处理的？", QuestionType.REDIS, "Redis / 缓存", 92));
        }
        if (containsAny(text, "spring boot", "springboot", "spring")) {
            seeds.add(new QuestionSeed("请结合你的项目说明 Spring / Spring Boot 为你解决了什么问题，核心自动装配或 Bean 管理机制你是怎么理解的？", QuestionType.SPRING_BOOT, "Spring 生态", 91));
        }
        if (containsAny(text, "线程池", "并发", "多线程", "锁", "线程")) {
            seeds.add(new QuestionSeed("你在实际项目里处理过哪些并发问题？请结合线程池、锁竞争或异步编排中的一个场景具体说明。", QuestionType.JAVA_CONCURRENT, "并发与稳定性", 90));
        }
        if (containsAny(text, "jvm", "gc", "内存", "异常", "java")) {
            seeds.add(new QuestionSeed("请结合你的开发经验，谈谈一次 JVM、GC、异常治理或内存问题的分析与定位过程。", QuestionType.JAVA_BASIC, "Java 基础", 89));
        }
        if (containsAny(text, "hashmap", "map", "list", "set", "集合")) {
            seeds.add(new QuestionSeed("Java 集合在你的项目里主要承担了什么职责？请结合一个具体场景说明为什么选这个集合以及它的底层原理。", QuestionType.JAVA_COLLECTION, "Java 集合", 88));
        }

        seeds.add(new QuestionSeed("请解释一次你在项目中遇到的线上故障或重大问题，从发现到根因定位，再到修复和复盘的完整过程。", QuestionType.PROJECT, "故障排查", 80));
        return seeds.stream().sorted(Comparator.comparingInt(QuestionSeed::priority).reversed()).collect(Collectors.toCollection(ArrayList::new));
    }

    private boolean containsAny(String text, String... keys) {
        for (String key : keys) {
            if (text.contains(key)) {
                return true;
            }
        }
        return false;
    }

    private String formatHistoricalQuestions(List<String> historicalQuestions) {
        if (historicalQuestions == null || historicalQuestions.isEmpty()) {
            return "暂无历史提问";
        }
        return historicalQuestions.stream().filter(item -> item != null && !item.isBlank()).collect(Collectors.joining("\n"));
    }

    private String buildGenerationHint(String resumeText, List<String> historicalQuestions) {
        int resumeHash = Math.abs((resumeText == null ? "" : resumeText).hashCode());
        int historySize = historicalQuestions == null ? 0 : historicalQuestions.size();
        List<String> keywords = extractResumeKeywords(resumeText);
        String keywordHint = keywords.isEmpty() ? "未提取到明显岗位关键词" : String.join("、", keywords.stream().limit(5).toList());
        return switch (ThreadLocalRandom.current().nextInt(3)) {
            case 0 -> "本次优先从候选人的核心项目与岗位能力切入，再追问关键方法与结果。关键词=" + keywordHint + ", resumeHash=" + resumeHash + ", historySize=" + historySize;
            case 1 -> "本次优先覆盖与历史问题不同的能力维度，强调真实业务场景、协作过程和问题拆解。关键词=" + keywordHint + ", resumeHash=" + resumeHash + ", historySize=" + historySize;
            default -> "本次优先围绕简历中最强信号的领域展开提问，避免套用固定技术栈模板。关键词=" + keywordHint + ", resumeHash=" + resumeHash + ", historySize=" + historySize;
        };
    }

    private List<String> extractResumeKeywords(String resumeText) {
        if (resumeText == null || resumeText.isBlank()) {
            return List.of();
        }
        return SPLIT_PATTERN.splitAsStream(resumeText)
            .map(String::trim)
            .filter(item -> item.length() >= 2 && item.length() <= 12)
            .filter(item -> item.chars().anyMatch(Character::isLetterOrDigit) || item.chars().anyMatch(ch -> ch >= 0x4e00 && ch <= 0x9fa5))
            .distinct()
            .limit(8)
            .toList();
    }

    private Set<String> toNormalizedSet(List<String> questions) {
        if (questions == null || questions.isEmpty()) {
            return Set.of();
        }
        return questions.stream().filter(item -> item != null && !item.isBlank()).map(this::normalizeQuestion).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalizeQuestion(String question) {
        return question == null ? "" : question.replaceAll("\\s+", "").trim().toLowerCase(Locale.ROOT);
    }
}
