package com.njupt.hub.sensitive;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SensitiveWordFilter {

    private static final String BUILTIN_PATH = "sensitive-words/builtin.txt";
    private static final String NOISE_PATH = "sensitive-words/noise-chars.txt";
    private static final String LEXICON_DIR = "sensitive-lexicon/";
    private static final String LEXICON_INDEX = LEXICON_DIR + "index.txt";

    private final Node root = new Node();
    private final Set<Character> noise = new HashSet<>();
    private int loadedWords;

    public SensitiveWordFilter(@Value("${SENSITIVE_WORDS:}") String extraWords) {
        loadNoiseChars();
        addWords(readLines(BUILTIN_PATH));
        loadLexicon();
        addWords(splitWords(extraWords));
        if (loadedWords < 1000) {
            throw new IllegalStateException(
                "Sensitive word resources look incomplete, only loaded: " + loadedWords);
        }
    }

    public static SensitiveWordFilter forTesting(String extraWords) {
        return new SensitiveWordFilter(extraWords);
    }

    public boolean contains(String text) {
        return findFirst(text) != null;
    }

    public String findFirst(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }

        String normalized = text.toLowerCase(Locale.ROOT);
        for (int start = 0; start < normalized.length(); start++) {
            if (noise.contains(normalized.charAt(start))) {
                continue;
            }

            Node node = root;
            int matchedEnd = -1;
            for (int index = start; index < normalized.length(); index++) {
                char current = normalized.charAt(index);
                if (noise.contains(current)) {
                    continue;
                }
                node = node.children.get(current);
                if (node == null) {
                    break;
                }
                if (node.terminal) {
                    matchedEnd = index;
                }
            }

            if (matchedEnd >= 0) {
                return normalized.substring(start, matchedEnd + 1);
            }
        }
        return null;
    }

    private void loadNoiseChars() {
        String chars = readString(NOISE_PATH);
        for (char current : chars.toCharArray()) {
            noise.add(current);
        }
    }

    private void loadLexicon() {
        List<String> index = readLines(LEXICON_INDEX);
        if (index.stream().noneMatch(fileName -> !fileName.isBlank())) {
            throw new IllegalStateException("Sensitive lexicon index is empty");
        }
        for (String fileName : index) {
            if (fileName.isBlank()) {
                continue;
            }
            addWords(readLines(LEXICON_DIR + fileName));
        }
    }

    private void addWords(List<String> words) {
        for (String word : words) {
            if (word == null || word.isBlank() || word.startsWith("#")) {
                continue;
            }
            String normalized = normalizeWord(word);
            if (normalized.isEmpty()) {
                continue;
            }
            Node node = root;
            for (int index = 0; index < normalized.length(); index++) {
                node = node.children.computeIfAbsent(normalized.charAt(index), key -> new Node());
            }
            node.terminal = true;
            loadedWords++;
        }
    }

    private String normalizeWord(String word) {
        String lower = word.trim().toLowerCase(Locale.ROOT);
        StringBuilder builder = new StringBuilder(lower.length());
        for (char current : lower.toCharArray()) {
            if (!noise.contains(current)) {
                builder.append(current);
            }
        }
        return builder.toString();
    }

    private List<String> splitWords(String raw) {
        List<String> words = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            return words;
        }
        for (String word : raw.split(",")) {
            if (!word.isBlank()) {
                words.add(word.trim());
            }
        }
        return words;
    }

    private List<String> readLines(String path) {
        String content = readString(path);
        List<String> lines = new ArrayList<>();
        for (String line : content.split("\\R")) {
            lines.add(line);
        }
        return lines;
    }

    private String readString(String path) {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream(path)) {
            if (in == null) {
                throw new IllegalStateException("Missing sensitive word resource: " + path);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read sensitive word resource: " + path, ex);
        }
    }

    private static final class Node {
        private final Map<Character, Node> children = new HashMap<>();
        private boolean terminal;
    }
}
