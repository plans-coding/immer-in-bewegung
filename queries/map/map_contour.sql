SELECT
    e.InnerId,
    GROUP_CONCAT(e.AccommodationCoordinates, '|') AS MergedAccommodationCoordinates
FROM
    bewb_Events e
JOIN bewa_Overview o ON e.InnerId = o.InnerId
WHERE
    e.AccommodationCoordinates IS NOT NULL AND TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup)
GROUP BY
    e.InnerId;
