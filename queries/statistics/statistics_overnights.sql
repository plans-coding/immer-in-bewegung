SELECT
	ParticipantGroup,
	SUBSTR(InnerId, 1, 1) AS TripDomain,
    AccommodationCountry,
	COUNT(*) AS Overnights
FROM
    bewb_Events
LEFT JOIN
	bewa_Overview
USING
	(InnerId)
/*WHERE TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)*/
GROUP BY
    AccommodationCountry
ORDER BY
    Overnights DESC;