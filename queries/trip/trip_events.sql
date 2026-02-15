/*SELECT
	   o.OuterId,
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
    o.OuterId = o.OuterId AND e.InnerId = e.InnerId
ORDER BY Date ASC;*/

WITH RECURSIVE split(line, rest) AS (
    SELECT
        NULL,
        (SELECT Value FROM bewx_Settings WHERE Attribute = 'ContinentCountries') || char(10)
    UNION ALL
    SELECT
        substr(rest, 1, instr(rest, char(10)) - 1),
        substr(rest, instr(rest, char(10)) + 1)
    FROM split
    WHERE rest <> ''
),
CountryMapping AS (
    SELECT
        -- Continent: before first colon
        substr(line, 1, instr(line, ':') - 1) AS Continent,
        -- Country: between first and second colon
        substr(
            line,
            instr(line, ':') + 1,
            instr(substr(line, instr(line, ':') + 1), ':') - 1
        ) AS Country,
        -- ISO: after second colon
        substr(line, instr(line, ':') + instr(substr(line, instr(line, ':') + 1), ':') + 1) AS ISO
    FROM split
    WHERE line LIKE '%:%:%'
)
SELECT
    o.OuterId,
    e.InnerId,
    o.OverallDestination AS OverallDestination,
    e.Date AS Date,
    e.Events AS Events,
    e.Accommodation AS Accommodation,
    e.AccommodationCountry AS AccommodationCountry,
    CASE
        WHEN cm.ISO IS NOT NULL THEN char(
            127462 + unicode(substr(cm.ISO,1,1)) - unicode('A'),
            127462 + unicode(substr(cm.ISO,2,1)) - unicode('A')
        )
        ELSE
		char(127757)
    END AS AccommodationCountryFlag,
    e.AccommodationCoordinatesAccuracy AS AccommodationCoordinatesAccuracy,
    e.AccommodationCoordinates AS AccommodationCoordinates,
    o.ParticipantGroup AS ParticipantGroup,
    e.TravelParticipants AS TravelParticipants,
    e.AdditionalNotes AS AdditionalNotes,
    e.CountriesDuringDay AS CountriesDuringDay
FROM bewb_Events e
JOIN bewa_Overview o ON e.InnerId = o.InnerId
LEFT JOIN CountryMapping cm
    ON e.AccommodationCountry = cm.Country
WHERE o.OuterId = o.OuterId AND e.InnerId = e.InnerId
ORDER BY e.Date ASC;
