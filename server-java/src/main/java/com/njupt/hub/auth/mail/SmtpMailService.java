package com.njupt.hub.auth.mail;

import java.util.Properties;

import com.njupt.hub.resource.Resource;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class SmtpMailService implements MailService {

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

    @Override
    public void sendUploadThankYouEmail(String to, String username, java.util.List<Resource> resources) {
        String name = username == null || username.isBlank() ? "同学" : username;
        String subject = "NJUPT Hub - 感谢你贡献了 " + resources.size() + " 份资料";
        StringBuilder text = new StringBuilder(name).append("，你好！\n\n")
            .append("感谢你向 NJUPT Hub 上传了 ").append(resources.size()).append(" 份学习资料。\n");
        StringBuilder rows = new StringBuilder();
        for (Resource resource : resources) {
            String title = resource.getTitle() == null ? "未命名资料" : resource.getTitle();
            String course = resource.getCourse() == null ? "未分类课程" : resource.getCourse();
            text.append("- ").append(title).append("（").append(course).append("）\n");
            rows.append("<tr><td style=\"padding:8px;border-bottom:1px solid #eee\">")
                .append(escape(title)).append("</td><td style=\"padding:8px;border-bottom:1px solid #eee\">")
                .append(escape(course)).append("</td></tr>");
        }
        text.append("\n资料已进入审核队列，审核通过后会出现在资料库中。\n\nNJUPT Hub");
        String html = "<div style=\"font-family:sans-serif;padding:20px;color:#333\">"
            + "<h2 style=\"color:#1d4ed8\">谢谢你的分享</h2>"
            + "<p>" + escape(name) + "，你好！感谢你向 NJUPT Hub 上传了 <strong>"
            + resources.size() + "</strong> 份学习资料。</p>"
            + "<table style=\"border-collapse:collapse;width:100%\"><thead><tr>"
            + "<th style=\"text-align:left;padding:8px\">资料</th>"
            + "<th style=\"text-align:left;padding:8px\">课程</th></tr></thead><tbody>"
            + rows + "</tbody></table>"
            + "<p>资料已进入审核队列，审核通过后会出现在资料库中。</p></div>";
        send(to, subject, text.toString(), html);
    }

    @Override
    public void sendResourceReviewResultEmail(String to, String username, Resource resource) {
        String name = username == null || username.isBlank() ? "同学" : username;
        boolean approved = "APPROVED".equals(resource.getStatus());
        String statusText = approved ? "已通过审核" : "未通过审核";
        String subject = "NJUPT Hub - 你上传的资料" + statusText;
        String text = name + "，你好！\n\n你上传到 NJUPT Hub 的资料《"
            + (resource.getTitle() == null ? "未命名资料" : resource.getTitle())
            + "》审核结果为：" + statusText + "。\n\nNJUPT Hub";
        String html = "<div style=\"font-family:sans-serif;padding:20px;color:#333\">"
            + "<h2 style=\"color:" + (approved ? "#15803d" : "#dc2626") + "\">"
            + (approved ? "资料审核通过啦" : "资料审核结果已出") + "</h2>"
            + "<p>" + escape(name) + "，你好！</p>"
            + "<p>资料名称：<strong>"
            + escape(resource.getTitle() == null ? "未命名资料" : resource.getTitle())
            + "</strong></p><p>所属课程："
            + escape(resource.getCourse() == null ? "未分类课程" : resource.getCourse())
            + "</p><p>审核结果：<strong>" + statusText + "</strong></p></div>";
        send(to, subject, text, html);
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

    private String escape(String value) {
        return String.valueOf(value)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }
}
