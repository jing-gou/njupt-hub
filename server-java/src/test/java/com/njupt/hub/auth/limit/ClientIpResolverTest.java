package com.njupt.hub.auth.limit;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver("127.0.0.1,::1");

    @Test
    void prefers_real_ip_header_from_trusted_proxy() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getHeader("X-Real-IP")).thenReturn("203.0.113.7");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void falls_back_to_first_forwarded_for() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getHeader("X-Real-IP")).thenReturn(null);
        when(request.getHeader("X-Forwarded-For")).thenReturn("198.51.100.9, 10.0.0.1");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.9");
    }

    @Test
    void ignores_spoofed_headers_from_untrusted_clients() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("203.0.113.9");
        when(request.getHeader("X-Real-IP")).thenReturn("1.2.3.4");
        when(request.getHeader("X-Forwarded-For")).thenReturn("5.6.7.8");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.9");
    }

    @Test
    void falls_back_to_remote_addr() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getHeader("X-Real-IP")).thenReturn("not-an-ip");
        when(request.getHeader("X-Forwarded-For")).thenReturn("also-bad");

        assertThat(resolver.resolve(request)).isEqualTo("127.0.0.1");
    }
}
