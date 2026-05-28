-- =========================================================
-- TABLES
-- =========================================================

CREATE TABLE "bewa_Overview" (
    "InnerId" TEXT PRIMARY KEY,
    "OuterId" TEXT,
    "TripDomain" TEXT,
    "ArrangerGroup" TEXT,
    "OverallDestination" TEXT,
    "DepartureDate" TEXT,
    "ReturnDate" TEXT,
    "TripDescription" TEXT,
    "TripLabels" TEXT
        CHECK (
            "TripLabels" IS NULL
            OR "TripLabels" REGEXP '^[^, ]+(, [^, ]+)*$'
        ),
    "MapPins" TEXT,
    "StartNode" TEXT,
    "EndNode" TEXT,
    "PhotoStarttime" TEXT
        CHECK (
            "PhotoStarttime" IS NULL
            OR "PhotoStarttime" GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
    "PhotoEndtime" TEXT
        CHECK (
            "PhotoEndtime" IS NULL
            OR "PhotoEndtime" GLOB '[0-9][0-9]:[0-9][0-9]'
        ),
    "PhotoAlbums" TEXT,
    "CoverPhoto" TEXT,
    "DocumentationNote" TEXT,
    "OLD_InnerId" TEXT UNIQUE,
    "OtherId" TEXT UNIQUE
);

CREATE TABLE "bewb_Events" (
    "InnerId" TEXT,
    "Date" TEXT,
    "Events" TEXT,
    "Accommodation" TEXT,
    "AccommodationCountry" TEXT,
    "AccommodationCoordinatesAccuracy" TEXT,
    "AccommodationCoordinates" TEXT
        CHECK (
            "AccommodationCoordinates" IS NULL
            OR "AccommodationCoordinates"
               GLOB '[-0-9]*[.][0-9]*, [-0-9]*[.][0-9]*'
        ),
    "TravelParticipants" TEXT,
    "AdditionalNotes" TEXT,
    "CountriesDuringDay" TEXT
        CHECK (
            "CountriesDuringDay" IS NULL
            OR "CountriesDuringDay"
               REGEXP '^(([+]{0,1}|[*]{0,2})[a-zA-ZÅÄÖåäö.-]+(?:, ([+]{0,1}|[*]{0,2})[a-zA-ZÅÄÖåäö.-]+)*)$'
        ),
    "OLD_InnerId" TEXT,

    PRIMARY KEY ("InnerId", "Date"),

    FOREIGN KEY ("InnerId")
        REFERENCES "bewa_Overview"("InnerId")
);



-- =========================================================
-- EXPECTED JSON INPUT
-- =========================================================
--
-- The script expects:
--
-- WITH input(json_data) AS (
--     VALUES ('{ ... full json ... }')
-- )
--
-- =========================================================



-- =========================================================
-- IMPORT OVERVIEW
-- =========================================================

WITH input(json_data) AS (
    VALUES (?1)
),

trip_entries AS (
    SELECT
        j.key   AS InnerId,
        j.value AS trip_json
    FROM input,
         json_each(json_extract(json_data, '$.Trips')) AS j
)

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
    InnerId,
    json_extract(trip_json, '$.OuterId'),
    json_extract(trip_json, '$.TripDomain'),
    json_extract(trip_json, '$.ArrangerGroup'),
    json_extract(trip_json, '$.OverallDestination'),
    json_extract(trip_json, '$.DepartureDate'),
    json_extract(trip_json, '$.ReturnDate'),
    json_extract(trip_json, '$.TripDescription'),
    json_extract(trip_json, '$.TripLabels'),
    json_extract(trip_json, '$.MapPins'),
    json_extract(trip_json, '$.StartNode'),
    json_extract(trip_json, '$.EndNode'),
    json_extract(trip_json, '$.PhotoStarttime'),
    json_extract(trip_json, '$.PhotoEndtime'),
    json_extract(trip_json, '$.PhotoAlbums'),
    json_extract(trip_json, '$.CoverPhoto'),
    json_extract(trip_json, '$.DocumentationNote')
FROM trip_entries;



-- =========================================================
-- IMPORT EVENTS
-- =========================================================

WITH input(json_data) AS (
    VALUES (?1)
),

trip_entries AS (
    SELECT
        j.key   AS InnerId,
        j.value AS trip_json
    FROM input,
         json_each(json_extract(json_data, '$.Trips')) AS j
),

days AS (
    SELECT
        t.InnerId,
        d.value AS day_json
    FROM trip_entries t,
         json_each(json_extract(t.trip_json, '$.Days')) AS d
)

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
    InnerId,
    json_extract(day_json, '$.Date'),
    json_extract(day_json, '$.Events'),
    json_extract(day_json, '$.Accommodation'),
    json_extract(day_json, '$.AccommodationCountry'),
    json_extract(day_json, '$.AccommodationCoordinatesAccuracy'),
    json_extract(day_json, '$.AccommodationCoordinates'),
    json_extract(day_json, '$.TravelParticipants'),
    json_extract(day_json, '$.AdditionalNotes'),
    json_extract(day_json, '$.CountriesDuringDay')
FROM days;
