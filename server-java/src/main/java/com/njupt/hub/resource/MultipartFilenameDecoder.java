package com.njupt.hub.resource;

import java.nio.charset.StandardCharsets;

public final class MultipartFilenameDecoder {

    private MultipartFilenameDecoder() {
    }

    public static String decode(String raw) {
        if (raw == null || raw.isBlank()) {
            return raw;
        }
        String decoded = new String(raw.getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        boolean decodedHasCjk = decoded.codePoints()
            .anyMatch(codePoint -> codePoint >= 0x4E00 && codePoint <= 0x9FFF);
        boolean decodedBroken = decoded.contains("\uFFFD") || decoded.contains("?");
        return decodedHasCjk && !decodedBroken ? decoded : raw;
    }
}
