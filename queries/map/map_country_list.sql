SELECT
    DISTINCT AccommodationCountry
FROM
    bewb_Events e
JOIN bewa_Overview o ON e.InnerId = o.InnerId
WHERE
    AccommodationCountry NOT LIKE '(%'
    AND AccommodationCountry NOT LIKE '-%'
    AND TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)
ORDER BY
    AccommodationCountry;
