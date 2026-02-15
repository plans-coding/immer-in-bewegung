WITH Cities(City) AS (
    VALUES ('Köpenhamn'), ('Stockholm'), ('Paris'), ('Skopje')
),
DistinctCityOccurrences AS (
    SELECT DISTINCT e.InnerId, c.City
    FROM bewb_Events e
    CROSS JOIN Cities c
    WHERE e.Events LIKE '%' || c.City || '%'
)
SELECT
    City,
    COUNT(*) AS Count
FROM DistinctCityOccurrences
GROUP BY City;
