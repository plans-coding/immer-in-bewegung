SELECT
    COUNT(InnerId) AS Count,
    TripDomain
FROM
    bewa_Overview
/*WHERE
    TripDomain IN (TripDomain)
    AND ParticipantGroup IN (ParticipantGroup)*/;
