-- =========================================================
-- PASTE JSON HERE
-- =========================================================

CREATE TEMP TABLE _json(doc TEXT);

INSERT INTO _json(doc)
VALUES (
'{/* TRIP JSON HERE */}'
);

-- =========================================================
-- IMPORT: OVERVIEW
-- =========================================================

INSERT INTO bewa_Overview (
    InnerId,
    OuterId,
    TripDomain,
    ArrangerGroup,
    OverallDestination,
    DepartureDate,
    ReturnDate,
    TripDescription,
    TripLabels,
    MapPins,
    StartNode,
    EndNode,
    PhotoStarttime,
    PhotoEndtime,
    PhotoAlbums,
    CoverPhoto,
    DocumentationNote
)
SELECT
    json_extract(doc, '$.InnerId'),
    json_extract(doc, '$.OuterId'),
    json_extract(doc, '$.TripDomain'),
    json_extract(doc, '$.ArrangerGroup'),
    json_extract(doc, '$.OverallDestination'),
    json_extract(doc, '$.DepartureDate'),
    json_extract(doc, '$.ReturnDate'),
    json_extract(doc, '$.TripDescription'),
    json_extract(doc, '$.TripLabels'),
    json_extract(doc, '$.MapPins'),
    json_extract(doc, '$.StartNode'),
    json_extract(doc, '$.EndNode'),
    json_extract(doc, '$.PhotoStarttime'),
    json_extract(doc, '$.PhotoEndtime'),
    json_extract(doc, '$.PhotoAlbums'),
    json_extract(doc, '$.CoverPhoto'),
    json_extract(doc, '$.DocumentationNote')
FROM _json;

-- =========================================================
-- IMPORT: EVENTS
-- =========================================================

INSERT INTO bewb_Events (
    InnerId,
    Date,
    Events,
    Accommodation,
    AccommodationCountry,
    AccommodationCoordinatesAccuracy,
    AccommodationCoordinates,
    TravelParticipants,
    AdditionalNotes,
    CountriesDuringDay
)
SELECT
    json_extract(doc, '$.InnerId'),
    json_extract(d.value, '$.Date'),
    json_extract(d.value, '$.Events'),
    json_extract(d.value, '$.Accommodation'),
    json_extract(d.value, '$.AccommodationCountry'),
    json_extract(d.value, '$.AccommodationCoordinatesAccuracy'),
    json_extract(d.value, '$.AccommodationCoordinates'),
    json_extract(d.value, '$.TravelParticipants'),
    json_extract(d.value, '$.AdditionalNotes'),
    json_extract(d.value, '$.CountriesDuringDay')
FROM _json
CROSS JOIN json_each(json_extract(doc, '$.Days')) AS d;

-- =========================================================
-- CLEANUP
-- =========================================================

DROP TABLE _json;
