package interview.guide.modules.resume.repository;

import interview.guide.modules.resume.model.ResumeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 简历Repository
 */
@Repository
public interface ResumeRepository extends JpaRepository<ResumeEntity, Long> {

    List<ResumeEntity> findByOwnerUserIdOrderByUploadedAtDesc(Long ownerUserId);

    Optional<ResumeEntity> findByIdAndOwnerUserId(Long id, Long ownerUserId);

    Optional<ResumeEntity> findByOwnerUserIdAndFileHash(Long ownerUserId, String fileHash);

    boolean existsByIdAndOwnerUserId(Long id, Long ownerUserId);

    /**
     * 根据文件哈希查找简历（用于去重）——已废弃跨用户全局去重，请使用 {@link #findByOwnerUserIdAndFileHash}
     */
    @Deprecated
    Optional<ResumeEntity> findByFileHash(String fileHash);

    @Deprecated
    boolean existsByFileHash(String fileHash);
}
