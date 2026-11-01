package com.njupt.hub.mail.outbox;

import java.util.List;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface MailOutboxMapper extends BaseMapper<MailOutbox> {

    @Insert("""
        INSERT IGNORE INTO mail_outbox
          (dedupe_key, mail_type, recipient, subject, body_text, body_html,
           status, attempts, next_attempt_at, created_at)
        VALUES
          (#{dedupeKey}, #{mailType}, #{recipient}, #{subject}, #{bodyText}, #{bodyHtml},
           #{status}, #{attempts}, #{nextAttemptAt}, #{createdAt})
        """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insertIgnore(MailOutbox row);

    @Select("SELECT COUNT(*) FROM mail_outbox WHERE status IN ('PENDING', 'RETRY', 'PROCESSING')")
    long pendingCount();

    @Select("SELECT MIN(next_attempt_at) FROM mail_outbox WHERE status IN ('PENDING', 'RETRY', 'PROCESSING')")
    java.time.LocalDateTime oldestDue();

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
