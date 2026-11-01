walk(
  if type == "object" then del(.requestId) else . end
)
| walk(
  if type == "string" then sub("\\?.*$"; "") else . end
)
| walk(
  if type == "array" then
    sort_by(if type == "object" then (.id // .rank // 0) else tostring end)
  else .
  end
)
