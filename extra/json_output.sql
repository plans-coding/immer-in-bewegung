WITH grouped_settings AS (
	WITH raw AS (
	  SELECT AttributeGroup, Attribute, Value AS val  -- alias here
	  FROM bewx_Settings
	  WHERE AttributeGroup NOT IN ('Translation') AND Attribute NOT IN ('Dataset')
	),

	arranger_val AS (
	  SELECT json_group_array(e.value) AS val
	  FROM raw, json_each('["' || replace(raw.val, char(10), '","') || '"]') AS e
	  WHERE Attribute = 'ArrangerGroups'
	),
	exclude_val AS (
	  SELECT json_group_array(e.value) AS val
	  FROM raw, json_each('["' || replace(raw.val, char(10), '","') || '"]') AS e
	  WHERE Attribute = 'ExcludeDayPhotos'
	),

	colors_val AS (
	  SELECT json_group_object(
		substr(e.value, 1, instr(e.value, ':') - 1),
		substr(e.value, instr(e.value, ':') + 1)
	  ) AS val
	  FROM raw, json_each('["' || replace(raw.val, char(10), '","') || '"]') AS e
	  WHERE Attribute = 'TripDomainColors'
	),

	cc_lines AS (
	  SELECT
		substr(e.value, 1, instr(e.value, ':') - 1)  AS continent,
		substr(e.value, instr(e.value, ':') + 1)      AS rest
	  FROM raw, json_each('["' || replace(raw.val, char(10), '","') || '"]') AS e
	  WHERE Attribute = 'ContinentCountries'
	),
	cc_grouped AS (
	  SELECT
		continent,
		json_group_object(
		  CASE WHEN instr(rest, ':') > 0
			THEN substr(rest, 1, instr(rest, ':') - 1)
			ELSE rest END,
		  CASE WHEN instr(rest, ':') > 0
			THEN substr(rest, instr(rest, ':') + 1)
			ELSE NULL END
		) AS countries_json
	  FROM cc_lines
	  GROUP BY continent
	),
	cc_val AS (
	  SELECT json_group_object(continent, json(countries_json)) AS val
	  FROM cc_grouped
	),
	ext_raw AS (
	  SELECT
	    Attribute,
	    CASE
	      WHEN instr(raw.val, char(10)) > 0
	        THEN substr(raw.val, 1, instr(raw.val, char(10)) - 1)
	      ELSE raw.val
	    END AS first_line,
	    CASE
	      WHEN instr(raw.val, char(10)) > 0
	        THEN substr(raw.val, instr(raw.val, char(10)) + 1)
	      ELSE ''
	    END AS rest
	  FROM raw
	  WHERE AttributeGroup = 'Extension'
	),
	ext_items AS (
	  SELECT
	    r.Attribute,
	    CASE
	      WHEN r.rest = '' THEN '[]'
	      WHEN r.Attribute IN ('Movie', 'Theme') THEN (
	        SELECT json_group_object(
	          substr(e.value, 1, instr(e.value, ':') - 1),
	          substr(e.value, instr(e.value, ':') + 1)
	        )
	        FROM json_each('["' || replace(r.rest, char(10), '","') || '"]') AS e
	      )
	      ELSE (
	        SELECT json_group_array(e.value)
	        FROM json_each('["' || replace(r.rest, char(10), '","') || '"]') AS e
	      )
	    END AS items_val
	  FROM ext_raw r
	),
	ext_val AS (
	  SELECT json_group_object(
	    r.Attribute,
	    json_patch(
	      json_object(
	        'Enabled',
	          json(CASE
	            WHEN substr(r.first_line, 1, instr(r.first_line, ',') - 1) = 'Enabled'
	            THEN 'true' ELSE 'false'
	          END),
	
	        'Translation',
	          substr(
	            substr(r.first_line, instr(r.first_line, ',') + 1),
	            1,
	            instr(substr(r.first_line, instr(r.first_line, ',') + 1), ',') - 1
	          ),
	
	        'Path',
	          substr(
	            substr(r.first_line, instr(r.first_line, ',') + 1),
	            instr(substr(r.first_line, instr(r.first_line, ',') + 1), ',') + 1
	          )
	      ),
	
	      CASE
	        WHEN r.Attribute = 'SnapshotUpload'
	             OR r.rest = ''
	        THEN json('{}')
	        ELSE json_object('Items', json(i.items_val))
	      END
	    )
	  ) AS val
	  FROM ext_raw r
	  JOIN ext_items i ON r.Attribute = i.Attribute
	),
	other_base AS (
	  SELECT json_group_object(Attribute, raw.val) AS val
	  FROM raw
	  WHERE AttributeGroup = 'Other' AND Attribute != 'ExcludeDayPhotos'
	),
	other_val AS (
	  SELECT json_patch(
		(SELECT val FROM other_base),
		json_object('ExcludeDayPhotos', json((SELECT val FROM exclude_val)))
	  ) AS val
	),

	base_val AS (
	  SELECT json_group_object(Attribute, raw.val) AS val
	  FROM raw WHERE AttributeGroup = 'Base'
	),
	photos_val AS (
	  SELECT json_group_object(Attribute, raw.val) AS val
	  FROM raw WHERE AttributeGroup = 'Photos'
	)

	SELECT json_object(
	  'Base',       json((SELECT val FROM base_val)),
	  'Definition', json_object(
					  'ArrangerGroups',     json((SELECT val FROM arranger_val)),
					  'ContinentCountries', json((SELECT val FROM cc_val)),
					  'TripDomainColors',   json((SELECT val FROM colors_val))
					),
	  'Extension',  json((SELECT val FROM ext_val)),
	  'Other',      json((SELECT val FROM other_val)),
	  'Photos',     json((SELECT val FROM photos_val))
	) AS settings_json
),

trips AS (
  SELECT json_group_object(
    o.InnerId,
    json_object(
             'OuterId', o.OuterId,
             'TripDomain', o.TripDomain,
             'ArrangerGroup', o.ArrangerGroup,
             'OverallDestination', o.OverallDestination,
             'DepartureDate', o.DepartureDate,
             'ReturnDate', o.ReturnDate,
             'TripDescription', o.TripDescription,
             'TripLabels', o.TripLabels,
             'MapPins', o.MapPins,
             'StartNode', o.StartNode,
             'EndNode', o.EndNode,
             'PhotoStarttime', o.PhotoStarttime,
             'PhotoEndtime', o.PhotoEndtime,
             'PhotoAlbums', o.PhotoAlbums,
             'CoverPhoto', o.CoverPhoto,
             'DocumentationNote', o.DocumentationNote,

             'Days',
             (
               SELECT json_group_array(
                        json_object(
                          'Date', e.Date,
                          'Events', e.Events,
                          'Accommodation', e.Accommodation,
                          'AccommodationCountry', e.AccommodationCountry,
                          'AccommodationCoordinatesAccuracy', e.AccommodationCoordinatesAccuracy,
                          'AccommodationCoordinates', e.AccommodationCoordinates,
                          'TravelParticipants', e.TravelParticipants,
                          'AdditionalNotes', e.AdditionalNotes,
                          'CountriesDuringDay', e.CountriesDuringDay
                        )
                      )
               FROM bewb_Events e
               WHERE e.InnerId = o.InnerId
             )
           )
         ) AS trips_json
  FROM bewa_Overview o WHERE o.InnerId NOT LIKE '%!subset%'
)

SELECT json_object(
  'Settings', json(settings_json),
  'Trips', json(trips_json)
) AS result
FROM grouped_settings, trips;
