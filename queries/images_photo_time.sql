SELECT
    DepartureDate,
	ReturnDate,
	PhotoStarttime,
    PhotoEndtime
FROM
    bewa_Overview
WHERE
    OuterId = '/*_OUTER_ID_*/'
LIMIT 1;
