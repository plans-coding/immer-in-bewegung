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
)
SELECT b.OuterId, a.InnerId,
       GROUP_CONCAT(a.cleaned_country, ', ') AS AllBorderCrossings
FROM ConsecutiveRemoval AS a
LEFT JOIN bewa_Overview AS b ON a.InnerId = b.InnerId
WHERE a.cleaned_country IS NOT NULL
GROUP BY a.InnerId;
