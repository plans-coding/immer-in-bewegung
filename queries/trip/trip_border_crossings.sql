/*WITH OrderedEvents AS (
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
    SELECT 
        b.OuterId,
        a.InnerId, 
        GROUP_CONCAT(a.cleaned_country, ', ') AS AllBorderCrossings
    FROM ConsecutiveRemoval AS a
    LEFT JOIN bewa_Overview AS b
        ON a.InnerId = b.InnerId
    WHERE a.cleaned_country IS NOT NULL
    GROUP BY a.InnerId
)
SELECT *
FROM BorderCrossings WHERE OuterId = OuterId AND InnerId = InnerId;*/

WITH OrderedEvents AS (
    SELECT InnerId, countriesduringday, Date
    FROM bewb_Events
    WHERE countriesduringday GLOB '[+*a-zA-ZÅÄÖåäö.-]*'
    ORDER BY Date ASC
),

SplittedCountries AS (
    SELECT
        InnerId,
        TRIM(value) AS country,
        Date,
        ROW_NUMBER() OVER (PARTITION BY InnerId ORDER BY Date) AS row_num
    FROM OrderedEvents,
         json_each('["' || REPLACE(countriesduringday, ',', '","') || '"]')
),

ConsecutiveRemoval AS (
    SELECT
        InnerId,
        Date,
        row_num,
        CASE
            WHEN row_num = 1 THEN country
            WHEN country != LAG(country) OVER (PARTITION BY InnerId ORDER BY row_num)
            THEN country
            ELSE NULL
        END AS cleaned_country
    FROM SplittedCountries
),

AllCrossings AS (
    SELECT
        InnerId,
        GROUP_CONCAT(cleaned_country, ', ') AS AllBorderCrossings
    FROM ConsecutiveRemoval
    WHERE cleaned_country IS NOT NULL
    GROUP BY InnerId
),

UniqueList AS (
    SELECT
        InnerId,
        GROUP_CONCAT(norm_country, ', ') AS UniqueCountries
    FROM (
        SELECT
            InnerId,
            norm_country
        FROM (
            SELECT
                InnerId,
                ltrim(cleaned_country, '*+') AS norm_country,
                MIN(row_num) AS first_pos
            FROM ConsecutiveRemoval
            WHERE cleaned_country IS NOT NULL
              AND cleaned_country NOT LIKE '**%'
              AND ltrim(cleaned_country, '*+') NOT IN (
                    SELECT Value
                    FROM bewx_Settings
                    WHERE Attribute = 'HomeCountry'
              )
            GROUP BY InnerId, norm_country
        )
        ORDER BY InnerId, first_pos
    )
    GROUP BY InnerId
),
RouteList AS (
    SELECT
        OuterId,
        GROUP_CONCAT(
            TRIM(
                substr(value, 2, instr(value, ']') - 2)
            ),
            ' > '
        ) AS OverallRoute
    FROM bewa_Overview,
         json_each('["' || replace(MapPins, char(10), '","') || '"]')
    GROUP BY OuterId
)

SELECT
    b.OuterId,
    a.InnerId,
    a.AllBorderCrossings,
    u.UniqueCountries,
    r.OverallRoute
FROM AllCrossings a
LEFT JOIN UniqueList u USING (InnerId)
LEFT JOIN bewa_Overview b USING (InnerId)
LEFT JOIN RouteList r USING (OuterId)
WHERE b.OuterId = b.OuterId AND a.InnerId = a.InnerId;

