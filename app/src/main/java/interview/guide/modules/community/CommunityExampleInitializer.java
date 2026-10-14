package interview.guide.modules.community;

import interview.guide.modules.auth.model.UserAccountEntity;
import interview.guide.modules.auth.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Versioned editorial examples: never impersonate members or recreate moderated posts. */
@Component
@Order(200)
@RequiredArgsConstructor
public class CommunityExampleInitializer implements ApplicationRunner {
    private final JdbcTemplate db;
    private final UserAccountRepository users;
    private final PasswordEncoder passwords;
    private final TransactionTemplate transactions;

    @Override public void run(ApplicationArguments args) throws Exception {
        if(db.queryForObject("SELECT COUNT(*) FROM community_seed_versions WHERE version='discussion-examples-v1'",Long.class)>0) return;
        var admins=db.queryForList("SELECT id FROM users WHERE role='ADMIN' ORDER BY id LIMIT 1",Long.class);
        long editorId;
        if(!admins.isEmpty()) editorId=admins.getFirst();
        else {
            var editor=new UserAccountEntity();
            editor.setUsername("community_editor_"+UUID.randomUUID().toString().substring(0,8));
            editor.setPasswordHash(passwords.encode(UUID.randomUUID().toString()));
            editorId=users.save(editor).getId();
        }
        String sql=new ClassPathResource("db/community-discussion-examples.sql").getContentAsString(StandardCharsets.UTF_8)
            .replace("${EDITOR_ID}",Long.toString(editorId));
        // PostgreSQL advisory transaction lock also makes simultaneous startup safe.
        transactions.executeWithoutResult(status -> {db.execute("SELECT pg_advisory_xact_lock(67321181)");db.execute(sql);});
    }
}
