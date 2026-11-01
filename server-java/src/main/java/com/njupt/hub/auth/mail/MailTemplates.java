package com.njupt.hub.auth.mail;

import java.util.List;

import com.njupt.hub.mail.outbox.RenderedMail;
import com.njupt.hub.resource.Resource;
import org.springframework.stereotype.Component;

@Component
public class MailTemplates {

    public RenderedMail uploadThankYou(String username, List<Resource> resources) {
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
        return new RenderedMail(subject, text.toString(), html);
    }

    public RenderedMail reviewResult(String username, Resource resource) {
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
        return new RenderedMail(subject, text, html);
    }

    private String escape(String value) {
        return String.valueOf(value)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }
}
