package interview.guide.modules.template.repository;

import interview.guide.modules.template.model.ResumeTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResumeTemplateRepository extends JpaRepository<ResumeTemplateEntity, Long> {

    Optional<ResumeTemplateEntity> findBySourceId(Long sourceId);
}
