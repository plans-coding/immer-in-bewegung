WITH ContinentCountriesParsed AS (
  WITH RECURSIVE split(line, rest) AS (
    SELECT
      substr(Value || char(10), 1, instr(Value || char(10), char(10)) - 1),
      substr(Value || char(10), instr(Value || char(10), char(10)) + 1)
    FROM bewx_Settings
    WHERE Attribute = 'ContinentCountries'

    UNION ALL

    SELECT
      substr(rest, 1, instr(rest, char(10)) - 1),
      substr(rest, instr(rest, char(10)) + 1)
    FROM split
    WHERE rest <> ''
  )
    SELECT
    json_extract(js, '$[0]') AS Continent,
    json_extract(js, '$[1]') AS Country,
    json_extract(js, '$[2]') AS ISO
    FROM (
    SELECT
        '["' || replace(line, ':', '","') || '"]' AS js
    FROM split
    WHERE line <> ''
    )
),
OrderedEvents AS (
    -- Orders events by date to process country sequences correctly
    SELECT InnerId, countriesduringday, Date
    FROM bewb_Events
    WHERE countriesduringday GLOB '[+*a-zA-ZÅÄÖåäö.-]*'
    ORDER BY Date ASC
),
SplittedCountries AS (
    -- Splits the comma-separated country strings into individual rows
    SELECT InnerId,
           TRIM(value) AS country,
           Date,
           ROW_NUMBER() OVER (PARTITION BY InnerId ORDER BY Date) AS row_num
    FROM OrderedEvents,
         json_each('["' || REPLACE(countriesduringday, ',', '","') || '"]')
),
ConsecutiveRemoval AS (
    -- Removes consecutive duplicate countries to identify unique border crossings
    SELECT InnerId, country, Date, row_num,
           CASE
               WHEN row_num = 1 THEN country
               WHEN country != LAG(country) OVER (PARTITION BY InnerId ORDER BY row_num) THEN country
               ELSE NULL
           END AS cleaned_country
    FROM SplittedCountries
),
BorderCrossings AS (
    -- This is the substituted subquery, generating the list of border crossings
    SELECT b.OuterId, a.InnerId,
           GROUP_CONCAT(a.cleaned_country, ', ') AS AllBorderCrossings
    FROM ConsecutiveRemoval AS a
    LEFT JOIN bewa_Overview AS b ON a.InnerId = b.InnerId
    WHERE a.cleaned_country IS NOT NULL
    GROUP BY a.InnerId
),
normalized AS (
    -- Normalizes the data by cleaning country names and joining with overview details
    SELECT
        a.OuterID,
        a.InnerId,
        TRIM(REPLACE(REPLACE(REPLACE(value, '*', ''), '+', ''), '**', '')) AS Country,
        value AS OriginalCountry,
        b.OverallDestination,
        b.ParticipantGroup,
        b.DepartureDate,
		b.TripDomain
    FROM BorderCrossings AS a,
        json_each('["' || REPLACE(AllBorderCrossings, ', ', '", "') || '"]')
    LEFT JOIN  bewa_Overview AS b
    ON b.InnerId = a.InnerId
    /*WHERE TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)*/
    ORDER BY
        b.DepartureDate ASC
)
-- Final selection and aggregation
SELECT
    c.Continent,
    n.Country,
    GROUP_CONCAT(n.OuterID, ', ') AS OuterIDs,
	GROUP_CONCAT(n.TripDomain, ', ') AS TripDomains,
    GROUP_CONCAT(n.OverallDestination, ' | ') AS OverallDestination,
    GROUP_CONCAT(n.ParticipantGroup, ' | ') AS ParticipantGroup
FROM (
    -- Filters out special country markers before final grouping
    SELECT DISTINCT Country, OuterID, InnerId, TripDomain, OverallDestination, ParticipantGroup
    FROM normalized
    WHERE OriginalCountry NOT LIKE '+%'
    AND OriginalCountry NOT LIKE '**%'
) AS n
LEFT JOIN ContinentCountriesParsed AS c
ON c.Country = n.Country
GROUP BY c.Continent, n.Country
ORDER BY
    -- Ensures 'Europa' is always the first continent listed
    CASE WHEN c.Continent = 'Europa' THEN 0 ELSE 1 END,
    c.Continent ASC,
    n.Country ASC;
