-- Needed without "Events" column due to regex use in Tera
SELECT
	   o.OuterId,
	   e.InnerId,
       o.OverallDestination AS OverallDestination,
	   e.Date AS Date,
	   e.Accommodation AS Accommodation,
	   e.AccommodationCountry AS AccommodationCountry,
	   e.AccommodationCoordinatesAccuracy AS AccommodationCoordinatesAccuracy,
	   e.AccommodationCoordinates AS AccommodationCoordinates,
       o.ParticipantGroup AS ParticipantGroup,
       e.TravelParticipants AS TravelParticipants
FROM bewb_Events e
JOIN bewa_Overview o ON e.InnerId = o.InnerId
WHERE
    o.OuterId = o.OuterId
    AND
    o.InnerId = o.InnerId
ORDER BY Date ASC;
