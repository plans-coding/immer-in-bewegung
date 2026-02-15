SELECT
    OuterId,
    *,
    CAST(julianday(ReturnDate) - julianday(DepartureDate) AS INTEGER) AS NumberOfDays,
    TripDomain AS DomainAbbreviation
FROM
    bewa_Overview
WHERE
    OuterId = OuterId
AND
    InnerId = InnerId
LIMIT 1;
