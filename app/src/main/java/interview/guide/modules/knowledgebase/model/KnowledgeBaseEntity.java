package interview.guide.modules.knowledgebase.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * 知识库实体
 */
@Entity
@Table(
    name = "knowledge_bases",
    uniqueConstraints = @UniqueConstraint(name = "uk_kb_owner_filehash", columnNames = {"owner_user_id", "file_hash"}),
    indexes = {
        @Index(name = "idx_kb_category", columnList = "category")
    }
)
public class KnowledgeBaseEntity {

    private static final ZoneId BEIJING_ZONE_ID = ZoneId.of("Asia/Shanghai");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_user_id")
    private Long ownerUserId;

    // 文件内容的SHA-256哈希值（与 owner_user_id 组合唯一）
    @Column(name = "file_hash", nullable = false, length = 64)
    private String fileHash;

    // 知识库名称（用户自定义或从文件名提取）
    @Column(nullable = false)
    private String name;

    // 分类/分组（如"Java面试"、"项目文档"等）
    @Column(length = 100)
    private String category;

    // 原始文件名
    @Column(nullable = false)
    private String originalFilename;
    
    // 文件大小（字节）
    private Long fileSize;
    
    // 文件类型
    private String contentType;
    
    // RustFS存储的文件Key
    @Column(length = 500)
    private String storageKey;
    
    // RustFS存储的文件URL
    @Column(length = 1000)
    private String storageUrl;
    
    // 上传时间
    @Column(nullable = false)
    private LocalDateTime uploadedAt;
    
    // 最后访问时间
    private LocalDateTime lastAccessedAt;
    
    // 访问次数
    private Integer accessCount = 0;
    
    // 问题数量（用户针对此知识库提问的次数）
    private Integer questionCount = 0;

    // 向量化状态（新上传时为 PENDING，异步处理完成后变为 COMPLETED）
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private VectorStatus vectorStatus = VectorStatus.PENDING;

    // 向量化错误信息（失败时记录）
    @Column(length = 500)
    private String vectorError;

    // 向量分块数量
    private Integer chunkCount = 0;
    
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = nowInBeijing();
        if (uploadedAt == null) {
            uploadedAt = now;
        }
        if (lastAccessedAt == null) {
            lastAccessedAt = now;
        }
        if (accessCount == null || accessCount < 1) {
            accessCount = 1;
        }
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }

    public Long getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(Long ownerUserId) {
        this.ownerUserId = ownerUserId;
    }
    
    public String getFileHash() {
        return fileHash;
    }
    
    public void setFileHash(String fileHash) {
        this.fileHash = fileHash;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getOriginalFilename() {
        return originalFilename;
    }
    
    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }
    
    public Long getFileSize() {
        return fileSize;
    }
    
    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }
    
    public String getContentType() {
        return contentType;
    }
    
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
    
    public String getStorageKey() {
        return storageKey;
    }
    
    public void setStorageKey(String storageKey) {
        this.storageKey = storageKey;
    }
    
    public String getStorageUrl() {
        return storageUrl;
    }
    
    public void setStorageUrl(String storageUrl) {
        this.storageUrl = storageUrl;
    }
    
    public LocalDateTime getUploadedAt() {
        return uploadedAt;
    }
    
    public void setUploadedAt(LocalDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
    
    public LocalDateTime getLastAccessedAt() {
        return lastAccessedAt;
    }
    
    public void setLastAccessedAt(LocalDateTime lastAccessedAt) {
        this.lastAccessedAt = lastAccessedAt;
    }
    
    public Integer getAccessCount() {
        return accessCount;
    }
    
    public void setAccessCount(Integer accessCount) {
        this.accessCount = accessCount;
    }
    
    public Integer getQuestionCount() {
        return questionCount;
    }
    
    public void setQuestionCount(Integer questionCount) {
        this.questionCount = questionCount;
    }
    
    public void incrementAccessCount() {
        this.accessCount++;
        this.lastAccessedAt = nowInBeijing();
    }

    public void incrementQuestionCount() {
        this.questionCount++;
        this.lastAccessedAt = nowInBeijing();
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public VectorStatus getVectorStatus() {
        return vectorStatus;
    }

    public void setVectorStatus(VectorStatus vectorStatus) {
        this.vectorStatus = vectorStatus;
    }

    public String getVectorError() {
        return vectorError;
    }

    public void setVectorError(String vectorError) {
        this.vectorError = vectorError;
    }

    public Integer getChunkCount() {
        return chunkCount;
    }

    public void setChunkCount(Integer chunkCount) {
        this.chunkCount = chunkCount;
    }

    private LocalDateTime nowInBeijing() {
        return LocalDateTime.now(BEIJING_ZONE_ID);
    }
}

