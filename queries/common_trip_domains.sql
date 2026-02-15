WITH RECURSIVE split(str, line, rest) AS (
  SELECT
    Value,
    substr(Value || char(10), 1, instr(Value || char(10), char(10)) - 1),
    substr(Value || char(10), instr(Value || char(10), char(10)) + 1)
  FROM bewx_Settings
  WHERE Attribute = 'TripDomainColors'

  UNION ALL

  SELECT
    str,
    substr(rest, 1, instr(rest, char(10)) - 1),
    substr(rest, instr(rest, char(10)) + 1)
  FROM split
  WHERE rest != ''
)
SELECT
  substr(line, 1, instr(line, ':') - 1) AS DomainDescription,
  substr(line, 1, instr(line, ':') - 1) AS DomainAbbreviation,
  substr(line, instr(line, ':') + 1) AS Color
FROM split
WHERE line != '';
