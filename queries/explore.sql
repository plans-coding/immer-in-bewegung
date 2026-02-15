SELECT
    OuterId,
    *,
    CAST(julianday(ReturnDate) - julianday(DepartureDate) AS INTEGER) AS NumberOfDays,
    CAST(strftime('%Y', DepartureDate) AS INTEGER) AS TripYear,
    (CAST(strftime('%Y', DepartureDate) AS INTEGER) / 10) * 10 AS TripDecade
FROM
    bewa_Overview
WHERE
    InnerId IS NOT NULL /*AND TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)*/
ORDER BY
    RANDOM()
LIMIT 3;
