WITH RECURSIVE split AS (
    SELECT
        TRIM(CountriesDuringDay) AS rest,
        NULL AS country
    FROM bewb_Events
    LEFT JOIN bewa_Overview USING (InnerId)
    WHERE OuterId = OuterId AND InnerId = InnerId

    UNION ALL

    SELECT
        CASE
            WHEN instr(rest, ',') > 0 THEN substr(rest, instr(rest, ',') + 1)
            ELSE ''
        END,
        TRIM(
            CASE
                WHEN instr(rest, ',') > 0 THEN substr(rest, 1, instr(rest, ',') - 1)
                ELSE rest
            END
        )
    FROM split
    WHERE rest <> ''
),

settings_split(line, rest) AS (
  SELECT
    NULL,
    (SELECT Value FROM bewx_Settings WHERE Attribute='ContinentCountries') || char(10)

  UNION ALL

  SELECT
    substr(rest,1,instr(rest,char(10))-1),
    substr(rest,instr(rest,char(10))+1)
  FROM settings_split
  WHERE rest <> ''
),

lookup AS (
  SELECT
    CASE
      WHEN instr(substr(line, instr(line, ':') + 1), ':') > 0 THEN
        substr(line,
               instr(line, ':') + 1,
               instr(substr(line, instr(line, ':') + 1), ':') - 1)
      ELSE
        substr(line, instr(line, ':') + 1)
    END AS Country,

    CASE
      WHEN instr(substr(line, instr(line, ':') + 1), ':') > 0 THEN
        substr(substr(line, instr(line, ':') + 1),
               instr(substr(line, instr(line, ':') + 1), ':') + 1)
    END AS ISO
  FROM settings_split
  WHERE line LIKE '%:%'
)

SELECT DISTINCT
    c.Country,
    --l.ISO,
    CASE
      WHEN l.ISO IS NOT NULL AND length(l.ISO)=2 THEN
        char(
          127462 + unicode(substr(l.ISO,1,1)) - unicode('A'),
          127462 + unicode(substr(l.ISO,2,1)) - unicode('A')
        )
      ELSE
	char(127757)
    END AS Flag
FROM (
    SELECT
        CASE
            WHEN substr(country,1,1)='*' THEN substr(country,2)
            ELSE country
        END AS Country
    FROM split
    WHERE country IS NOT NULL
      AND substr(country,1,2) <> '**'
      AND substr(country,1,1) <> '+'
) c
LEFT JOIN lookup l USING (Country)
ORDER BY c.Country;
