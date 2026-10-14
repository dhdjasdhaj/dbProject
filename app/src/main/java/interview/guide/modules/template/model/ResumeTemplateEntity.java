package interview.guide.modules.template.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 简历模板实体
 * 用于"简历模板展示"模块，数据由爬虫脚本（scraper/resume_template）采集后导入。
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(
    name = "resume_template",
    uniqueConstraints = @UniqueConstraint(name = "uk_resume_template_source", columnNames = "source_id")
)
public class ResumeTemplateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 源站模板ID（去重键） */
    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    /** 模板标题 */
    @Column(nullable = false)
    private String title;

    /** 风格标签，以 JSON 数组字符串存储，如 ["简洁","时尚"]（项目惯例：List 存 TEXT 的 xxxJson） */
    @Column(name = "style_tags", columnDefinition = "TEXT")
    private String styleTagsJson;

    /** 首次抓取到的分类（热门 / 中·小学生 / ...） */
    @Column(name = "category_slug", length = 64)
    private String categorySlug;

    /** 使用次数 */
    @Column(name = "usage_count")
    private Integer usageCount;

    /** 源站缩略图 URL */
    @Column(name = "cover_url", length = 512)
    private String coverUrl;

    /** 本地图片相对路径 */
    @Column(name = "local_image_path", length = 255)
    private String localImagePath;

    /** 源站详情页 URL */
    @Column(name = "detail_url", length = 512)
    private String detailUrl;

    /** ★预留：Word 模板下载地址 */
    @Column(name = "word_download_url", length = 512)
    private String wordDownloadUrl;

    /** ★预留：Word 模板本地文件路径 */
    @Column(name = "word_local_path", length = 255)
    private String wordLocalPath;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
