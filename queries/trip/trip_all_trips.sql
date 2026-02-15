SELECT
    TripDomain AS DomainAbbreviation,
    OuterId,
    OverallDestination
FROM
    bewa_Overview
WHERE
    OuterId IS NOT NULL
ORDER BY
    DepartureDate ASC;
