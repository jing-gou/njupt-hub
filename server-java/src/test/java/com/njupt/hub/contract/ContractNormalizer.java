package com.njupt.hub.contract;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;

public final class ContractNormalizer {

    public static final String MASK = "<masked>";

    private ContractNormalizer() {
    }

    /**
     * Replaces volatile fields with a fixed marker. Paths use dot-free JSON
     * pointer-like segments, e.g. {@code /items/* /id} (without the space).
     * {@code *} matches every object value or array element at that level.
     */
    public static JsonNode mask(JsonNode node, List<String> paths) {
        JsonNode copy = node.deepCopy();
        if (paths == null) {
            return copy;
        }
        for (String path : paths) {
            if (path == null || path.isBlank()) {
                continue;
            }
            String cleaned = path.replaceAll("^/+", "");
            apply(copy, cleaned.split("/"), 0);
        }
        return copy;
    }

    private static void apply(JsonNode node, String[] segments, int index) {
        if (node == null || index >= segments.length) {
            return;
        }

        String segment = segments[index];
        if ("*".equals(segment)) {
            if (node.isArray()) {
                for (JsonNode child : node) {
                    apply(child, segments, index + 1);
                }
            } else if (node.isObject()) {
                node.fields().forEachRemaining(entry -> apply(entry.getValue(), segments, index + 1));
            }
            return;
        }

        if (node.isObject()) {
            ObjectNode object = (ObjectNode) node;
            JsonNode child = object.get(segment);
            if (child == null) {
                return;
            }
            if (index == segments.length - 1) {
                object.put(segment, MASK);
            } else {
                apply(child, segments, index + 1);
            }
            return;
        }

        if (node.isArray()) {
            int childIndex;
            try {
                childIndex = Integer.parseInt(segment);
            } catch (NumberFormatException ex) {
                return;
            }
            if (childIndex < 0 || childIndex >= node.size()) {
                return;
            }
            if (index == segments.length - 1) {
                ((ArrayNode) node).set(childIndex, TextNode.valueOf(MASK));
            } else {
                apply(node.get(childIndex), segments, index + 1);
            }
        }
    }
}
