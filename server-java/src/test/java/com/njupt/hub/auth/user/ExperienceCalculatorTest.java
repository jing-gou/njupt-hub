package com.njupt.hub.auth.user;

import com.njupt.hub.auth.avatar.QiniuUrlSigner;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ExperienceCalculatorTest {

    private final QiniuUrlSigner signer = mock(QiniuUrlSigner.class);

    @Test
    void negative_experience_uses_floor_division() {
        User user = new User();
        user.setId(1);
        user.setUsername("dave");
        user.setEmail("dave@example.com");
        user.setRole("USER");
        user.setExperience(-50);

        UserView view = ExperienceCalculator.toView(user, signer);

        assertThat(view.level()).isZero();
        assertThat(view.nextLevelExp()).isZero();
        assertThat(view.levelProgress()).isEqualTo(50);
        assertThat(view.levelProgressTotal()).isEqualTo(100);
    }

    @Test
    void positive_experience_progresses_normally() {
        User user = new User();
        user.setId(1);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setRole("USER");
        user.setExperience(120);

        UserView view = ExperienceCalculator.toView(user, signer);

        assertThat(view.level()).isEqualTo(2);
        assertThat(view.nextLevelExp()).isEqualTo(200);
        assertThat(view.levelProgress()).isEqualTo(20);
    }
}
