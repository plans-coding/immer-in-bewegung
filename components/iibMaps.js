        function initializeMapTrip() {
            const mapContainer = document.getElementById('map');
            const mapPinDataContainer = document.getElementById('map-pin-data');

            if (mapContainer && mapPinDataContainer) {

            var overviewData = JSON.parse(mapPinDataContainer.getAttribute("data-map-overall-route"));
            var accommodationData = JSON.parse(mapPinDataContainer.getAttribute("data-map-accommodation"));
            var assetsSettings = JSON.parse(mapPinDataContainer.getAttribute("data-settings-assets"));
            var tripDomain = mapPinDataContainer.getAttribute("data-tripDomain");

            //console.log(overviewData);
            //console.log(accommodationData);
            //console.log(assetsSettings);
            //console.log(mapColor);

            const map = L.map('map', {fullscreenControl: true}).setView([39.569176, 2.650108], 10);

            // Base Layer (OpenStreetMap)
            const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            });
            baseLayer.addTo(map);

            //map.addControl(new L.Control.Fullscreen());

            const bounds = L.latLngBounds(); // Create bounds object

            // Define Layer Groups
            const overviewLayer = L.layerGroup();
            const accommodationLayer = L.layerGroup();

            // Store coordinates for polylines
            const overviewCoords = [];
            const accommodationCoords = [];

            // Add Overview Markers & Collect Coordinates
            overviewData.forEach(location => {
                const lat = parseFloat(location.Latitude);
                const lng = parseFloat(location.Longitude);

                const svgIconCar = L.divIcon({
        className: 'custom-icon',
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" class="bi bi-car-front-fill" viewBox="0 0 16 16">  <path class="overviewColor" d="M2.52 3.515A2.5 2.5 0 0 1 4.82 2h6.362c1 0 1.904.596 2.298 1.515l.792 1.848c.075.175.21.319.38.404.5.25.855.715.965 1.262l.335 1.679q.05.242.049.49v.413c0 .814-.39 1.543-1 1.997V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.338c-1.292.048-2.745.088-4 .088s-2.708-.04-4-.088V13.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-1.892c-.61-.454-1-1.183-1-1.997v-.413a2.5 2.5 0 0 1 .049-.49l.335-1.68c.11-.546.465-1.012.964-1.261a.8.8 0 0 0 .381-.404l.792-1.848ZM3 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2m10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2M6 8a1 1 0 0 0 0 2h4a1 1 0 1 0 0-2zM2.906 5.189a.51.51 0 0 0 .497.731c.91-.073 3.35-.17 4.597-.17s3.688.097 4.597.17a.51.51 0 0 0 .497-.731l-.956-1.913A.5.5 0 0 0 11.691 3H4.309a.5.5 0 0 0-.447.276L2.906 5.19Z"/></svg>`,
        });
        /*'img/car.svg', iconSize: [25, 25] }) })*/

                if (!isNaN(lat) && !isNaN(lng)) {
                    L.marker([lat, lng], { icon: svgIconCar })
                        .bindPopup(`<b>${location.MapPin}</b>`)
                        .addTo(overviewLayer);
                    bounds.extend([lat, lng]);
                    overviewCoords.push([lat, lng]);
                }
            });

            // Add Accommodation Markers & Collect Coordinates
            accommodationData.forEach(accommodation => {
                if (accommodation.AccommodationCoordinates) {
                    const coords = accommodation.AccommodationCoordinates.split(',').map(parseFloat);

                    const svgIcon = L.divIcon({
        className: 'custom-icon',
        html: `<svg class="iib-trip-tab" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"	 width="32px" height="32px" viewBox="0 0 460.298 460.297" style="enable-background:new 0 0 460.298 460.297;"	 xml:space="preserve"><g>	<g>		<path class="accommodationColor" d="M230.149,120.939L65.986,256.274c0,0.191-0.048,0.472-0.144,0.855c-0.094,0.38-0.144,0.656-0.144,0.852v137.041			c0,4.948,1.809,9.236,5.426,12.847c3.616,3.613,7.898,5.431,12.847,5.431h109.63V303.664h73.097v109.64h109.629			c4.948,0,9.236-1.814,12.847-5.435c3.617-3.607,5.432-7.898,5.432-12.847V257.981c0-0.76-0.104-1.334-0.288-1.707L230.149,120.939			z"/>		<path class="accommodationColor" d="M457.122,225.438L394.6,173.476V56.989c0-2.663-0.856-4.853-2.574-6.567c-1.704-1.712-3.894-2.568-6.563-2.568h-54.816			c-2.666,0-4.855,0.856-6.57,2.568c-1.711,1.714-2.566,3.905-2.566,6.567v55.673l-69.662-58.245			c-6.084-4.949-13.318-7.423-21.694-7.423c-8.375,0-15.608,2.474-21.698,7.423L3.172,225.438c-1.903,1.52-2.946,3.566-3.14,6.136			c-0.193,2.568,0.472,4.811,1.997,6.713l17.701,21.128c1.525,1.712,3.521,2.759,5.996,3.142c2.285,0.192,4.57-0.476,6.855-1.998			L230.149,95.817l197.57,164.741c1.526,1.328,3.521,1.991,5.996,1.991h0.858c2.471-0.376,4.463-1.43,5.996-3.138l17.703-21.125			c1.522-1.906,2.189-4.145,1.991-6.716C460.068,229.007,459.021,226.961,457.122,225.438z"/>	</g></g></svg>`,
        });

                    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                        L.marker(coords, { icon: svgIcon }) /*L.icon({ iconUrl: 'img/house.svg', iconSize: [25, 25] })*/
                            .bindPopup(`<b>${accommodation.Accommodation}</b><br>${accommodation.Date}<br>${accommodation.AccommodationCoordinates} ${accommodation.AccommodationCoordinatesAccuracy ? `Accuracy: ${accommodation.AccommodationCoordinatesAccuracy}` : ''}`)
                            .addTo(accommodationLayer);
                        bounds.extend(coords);
                        accommodationCoords.push(coords);
                    }
                }
            });

            // Function to add polylines with arrows
            function addPolylineDecorators(layer, coords, tripDomain) {
                if (coords.length > 1) {
                    const polyline = L.polyline(coords, { className: 'polylineMap' }).addTo(layer);

                    const decorator = L.polylineDecorator(polyline, {
                        patterns: [
                            {
                                offset: '50%',
                                symbol: L.Symbol.arrowHead({
                                    pixelSize: 15,
                                    headAngle: 30,
                                    polygon: false,
                                    pathOptions: { className: 'polylineMap'  }
                                })
                            }
                        ]
                    }).addTo(layer);
                }
            }

            // Add polylines with arrows
            addPolylineDecorators(overviewLayer, overviewCoords, tripDomain);
            addPolylineDecorators(accommodationLayer, accommodationCoords, tripDomain);

            const overviewTranslation = mapPinDataContainer.getAttribute("data-translation-overview");
            const accommodationsTranslation = mapPinDataContainer.getAttribute("data-translation-accommodations");

            // Add Layer Control
            L.control.layers(null, {
                [overviewTranslation]: overviewLayer,
                [accommodationsTranslation]: accommodationLayer
            }, {collapsed: false}).addTo(map);

            // Add layers to the map
            overviewLayer.addTo(map);
            accommodationLayer.addTo(map);

            // Fit map to bounds if there are valid markers

            map.fitBounds(bounds);

            } else {
                setTimeout(initializeMapTrip, 100);
            }
        }

        function initializeMapContours() {
            const mapContainer = document.getElementById('map');
            const mapPinDataContainer = document.getElementById('map-pin-data');

            if (mapContainer && mapPinDataContainer) {
                const map = L.map('map', {fullscreenControl: true}).setView([51.505, -0.09], 6);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);

                try {
                    const rawData = mapPinDataContainer.getAttribute('data-map');
                    const jsonData = JSON.parse(rawData);

                    /* --- BIND INDIVIDUAL TRIP POINTS
                    const bounds = L.latLngBounds(); // Create bounds object

                    jsonData.forEach(pin => {
                        const { MergedAccommodationCoordinates } = pin;

                        // Split the string into individual coordinate pairs
                        const coordinates = MergedAccommodationCoordinates.split('|').map(coord => {
                            const [lat, lon] = coord.split(',').map(parseFloat); // Parse latitude and longitude

                            // Validate if both lat and lon are valid numbers
                            if (isNaN(lat) || isNaN(lon)) {
                                console.warn(`Invalid coordinates: ${coord}`);
                                return null; // Skip invalid coordinates
                            }

                            return [lat, lon]; // Return as an array of [lat, lon]
                        }).filter(coord => coord !== null); // Remove invalid coordinates

                        // Create a polyline from the valid array of coordinates
                        if (coordinates.length > 0) {
                            const polyline = L.polyline(coordinates, {
                                color: '#1d655e', // Set the polyline color
                                weight: 3,             // Set the line thickness (optional)
                                opacity: 0.7          // Set the opacity (optional)
                                })
                                .addTo(map)
                                .bindPopup(`<b>${pin.InnerId}</b>`)
                                .on('click', function () {
                                    this.openPopup();
                                });

                            bounds.extend(polyline.getBounds()); // Extend bounds to fit the polyline



                                } else {
                                    console.warn(`Skipping polyline for ${pin.InnerId} due to invalid coordinates.`);
                                }
                            });

                            if (jsonData.length > 0) {
                                map.fitBounds(bounds, { padding: [50, 50] }); // Auto-zoom to fit all the polylines
                            }

                            console.log("Map initialized with auto-zoom");
                            --- BIND INDIVIDUAL TRIP POINTS */

                    // BIND ALL TRIP ACCOMMODATION POINTS TOGEHTER
                    const allCoordinates = [];

                    jsonData.forEach(pin => {
                        const { MergedAccommodationCoordinates } = pin;

                        // Split the string into individual coordinate pairs
                        const coordinates = MergedAccommodationCoordinates.split('|').map(coord => {
                            const [lat, lon] = coord.split(',').map(parseFloat); // Parse latitude and longitude

                            // Validate if both lat and lon are valid numbers
                            if (isNaN(lat) || isNaN(lon)) {
                                console.warn(`Invalid coordinates: ${coord}`);
                                return null; // Skip invalid coordinates
                            }

                            return [lat, lon]; // Return as an array of [lat, lon]
                        }).filter(coord => coord !== null); // Remove invalid coordinates

                        // Append valid coordinates to the global array
                        allCoordinates.push(...coordinates);
                    });

                    // Create a single polyline from all coordinates
                    if (allCoordinates.length > 0) {

                        const polyline = L.polyline(allCoordinates, { className: 'polylineMap' }).addTo(map);

                        map.fitBounds(polyline.getBounds()); // Adjust map to fit the polyline
                    }
                    // BIND ALL TRIP ACCOMMODATION POINTS TOGEHTER


                } catch (error) {
                    console.error("JSON Parse Error:", error);
                }
            } else {
                setTimeout(initializeMapContours, 100);
            }
        }

        function initializeMapCountry() {
            const mapContainer = document.getElementById('map');
            const mapPinDataContainer = document.getElementById('map-pin-data');

            if (mapContainer && mapPinDataContainer) {
                const map = L.map('map', {fullscreenControl: true}).setView([51.505, -0.09], 6);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);

                try {
                    const rawData = mapPinDataContainer.getAttribute('data-map');
                    const jsonData = JSON.parse(rawData);
                    const bounds = L.latLngBounds(); // Create bounds object

                    jsonData.forEach(pin => {
                        const { InnerId, OuterId, OverallDestination, AccommodationCoordinates, AccommodationCoordinatesAccuracy, Accommodation, ParticipantGroup, TravelParticipants, Date, CountriesDuringDay } = pin;

                        // Split coordinates from the 'AccommodationCoordinates' field
                        const [lat, lon] = AccommodationCoordinates.split(',').map(coord => parseFloat(coord.trim()));

                        // Popup content with conditional rendering for accuracy
                        let popupContent = `
                            <b>${Accommodation}</b> <br>
                            ${ParticipantGroup} ${TravelParticipants} <br>
                            ${Date} <br>
                            <a href="?p=trip&id=${OuterId}"><div class="iib-map-ref" data-iib-tripDomain="${InnerId.charAt(0)}">${OuterId} ${OverallDestination}</div></a> <br>
                        `;

                        // Add accuracy only if it's not null
                        if (AccommodationCoordinatesAccuracy) {
                            popupContent += `<b>Coordinate Accuracy:</b> ${AccommodationCoordinatesAccuracy} <br>`;
                        }


                    const svgIcon = L.divIcon({
        className: 'custom-icon',
        html: `<svg class="iib-trip-tab" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"	 width="32px" height="32px" viewBox="0 0 460.298 460.297" style="enable-background:new 0 0 460.298 460.297;"	 xml:space="preserve"><g>	<g>		<path class="accommodationColor" d="M230.149,120.939L65.986,256.274c0,0.191-0.048,0.472-0.144,0.855c-0.094,0.38-0.144,0.656-0.144,0.852v137.041			c0,4.948,1.809,9.236,5.426,12.847c3.616,3.613,7.898,5.431,12.847,5.431h109.63V303.664h73.097v109.64h109.629			c4.948,0,9.236-1.814,12.847-5.435c3.617-3.607,5.432-7.898,5.432-12.847V257.981c0-0.76-0.104-1.334-0.288-1.707L230.149,120.939			z"/>		<path class="accommodationColor" d="M457.122,225.438L394.6,173.476V56.989c0-2.663-0.856-4.853-2.574-6.567c-1.704-1.712-3.894-2.568-6.563-2.568h-54.816			c-2.666,0-4.855,0.856-6.57,2.568c-1.711,1.714-2.566,3.905-2.566,6.567v55.673l-69.662-58.245			c-6.084-4.949-13.318-7.423-21.694-7.423c-8.375,0-15.608,2.474-21.698,7.423L3.172,225.438c-1.903,1.52-2.946,3.566-3.14,6.136			c-0.193,2.568,0.472,4.811,1.997,6.713l17.701,21.128c1.525,1.712,3.521,2.759,5.996,3.142c2.285,0.192,4.57-0.476,6.855-1.998			L230.149,95.817l197.57,164.741c1.526,1.328,3.521,1.991,5.996,1.991h0.858c2.471-0.376,4.463-1.43,5.996-3.138l17.703-21.125			c1.522-1.906,2.189-4.145,1.991-6.716C460.068,229.007,459.021,226.961,457.122,225.438z"/>	</g></g></svg>`,
        });

                        const marker = L.marker([lat, lon], { icon: svgIcon })
                            .addTo(map)
                            .bindPopup(popupContent)
                            .on('click', function () {
                                this.openPopup();
                            });

                        bounds.extend([lat, lon]); // Extend bounds for each marker
                    });

                    if (jsonData.length > 0) {
                        map.fitBounds(bounds, { padding: [50, 50] }); // Auto-zoom to markers
                    }

                    console.log("Map initialized with auto-zoom");


                } catch (error) {
                    console.error("JSON Parse Error:", error);
                }
            } else {
                setTimeout(initializeMapCountry, 100);
            }
        }
