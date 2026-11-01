package com.njupt.hub.mail.outbox;

import java.util.List;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface MailOutboxMapper extends BaseMapper<MailOutbox> {

    @Select("SELECT COUNT(*) FROM mail_outbox WHERE status IN ('PENDING', 'RETRY', 'PROCESSING')")
    long pendingCount();

    @Select("SELECT MIN(created_at) FROM mail_outbox WHERE status IN ('PENDING', 'RETRY', 'PROCESSING', 'DEAD')")
    java.time.LocalDateTime oldestCreatedAt();

    @Select("SELECT COUNT(*) FROM mail_outbox WHERE status = 'DEAD'")
    long deadCount();

    @Select("""
        SELECT id, dedupe_key AS dedupeKey, mail_type AS mailType, recipient, subject,
               body_text AS bodyText, body_html AS bodyHtml, status, attempts,
               next_attempt_at AS nextAttemptAt, sent_at AS sentAt, last_error AS lastError,
               created_at AS createdAt
        FROM mail_outbox
        WHERE status IN ('PENDING', 'RETRY') AND next_attempt_at <= NOW(3)
        ORDER BY id
        LIMIT #{limit}
        FOR UPDATE SKIP LOCKED
        """)
    List<MailOutbox> lockDue(@Param("limit") int limit);

    @Select("""
        SELECT id, dedupe_key AS dedupeKey, mail_type AS mailType, recipient, subject,
               body_text AS bodyText, body_html AS bodyHtml, status, attempts,
               next_attempt_at AS nextAttemptAt, sent_at AS sentAt, last_error AS lastError,
               created_at AS createdAt
        FROM mail_outbox
        WHERE id = #{id}
        FOR UPDATE
        """)
    MailOutbox lockById(@Param("id") long id);
}
