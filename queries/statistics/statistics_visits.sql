WITH OrderedEvents AS (
    SELECT InnerId, countriesduringday, Date
    FROM bewb_Events
    WHERE countriesduringday GLOB '[+*a-zA-ZÅÄÖåäö.-]*'
    ORDER BY Date ASC
),
SplittedCountries AS (
    SELECT InnerId,
           TRIM(value) AS country,
           Date,
           ROW_NUMBER() OVER (PARTITION BY InnerId ORDER BY Date) AS row_num
    FROM OrderedEvents,
         json_each('["' || REPLACE(countriesduringday, ',', '","') || '"]')
),
ConsecutiveRemoval AS (
    SELECT InnerId, country, Date, row_num,
           CASE
               WHEN row_num = 1 THEN country
               WHEN country != LAG(country) OVER (PARTITION BY InnerId ORDER BY row_num) THEN country
               ELSE NULL
           END AS cleaned_country
    FROM SplittedCountries
),
BorderCrossings AS (
    SELECT b.OuterId, a.InnerId, SUBSTR(a.InnerId, 1, 1) AS TripDomain,
           GROUP_CONCAT(a.cleaned_country, ', ') AS AllBorderCrossings
    FROM ConsecutiveRemoval AS a
    LEFT JOIN bewa_Overview AS b ON a.InnerId = b.InnerId
    WHERE a.cleaned_country IS NOT NULL
    /*AND TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)*/
    GROUP BY a.InnerId
),
SplitCountries AS (
    SELECT
        OuterId,
        InnerId,
        TRIM(value) AS RawCountry
    FROM BorderCrossings, json_each('["' || REPLACE(AllBorderCrossings, ', ', '","') || '"]')
),
Normalized AS (
    SELECT DISTINCT
        OuterId,
        InnerId,
        REPLACE(REPLACE(REPLACE(RawCountry, '*', ''), '**', ''), '+', '') AS Country,
        RawCountry
    FROM SplitCountries
),
CountRaw AS (
    SELECT
        REPLACE(REPLACE(REPLACE(TRIM(value), '*', ''), '**', ''), '+', '') AS Country,
        COUNT(*) AS OLMQ
    FROM BorderCrossings, json_each('["' || REPLACE(AllBorderCrossings, ', ', '","') || '"]')
    WHERE TRIM(value) NOT LIKE '*%'
    AND TRIM(value) NOT LIKE '**%'
    AND TRIM(value) NOT LIKE '+%'
    GROUP BY Country
),
CountPrefixed AS (
    SELECT
        REPLACE(REPLACE(REPLACE(TRIM(value), '*', ''), '**', ''), '+', '') AS Country,
        SUM(CASE WHEN TRIM(value) LIKE '*%' THEN 1 ELSE 0 END) AS SSMQ,
        SUM(CASE WHEN TRIM(value) LIKE '**%' THEN 1 ELSE 0 END) AS VSSMQ,
        SUM(CASE WHEN TRIM(value) LIKE '+%' THEN 1 ELSE 0 END) AS PSMQ
    FROM BorderCrossings, json_each('["' || REPLACE(AllBorderCrossings, ', ', '","') || '"]')
    GROUP BY Country
),
Aggregated AS (
    SELECT
        n.Country,
        COUNT(*) AS OL,
        cr.OLMQ AS OLMQ,
        SUM(CASE WHEN n.RawCountry LIKE '*%' THEN 1 ELSE 0 END) AS SS,
        SUM(CASE WHEN n.RawCountry LIKE '**%' THEN 1 ELSE 0 END) AS VSS,
        SUM(CASE WHEN n.RawCountry LIKE '+%' THEN 1 ELSE 0 END) AS PS,
        cp.SSMQ,
        cp.VSSMQ,
        cp.PSMQ
    FROM Normalized n
    LEFT JOIN CountRaw cr ON n.Country = cr.Country
    LEFT JOIN CountPrefixed cp ON n.Country = cp.Country
    GROUP BY n.Country
)
SELECT
    Country,
    OL,
    SS,
    VSS,
    PS,
    OLMQ,
    SSMQ,
    VSSMQ,
    PSMQ
FROM Aggregated
ORDER BY OL DESC;
