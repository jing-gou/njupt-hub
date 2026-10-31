package com.njupt.hub.contract;

import java.util.LinkedHashSet;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;

public final class JsonEquivalence {

    private JsonEquivalence() {
    }

    public static void assertEquivalent(JsonNode expected, JsonNode actual, double tolerance) {
        compare("$", expected, actual, tolerance);
    }

    private static void compare(String path, JsonNode expected, JsonNode actual, double tolerance) {
        if (expected == null || actual == null) {
            if (expected != actual) {
                throw new AssertionError(path + " expected " + expected + " but was " + actual);
            }
            return;
        }

        if (expected.isNumber() && actual.isNumber()) {
            double expectedValue = expected.asDouble();
            double actualValue = actual.asDouble();
            if (Math.abs(expectedValue - actualValue) > tolerance) {
                throw new AssertionError(
                    path + " expected " + expectedValue + " but was " + actualValue);
            }
            return;
        }

        if (expected.isObject() && actual.isObject()) {
            Set<String> expectedNames = fieldNames(expected);
            Set<String> actualNames = fieldNames(actual);
            if (!expectedNames.equals(actualNames)) {
                throw new AssertionError(
                    path + " field mismatch expected " + expectedNames + " but was " + actualNames);
            }
            for (String name : expectedNames) {
                compare(path + "/" + name, expected.get(name), actual.get(name), tolerance);
            }
            return;
        }

        if (expected.isArray() && actual.isArray()) {
            if (expected.size() != actual.size()) {
                throw new AssertionError(
                    path + " array size expected " + expected.size() + " but was " + actual.size());
            }
            for (int index = 0; index < expected.size(); index++) {
                compare(path + "/" + index, expected.get(index), actual.get(index), tolerance);
            }
            return;
        }

        if (!expected.equals(actual)) {
            throw new AssertionError(path + " expected " + expected + " but was " + actual);
        }
    }

    private static Set<String> fieldNames(JsonNode node) {
        Set<String> names = new LinkedHashSet<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }
}
