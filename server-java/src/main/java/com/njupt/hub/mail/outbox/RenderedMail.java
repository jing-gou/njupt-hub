package com.njupt.hub.mail.outbox;

public record RenderedMail(String subject, String text, String html) {
}
