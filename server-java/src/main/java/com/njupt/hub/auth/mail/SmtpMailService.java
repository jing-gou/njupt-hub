package com.njupt.hub.auth.mail;

import java.util.Properties;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class SmtpMailService implements CodeMailSender {

    private final JavaMailSenderImpl sender;
    private final String from;

    public SmtpMailService(
        @Value("${spring.mail.host:}") String host,
        @Value("${spring.mail.port:465}") int port,
        @Value("${spring.mail.username:}") String username,
        @Value("${spring.mail.password:}") String password,
        @Value("${spring.mail.properties.mail.smtp.auth:true}") boolean auth,
        @Value("${spring.mail.properties.mail.smtp.ssl.enable:true}") boolean ssl,
        @Value("${SMTP_STARTTLS:false}") boolean starttls,
        @Value("${SMTP_FROM:${spring.mail.username:}}") String from
    ) {
        this.sender = new JavaMailSenderImpl();
        this.sender.setHost(host);
        this.sender.setPort(port);
        this.sender.setUsername(username);
        this.sender.setPassword(password);

        Properties properties = this.sender.getJavaMailProperties();
        properties.put("mail.smtp.auth", Boolean.toString(auth));
        properties.put("mail.smtp.ssl.enable", Boolean.toString(ssl));
        properties.put("mail.smtp.starttls.enable", Boolean.toString(starttls));
        properties.put("mail.smtp.ssl.trust", "*");
        properties.put("mail.smtp.connectiontimeout", "5000");
        properties.put("mail.smtp.timeout", "5000");
        properties.put("mail.smtp.writetimeout", "5000");

        this.from = from == null || from.isBlank() ? username : from;
    }

    @Override
    public void sendVerificationCode(String to, String code) {
        send(to, "NJUPT Hub - 注册验证码", """
            <div style="font-family:sans-serif;padding:20px;color:#333">
              <h2 style="color:#2563eb">欢迎注册 NJUPT Hub</h2>
              <p>您正在注册 NJUPT Hub 账号，请使用以下验证码完成验证：</p>
              <div style="background:#f3f4f6;padding:15px;border-radius:8px;font-size:24px;font-weight:bold;text-align:center;letter-spacing:5px;color:#1f2937;margin:20px 0">%s</div>
              <p style="font-size:14px;color:#6b7280">验证码有效期为 5 分钟。如果不是您本人操作，请忽略此邮件。</p>
            </div>
            """.formatted(code));
    }

    @Override
    public void sendResetPasswordCode(String to, String code) {
        send(to, "NJUPT Hub - 重置密码验证码", """
            <div style="font-family:sans-serif;padding:20px;color:#333">
              <h2 style="color:#2563eb">重置您的密码</h2>
              <p>您正在申请重置 NJUPT Hub 的账号密码，请使用以下验证码完成操作：</p>
              <div style="background:#fef2f2;padding:15px;border-radius:8px;font-size:24px;font-weight:bold;text-align:center;letter-spacing:5px;color:#dc2626;margin:20px 0">%s</div>
              <p style="font-size:14px;color:#6b7280">验证码有效期为 5 分钟。如果不是您本人操作，请尽快修改密码以保护账号安全。</p>
            </div>
            """.formatted(code));
    }

    private void send(String to, String subject, String html) {
        send(to, subject, null, html);
    }

    public void send(String to, String subject, String text, String html) {
        if (sender.getHost() == null || sender.getHost().isBlank()) {
            throw new IllegalStateException("SMTP configuration is incomplete: SMTP_HOST");
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            if (text == null) {
                helper.setText(html, true);
            } else {
                helper.setText(text, html);
            }
            sender.send(message);
        } catch (MessagingException ex) {
            throw new IllegalStateException("Failed to send mail", ex);
        }
    }
}
