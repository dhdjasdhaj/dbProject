package interview.guide.modules.interview.model;

import interview.guide.common.model.AsyncTaskStatus;
import interview.guide.modules.resume.model.ResumeEntity;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 面试会话实体
 */
@Entity
@Table(name = "interview_sessions", indexes = {
    @Index(name = "idx_interview_session_resume_created", columnList = "resume_id,created_at"),
    @Index(name = "idx_interview_session_resume_status_created", columnList = "resume_id,status,created_at")
})
public class InterviewSessionEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // 会话ID (UUID)
    @Column(nullable = false, unique = true, length = 36)
    private String sessionId;
    
    // 关联的简历
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private ResumeEntity resume;
    
    // 问题总数
    private Integer totalQuestions;
    
    // 当前问题索引
    private Integer currentQuestionIndex = 0;
    
    // 会话状态
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private SessionStatus status = SessionStatus.CREATED;
    
    // 问题列表 (JSON格式)
    @Column(columnDefinition = "TEXT")
    private String questionsJson;

    // 面试模式：TEXT / VIDEO
    @Column(length = 20)
    private String mode;

    // 单题最大追问次数
    private Integer maxFollowUps;

    // 是否启用摄像头
    private Boolean videoEnabled;

    // 是否启用麦克风
    private Boolean audioEnabled;
    
    // 总分 (0-100)
    private Integer overallScore;
    
    // 总体评价
    @Column(columnDefinition = "TEXT")
    private String overallFeedback;
    
    // 优势 (JSON)
    @Column(columnDefinition = "TEXT")
    private String strengthsJson;
    
    // 改进建议 (JSON)
    @Column(columnDefinition = "TEXT")
    private String improvementsJson;
    
    // 参考答案 (JSON)
    @Column(columnDefinition = "TEXT")
    private String referenceAnswersJson;
    
    // 面试答案记录
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InterviewAnswerEntity> answers = new ArrayList<>();
    
    // 创建时间
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    // 完成时间
    private LocalDateTime completedAt;

    // 评估状态（异步评估）
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AsyncTaskStatus evaluateStatus;

    // 评估错误信息
    @Column(length = 500)
    private String evaluateError;

    // 完整面试视频文件Key
    @Column(length = 500)
    private String completeVideoFileKey;

    // 完整面试视频文件URL
    @Column(length = 1000)
    private String completeVideoFileUrl;

    // 完整面试视频文件大小(字节)
    private Long completeVideoFileSize;

    // 完整面试视频时长(秒)
    private Integer completeVideoDurationSeconds;

    // 对话记录JSON
    @Column(columnDefinition = "TEXT")
    private String conversationLogJson;

    // 视频分析结果JSON(表情、手势、自信度)
    @Column(columnDefinition = "TEXT")
    private String videoAnalysisJson;

    public enum SessionStatus {
        CREATED,      // 会话已创建
        IN_PROGRESS,  // 面试进行中
        COMPLETED,    // 面试已完成
        EVALUATED     // 已生成评估报告
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getSessionId() {
        return sessionId;
    }
    
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
    
    public ResumeEntity getResume() {
        return resume;
    }
    
    public void setResume(ResumeEntity resume) {
        this.resume = resume;
    }
    
    public Integer getTotalQuestions() {
        return totalQuestions;
    }
    
    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }
    
    public Integer getCurrentQuestionIndex() {
        return currentQuestionIndex;
    }
    
    public void setCurrentQuestionIndex(Integer currentQuestionIndex) {
        this.currentQuestionIndex = currentQuestionIndex;
    }
    
    public SessionStatus getStatus() {
        return status;
    }
    
    public void setStatus(SessionStatus status) {
        this.status = status;
    }
    
    public String getQuestionsJson() {
        return questionsJson;
    }
    
    public void setQuestionsJson(String questionsJson) {
        this.questionsJson = questionsJson;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public Integer getMaxFollowUps() {
        return maxFollowUps;
    }

    public void setMaxFollowUps(Integer maxFollowUps) {
        this.maxFollowUps = maxFollowUps;
    }

    public Boolean getVideoEnabled() {
        return videoEnabled;
    }

    public void setVideoEnabled(Boolean videoEnabled) {
        this.videoEnabled = videoEnabled;
    }

    public Boolean getAudioEnabled() {
        return audioEnabled;
    }

    public void setAudioEnabled(Boolean audioEnabled) {
        this.audioEnabled = audioEnabled;
    }
    
    public Integer getOverallScore() {
        return overallScore;
    }
    
    public void setOverallScore(Integer overallScore) {
        this.overallScore = overallScore;
    }
    
    public String getOverallFeedback() {
        return overallFeedback;
    }
    
    public void setOverallFeedback(String overallFeedback) {
        this.overallFeedback = overallFeedback;
    }
    
    public String getStrengthsJson() {
        return strengthsJson;
    }
    
    public void setStrengthsJson(String strengthsJson) {
        this.strengthsJson = strengthsJson;
    }
    
    public String getImprovementsJson() {
        return improvementsJson;
    }
    
    public void setImprovementsJson(String improvementsJson) {
        this.improvementsJson = improvementsJson;
    }
    
    public String getReferenceAnswersJson() {
        return referenceAnswersJson;
    }
    
    public void setReferenceAnswersJson(String referenceAnswersJson) {
        this.referenceAnswersJson = referenceAnswersJson;
    }
    
    public List<InterviewAnswerEntity> getAnswers() {
        return answers;
    }
    
    public void setAnswers(List<InterviewAnswerEntity> answers) {
        this.answers = answers;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
    
    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public AsyncTaskStatus getEvaluateStatus() {
        return evaluateStatus;
    }

    public void setEvaluateStatus(AsyncTaskStatus evaluateStatus) {
        this.evaluateStatus = evaluateStatus;
    }

    public String getEvaluateError() {
        return evaluateError;
    }

    public void setEvaluateError(String evaluateError) {
        this.evaluateError = evaluateError;
    }

    public String getCompleteVideoFileKey() {
        return completeVideoFileKey;
    }

    public void setCompleteVideoFileKey(String completeVideoFileKey) {
        this.completeVideoFileKey = completeVideoFileKey;
    }

    public String getCompleteVideoFileUrl() {
        return completeVideoFileUrl;
    }

    public void setCompleteVideoFileUrl(String completeVideoFileUrl) {
        this.completeVideoFileUrl = completeVideoFileUrl;
    }

    public Long getCompleteVideoFileSize() {
        return completeVideoFileSize;
    }

    public void setCompleteVideoFileSize(Long completeVideoFileSize) {
        this.completeVideoFileSize = completeVideoFileSize;
    }

    public Integer getCompleteVideoDurationSeconds() {
        return completeVideoDurationSeconds;
    }

    public void setCompleteVideoDurationSeconds(Integer completeVideoDurationSeconds) {
        this.completeVideoDurationSeconds = completeVideoDurationSeconds;
    }

    public String getConversationLogJson() {
        return conversationLogJson;
    }

    public void setConversationLogJson(String conversationLogJson) {
        this.conversationLogJson = conversationLogJson;
    }

    public String getVideoAnalysisJson() {
        return videoAnalysisJson;
    }

    public void setVideoAnalysisJson(String videoAnalysisJson) {
        this.videoAnalysisJson = videoAnalysisJson;
    }

    public void addAnswer(InterviewAnswerEntity answer) {
        answers.add(answer);
        answer.setSession(this);
    }
}
