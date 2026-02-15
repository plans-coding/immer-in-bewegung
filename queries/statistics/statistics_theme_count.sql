WITH RECURSIVE ThemeLines(line, rest) AS (
    SELECT
        CASE
            WHEN instr(Value, CHAR(10)) > 0 THEN substr(Value, 1, instr(Value, CHAR(10)) - 1)
            ELSE Value
        END AS line,
        CASE
            WHEN instr(Value, CHAR(10)) > 0 THEN substr(Value, instr(Value, CHAR(10)) + 1)
            ELSE ''
        END AS rest
    FROM bewx_Settings
    WHERE Attribute = 'Theme'

    UNION ALL

    SELECT
        CASE
            WHEN instr(rest, CHAR(10)) > 0 THEN substr(rest, 1, instr(rest, CHAR(10)) - 1)
            ELSE rest
        END AS line,
        CASE
            WHEN instr(rest, CHAR(10)) > 0 THEN substr(rest, instr(rest, CHAR(10)) + 1)
            ELSE ''
        END AS rest
    FROM ThemeLines
    WHERE rest <> ''
),

ThemeMapping AS (
    SELECT
        TRIM(substr(line, 1, instr(line, ':') - 1)) AS key,
        TRIM(substr(line, instr(line, ':') + 1)) AS value
    FROM ThemeLines
    WHERE line LIKE '%:%'
)

SELECT
    tm.key AS ThemeAbbreviation,
    tm.value AS ThemeDescription,
    SUM(
        (LENGTH(e.AdditionalNotes)
         - LENGTH(REPLACE(e.AdditionalNotes, '| ' || tm.key, '')))
        / LENGTH('| ' || tm.key)
    ) AS ThemeCount
FROM bewb_Events AS e
JOIN bewa_Overview o ON e.InnerId = o.InnerId
CROSS JOIN ThemeMapping AS tm
WHERE e.AdditionalNotes LIKE '%| ' || tm.key || '%'
AND TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)
GROUP BY tm.key, tm.value
ORDER BY ThemeCount DESC;
