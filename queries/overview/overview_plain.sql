SELECT
    *,
    CAST(julianday(ReturnDate) - julianday(DepartureDate) AS INTEGER) AS NumberOfDays
FROM
    bewa_Overview
WHERE
    InnerId IS NOT NULL /*AND TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)*/
ORDER BY
    DepartureDate DESC;
