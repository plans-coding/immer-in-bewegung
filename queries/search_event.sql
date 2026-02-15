SELECT
    TripDomain AS DomainAbbreviation,
    o.OuterId AS OuterId,
    e.InnerId,
    o.OverallDestination AS OverallDestination,
    e.Date AS Date,
    e.Events AS Events,
    e.Accommodation AS Accommodation,
    e.AccommodationCountry AS AccommodationCountry,
    e.AccommodationCoordinatesAccuracy AS AccommodationCoordinatesAccuracy,
    e.AccommodationCoordinates AS AccommodationCoordinates,
    o.ParticipantGroup AS ParticipantGroup,
    e.TravelParticipants AS TravelParticipants,
    e.AdditionalNotes AS AdditionalNotes,
    e.CountriesDuringDay AS CountriesDuringDay
FROM bewb_Events e
JOIN bewa_Overview o ON e.InnerId = o.InnerId
WHERE
(
    COALESCE(o.OuterId, '') || ' ' ||
    COALESCE(o.OverallDestination, '') || ' ' ||
    COALESCE(e.Date, '') || ' ' ||
    COALESCE(e.Events, '') || ' ' ||
    COALESCE(e.Accommodation, '') || ' ' ||
    COALESCE(e.AccommodationCountry, '') || ' ' ||
    COALESCE(o.ParticipantGroup, '') || ' ' ||
    COALESCE(e.TravelParticipants, '') || ' ' ||
    COALESCE(e.AdditionalNotes, '') || ' ' ||
    COALESCE(e.CountriesDuringDay, '')
) LIKE '%/*_STRING_*/%' AND TripDomain IN (TripDomain) AND ParticipantGroup IN (ParticipantGroup);
