package com.njupt.hub.auth.mail;

import java.lang.reflect.Field;
import java.util.Properties;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmtpMailServiceTest {

    @Test
    void sends_plain_text_and_html_as_multipart() throws Exception {
        JavaMailSenderImpl sender = mock(JavaMailSenderImpl.class);
        when(sender.getHost()).thenReturn("localhost");
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(message);

        SmtpMailService service = new SmtpMailService(
            "localhost", 25, "", "", false, false, false, "from@example.com");
        Field field = SmtpMailService.class.getDeclaredField("sender");
        field.setAccessible(true);
        field.set(service, sender);

        service.send("to@example.com", "subject", "plain", "<p>html</p>");

        verify(sender).send(message);
        message.saveChanges();
        assertThat(message.getContentType()).contains("multipart");
    }
}
