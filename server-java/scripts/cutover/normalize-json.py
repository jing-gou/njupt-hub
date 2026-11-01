#!/usr/bin/env python3
import json
import os
import re
import sys

IGNORE_EMAIL_TRACKING = os.environ.get("IGNORE_EMAIL_TRACKING") == "1"


def normalize(value, key=None):
    if isinstance(value, dict):
        ignored = {"requestId"}
        if IGNORE_EMAIL_TRACKING:
            ignored.update({"thankYouEmailSentAt", "reviewResultEmailSentAt", "reviewResultEmailStatus"})
        return {k: normalize(v, k) for k, v in value.items() if k not in ignored}
    if isinstance(value, list):
        items = [normalize(v) for v in value]
        if all(isinstance(v, dict) and ("id" in v or "rank" in v) for v in items):
            items.sort(key=lambda v: v.get("id", v.get("rank", 0)))
        return items
    if isinstance(value, str):
        if key and re.search(r"(url|uri|key)$", key, re.IGNORECASE):
            value = re.sub(r"\?.*$", "", value)
        value = re.sub(
            r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$",
            r"\1Z",
            value,
        )
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)
print(json.dumps(normalize(payload), ensure_ascii=False, sort_keys=True, separators=(",", ":")))
