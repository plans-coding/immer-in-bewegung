SELECT
	TripDomain,
    TripDomain AS DomainAbbreviation,
    SUBSTR(DepartureDate, 1, 4) AS Year,
    COUNT(*) AS AbbreviationCount,
    TripDomain AS DomainDescription,
	ParticipantGroup
FROM
    bewa_Overview
WHERE
    InnerId IS NOT NULL
    AND DepartureDate IS NOT NULL
	/*AND TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)*/
GROUP BY
    DomainAbbreviation, Year
ORDER BY
    Year ASC, AbbreviationCount DESC;
