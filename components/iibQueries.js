function getSqlQuery(section, parameter = null) {

    switch (section) {

        // COMMON
        case "common_tripDomains":
            return `SELECT
                    *
                FROM
                    bewx_TripDomains
                WHERE
                    DomainAbbreviation != 'X';`;
        break;

        case "common_participantGroups":
            return `SELECT
                    *
                FROM
                    bewx_ParticipantGroups;`;
        break;

        // OVERVIEW
        case "overview_year":
               return `SELECT
                    *,
                    SUBSTR(InnerId, 1, 1) AS TripDomain,
                    CAST(strftime('%Y', DepartureDate) AS INTEGER) AS TripYear,
                    (
                        CAST(strftime('%Y', DepartureDate) AS INTEGER) / 10
                    )
                    * 10 AS TripDecade
                FROM
                    bewa_Overview
                WHERE
                    InnerId IS NOT NULL
                ORDER BY
                    DepartureDate DESC;`
        break;

        case "overview_country":
            return `WITH normalized AS (
                                SELECT
                                    a.OuterID,
                                    a.InnerId,
                                    TRIM(REPLACE(REPLACE(REPLACE(value, '*', ''), '+', ''), '**', '')) AS Country,
                                    value AS OriginalCountry,
                                    b.OverallDestination,
                                    b.ParticipantGroup
                                FROM IIBc_BorderCrossings AS a,
                                    json_each('["' || REPLACE(AllBorderCrossings, ', ', '", "') || '"]')
                                LEFT JOIN  bewa_Overview AS b
                                ON b.InnerId = a.InnerId
                            )
                    SELECT
                        c.Continent,
                        n.Country,
                        GROUP_CONCAT(n.OuterID, ', ') AS OuterIDs,
                        GROUP_CONCAT(n.InnerId, ', ') AS InnerIDs,
                        GROUP_CONCAT(n.OverallDestination, ' | ') AS OverallDestination,
						GROUP_CONCAT(n.ParticipantGroup, ' | ') AS ParticipantGroup
                    FROM (
                        SELECT DISTINCT Country, OuterID, InnerId, OverallDestination, ParticipantGroup
                        FROM normalized
                        WHERE OriginalCountry NOT LIKE '+%'
                        AND OriginalCountry NOT LIKE '**%'
                    ) AS n
                    LEFT JOIN bewx_ContinentCountries AS c
                    ON c.Country = n.Country
                    GROUP BY c.Continent, n.Country
                    ORDER BY
                        CASE WHEN c.Continent = 'Europa' THEN 0 ELSE 1 END,
                        c.Continent ASC,
                        n.Country ASC;`;
        break;

        // TRIP
        case "trip_summary":
            return `SELECT
                    *,
                    SUBSTR(InnerId, 1, 1) AS DomainAbbreviation
                FROM
                    bewa_Overview
                WHERE
                    OuterId = "${parameter}"
                LIMIT 1;`;
        break;

        case "trip_events":
            return `SELECT
                    *
                FROM
                    IIBb_Events
                WHERE
                    OuterId = "${parameter}"
                ORDER BY
                    Date;`;
        break;

        case "trip_allTrips":
            return `SELECT
                    SUBSTR(InnerId, 1, 1) AS DomainAbbreviation,
                    OuterId,
                    OverallDestination
                FROM
                    bewa_Overview
                WHERE
                    OuterId IS NOT NULL
                ORDER BY
                    DepartureDate ASC;`;
        break;

        case "trip_borderCrossings":
            return `SELECT
                    *
                FROM
                    IIBc_BorderCrossings
                WHERE
                    OuterId = "${parameter}";`;
        break;

        case "trip_mapPins":
            return `WITH RECURSIVE SplitPins AS
                (
                -- Start by selecting the first portion of the string
                SELECT
                    OuterId,
                    SUBSTR(MapPins, INSTR(MapPins, '{') + 2, INSTR(MapPins, '}') - INSTR(MapPins, '{') - 2) AS PinEntry,
                    SUBSTR(MapPins, INSTR(MapPins, '}') + 2) AS Remaining
                FROM
                    bewa_Overview
                WHERE
                    OuterId = "${parameter}"
                UNION ALL
                -- Recursively extract subsequent portions
                SELECT
                    OuterId,
                    SUBSTR(Remaining, INSTR(Remaining, '{') + 2, INSTR(Remaining, '}') - INSTR(Remaining, '{') - 2) AS PinEntry,
                    SUBSTR(Remaining, INSTR(Remaining, '}') + 2)
                FROM
                    SplitPins
                WHERE
                    Remaining LIKE '%{%'
                )
                -- Extract name and coordinates from each pin entry
                SELECT
                "${parameter}" AS OuterId,
                TRIM(SUBSTR(PinEntry, 1, INSTR(PinEntry, '|') - 1)) AS MapPin,
                TRIM(SUBSTR(PinEntry, INSTR(PinEntry, '|') + 2, INSTR(PinEntry, ',') - INSTR(PinEntry, '|') - 2)) AS Latitude,
                TRIM(SUBSTR(PinEntry, INSTR(PinEntry, ',') + 2)) AS Longitude
                FROM
                SplitPins;`;
        break;

        // MAP
        case "map_countryList":
            return `SELECT
                    DISTINCT AccommodationCountry
                FROM
                    IIBb_Events
                WHERE
                    AccommodationCountry NOT LIKE '(%'
                    AND AccommodationCountry NOT LIKE '-%'
                ORDER BY
                    AccommodationCountry;`;
        break;

        case "map_contour":
            return `SELECT
                        InnerId,
                        GROUP_CONCAT(AccommodationCoordinates, '|') AS MergedAccommodationCoordinates
                    FROM
                        bewb_Events
                    WHERE
                        AccommodationCoordinates IS NOT NULL
                    GROUP BY
                        InnerId;`;
        break;

        case "map_country":
            return `SELECT
                        * FROM IIBb_Events
                    WHERE
                        AccommodationCountry = "${parameter}"
                        AND AccommodationCoordinates IS NOT NULL;`;
        break;

        // STATISTICS
        case "statistics_perDomainYear":
            return `SELECT
                        SUBSTR(o.InnerId, 1, 1) AS DomainAbbreviation,
                        SUBSTR(o.DepartureDate, 1, 4) AS Year,
                        COUNT(*) AS AbbreviationCount,
                        d.DomainDescription
                    FROM
                        bewa_Overview o
                    LEFT JOIN
                        bewx_TripDomains d
                    ON
                        SUBSTR(o.InnerId, 1, 1) = d.DomainAbbreviation
                    WHERE
                        o.InnerId IS NOT NULL
                        AND o.DepartureDate IS NOT NULL
                    GROUP BY
                        DomainAbbreviation, Year
                    ORDER BY
                        Year ASC, AbbreviationCount DESC;`
            break;

        case "statistics_tripCount":
            return `SELECT
                    COUNT(InnerId) As Count
                 FROM
                    bewa_Overview;`;
        break;

        case "statistics_overnights":
            return `SELECT
                    AccommodationCountry, COUNT(*) AS Overnights
                FROM
                    bewb_Events
                GROUP BY
                    AccommodationCountry
                ORDER BY
                    Overnights DESC;`;
        break;

        case "statistics_OLSSVSS":
            return `WITH SplitCountries AS (
                    SELECT
                        OuterId,
                        InnerId,
                        TRIM(value) AS RawCountry
                    FROM IIBc_BorderCrossings, json_each('["' || REPLACE(AllBorderCrossings, ', ', '","') || '"]')
                ),
                Normalized AS (
                    SELECT DISTINCT
                        OuterId,
                        InnerId,
                        REPLACE(REPLACE(REPLACE(RawCountry, '*', ''), '**', ''), '+', '') AS Country,
                        RawCountry
                    FROM SplitCountries
                ),
                CountRaw AS (
                    SELECT
                        REPLACE(REPLACE(REPLACE(TRIM(value), '*', ''), '**', ''), '+', '') AS Country,
                        COUNT(*) AS OLMQ
                    FROM IIBc_BorderCrossings, json_each('["' || REPLACE(AllBorderCrossings, ', ', '","') || '"]')
                    WHERE TRIM(value) NOT LIKE '*%'
                    AND TRIM(value) NOT LIKE '**%'
                    AND TRIM(value) NOT LIKE '+%'
                    GROUP BY Country
                ),
                CountPrefixed AS (
                    SELECT
                        REPLACE(REPLACE(REPLACE(TRIM(value), '*', ''), '**', ''), '+', '') AS Country,
                        SUM(CASE WHEN TRIM(value) LIKE '*%' THEN 1 ELSE 0 END) AS SSMQ,
                        SUM(CASE WHEN TRIM(value) LIKE '**%' THEN 1 ELSE 0 END) AS VSSMQ,
                        SUM(CASE WHEN TRIM(value) LIKE '+%' THEN 1 ELSE 0 END) AS PSMQ
                    FROM IIBc_BorderCrossings, json_each('["' || REPLACE(AllBorderCrossings, ', ', '","') || '"]')
                    GROUP BY Country
                ),
                Aggregated AS (
                    SELECT
                        n.Country,
                        COUNT(*) AS OL,
                        cr.OLMQ AS OLMQ,
                        SUM(CASE WHEN n.RawCountry LIKE '*%' THEN 1 ELSE 0 END) AS SS,
                        SUM(CASE WHEN n.RawCountry LIKE '**%' THEN 1 ELSE 0 END) AS VSS,
                        SUM(CASE WHEN n.RawCountry LIKE '+%' THEN 1 ELSE 0 END) AS PS,
                        cp.SSMQ,
                        cp.VSSMQ,
                        cp.PSMQ
                    FROM Normalized n
                    LEFT JOIN CountRaw cr ON n.Country = cr.Country
                    LEFT JOIN CountPrefixed cp ON n.Country = cp.Country
                    GROUP BY n.Country
                )
                SELECT
                    Country,
                    OL,
                    SS,
                    VSS,
                    PS,
                    OLMQ,
                    SSMQ,
                    VSSMQ,
                    PSMQ
                FROM Aggregated
                ORDER BY OL DESC;`;
        break;

        // SEARCH
        case "search_trip":
            return `SELECT
                    'TripQuery' AS Query,
                    *
                FROM
                    bewa_Overview
                RIGHT JOIN IIBc_BorderCrossings USING (InnerId, OuterId)
                WHERE
                (
                    COALESCE(ParticipantGroup, '') || ' ' || COALESCE(OverallDestination, '') || ' ' || COALESCE(DepartureDate, '') || ' ' || COALESCE(ReturnDate, '') || ' ' || COALESCE(MapPins, '') || ' ' || COALESCE(TripDescription, '') || ' ' || COALESCE(AllBorderCrossings, '')
                ) LIKE '%${parameter}%';`;
        break;

        case "search_event":
            return `SELECT
                    'EventQuery' AS Query,
                    *
                FROM
                    IIBb_Events
                WHERE
                (
                    COALESCE(OuterId, '') || ' ' || COALESCE(OverallDestination, '') || ' ' || COALESCE(Date, '') || ' ' || COALESCE(Events, '') || ' ' || COALESCE(Accommodation, '') || ' ' || COALESCE(AccommodationCountry, '') || ' ' || COALESCE(ParticipantGroup, '') || ' ' || COALESCE(TravelParticipants, '') || ' ' || COALESCE(AdditionalNotes, '') || ' ' || COALESCE(CountriesDuringDay, '')
                ) LIKE '%${parameter}%';`;
        break;

        // IMAGES
        case "images_dateList":
            return `SELECT
                    SUBSTR(InnerId, 1, 1) AS DomainAbbreviation,
                    Date
                FROM
                    IIBb_Events
                WHERE
                    OuterId = "${parameter}"
                ORDER BY
                    Date ASC;`;
        break;

        case "images_photoTime":
            return `SELECT
                    PhotoStarttime,
                    PhotoEndtime
                FROM
                    bewa_Overview
                WHERE
                    OuterId = "${parameter}"
                LIMIT 1`;
        break;

                    }
    }
