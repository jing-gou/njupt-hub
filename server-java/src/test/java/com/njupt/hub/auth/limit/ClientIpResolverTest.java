package com.njupt.hub.auth.limit;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver();

    @Test
    void prefers_real_ip_header() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("X-Real-IP")).thenReturn("203.0.113.7");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void falls_back_to_first_forwarded_for() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("X-Real-IP")).thenReturn(null);
        when(request.getHeader("X-Forwarded-For")).thenReturn("198.51.100.9, 10.0.0.1");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.9");
    }

    @Test
    void falls_back_to_remote_addr() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader("X-Real-IP")).thenReturn("not-an-ip");
        when(request.getHeader("X-Forwarded-For")).thenReturn("also-bad");
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");

        assertThat(resolver.resolve(request)).isEqualTo("127.0.0.1");
    }
}
