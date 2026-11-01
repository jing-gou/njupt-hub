walk(
  if type == "object" then del(.requestId) else . end
)
| walk(
  if type == "object" then
    with_entries(
      if (.key | test("(?i)(url|uri|key)$")) and (.value | type == "string") then
        .value |= sub("\\?.*$"; "")
      else .
      end
    )
  else .
  end
)
| walk(
  if type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$") then
    sub("\\.[0-9]+Z$"; "Z")
  else .
  end
)
| walk(
  if type == "array" then
    sort_by(if type == "object" then (.id // .rank // 0) else tostring end)
  else .
  end
)
