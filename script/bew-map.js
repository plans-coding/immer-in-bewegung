// MAP SCRIPT  -----------------------------------------------------------------------

function initiate_map() {
    const map = new maplibregl.Map({
        container: "map",
        style: {
            version: 8,
            sources: {
                "osm-tiles": {
                    type: "raster",
                    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                    tileSize: 256,
                    attribution: "© OpenStreetMap contributors"
                }
            },
            layers: [{
                id: "osm-tiles",
                type: "raster",
                source: "osm-tiles",
                minzoom: 0,
                maxzoom: 19
            }]
        },
        zoom: 8,
        attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    return map
}


function load_trip_map() {

    let map = initiate_map();

    const mapContainer = document.getElementById('map');
    const mapPinDataContainer = document.getElementById('map-pin-data');


    const overviewData = JSON.parse(mapPinDataContainer.getAttribute("data-trip-map-overall"));
    const accommodationData = JSON.parse(mapPinDataContainer.getAttribute("data-trip-map-accommodation"));
    const themeColor = mapPinDataContainer.getAttribute("data-theme-color");
    const tripDomain = mapPinDataContainer.getAttribute("data-tripDomain");

    const overviewTranslation = mapPinDataContainer.getAttribute("data-translation-overview");
    const accommodationsTranslation = mapPinDataContainer.getAttribute("data-translation-accommodations");


    const bounds = new maplibregl.LngLatBounds();

    map.on('load', () => {

        // Prepare marker features
        const overviewFeatures = overviewData.map(loc => {
            const lat = parseFloat(loc.Latitude);
            const lng = parseFloat(loc.Longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            bounds.extend([lng, lat]);

            return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: { title: loc.MapPin, type: 'overview' }
            };
        }).filter(f => f);

        const accommodationFeatures = accommodationData.map(acc => {
            if (!acc.AccommodationCoordinates) return null;
            const coords = acc.AccommodationCoordinates.split(',').map(parseFloat);
            if (coords.length !== 2 || coords.some(isNaN)) return null;

            bounds.extend([coords[1], coords[0]]); // lng, lat

            return {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [coords[1], coords[0]] },
                properties: {
                    title: acc.Accommodation,
                    date: acc.Date,
                    accuracy: acc.AccommodationCoordinatesAccuracy || '',
                    type: 'accommodation'
                }
            };
        }).filter(f => f);

        // Add markers as GeoJSON source
        map.addSource('markers', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: [...overviewFeatures, ...accommodationFeatures]
            }
        });

        map.addLayer({
            id: 'overview-markers',
            type: 'circle',
            source: 'markers',
            filter: ['==', ['get', 'type'], 'overview'],
            paint: {
                'circle-radius': 6,
                'circle-color': '#ffbf00',
                'circle-stroke-color': '#000',
                'circle-stroke-width': 1
            }
        });

        map.addLayer({
            id: 'overview-labels',
            type: 'symbol',
            source: 'markers',
            filter: ['==', ['get', 'type'], 'overview'],
            layout: {
                'text-field': ['get', 'title'],
                'text-size': 12,
                'text-anchor': 'top',
                'text-offset': [0, 0.8],
                'text-allow-overlap': false
            },
            paint: {
                'text-color': '#000',
                'text-halo-color': '#fff',
                'text-halo-width': 1
            }
        });

        if (accommodationFeatures.length > 1) {
            map.addSource('accommodation-line', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: accommodationFeatures.map(f => f.geometry.coordinates)
                    }
                }
            });

            map.addLayer({
                id: 'accommodation-line-layer',
                type: 'line',
                source: 'accommodation-line',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': themeColor, 'line-width': 3 }
            });
        }

        map.addLayer({
            id: 'accommodation-markers',
            type: 'circle',
            source: 'markers',
            filter: ['==', ['get', 'type'], 'accommodation'],
            paint: {
                'circle-radius': 6,
                'circle-color': themeColor,
                'circle-stroke-color': '#000',
                'circle-stroke-width': 1
            }
        });


        const popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true
        });

        map.on('click', 'overview-markers', (e) => {
            const feature = e.features[0];
            const title = feature.properties.title;

            popup
            .setLngLat(feature.geometry.coordinates)
            .setHTML(`<b>${title}</b>`)
            .addTo(map);
        });

        map.on('click', 'accommodation-markers', (e) => {
            const feature = e.features[0];
            const { title, date, accuracy } = feature.properties;

            popup
            .setLngLat(feature.geometry.coordinates)
            .setHTML(`<b>${title}</b><br>${date}<br>${accuracy ? 'Accuracy: ' + accuracy : ''}`)
            .addTo(map);
        });


        if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 50, maxZoom: 12, linear: true });
        }

    });
}


function load_contour_map() {

    let map = initiate_map();

    const mapContainer = document.getElementById('map');
    const mapPinDataContainer = document.getElementById('map-pin-data');

    try {
        const rawData = mapPinDataContainer.getAttribute('data-map');
        const jsonData = JSON.parse(rawData);

        console.log(jsonData);

        // BIND ALL TRIP ACCOMMODATION POINTS TOGETHER
        const allCoordinates = [];

        jsonData.forEach(pin => {
            const { MergedAccommodationCoordinates } = pin;

            const coordinates = MergedAccommodationCoordinates
            .split('|')
            .map(coord => {
                const [lat, lon] = coord.split(',').map(parseFloat);

                if (isNaN(lat) || isNaN(lon)) {
                    console.warn(`Invalid coordinates: ${coord}`);
                    return null;
                }

                return [lon, lat]; // MapLibre requires [lon, lat]
            })
            .filter(Boolean);

            allCoordinates.push(...coordinates);
        });

        if (allCoordinates.length === 0) {
            return;
        }

        map.on('load', () => {
            map.addSource('contour-line', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: allCoordinates
                    }
                }
            });

            map.addLayer({
                id: 'contour-line',
                type: 'line',
                source: 'contour-line',
                paint: {
                    'line-color': '#ffbf00',
                    'line-width': 3
                }
            });

            const bounds = allCoordinates.reduce(
                (b, coord) => b.extend(coord),
                                                    new maplibregl.LngLatBounds(allCoordinates[0], allCoordinates[0])
            );

            map.fitBounds(bounds, { padding: 40, maxZoom: 12, linear: true });
        });

    } catch (error) {
        console.error('JSON Parse Error:', error);
    }
}


function load_country_map() {

    let map = initiate_map();

    const mapContainer = document.getElementById('map');
    const mapPinDataContainer = document.getElementById('map-pin-data');


    try {
        const rawData = mapPinDataContainer.getAttribute('data-map');
        const jsonData = JSON.parse(rawData);

        if (!jsonData.length) return;

        const bounds = new maplibregl.LngLatBounds();

        jsonData.forEach(pin => {
            const { InnerId, OuterId, OverallDestination, AccommodationCoordinates, AccommodationCoordinatesAccuracy, Accommodation, ParticipantGroup, TravelParticipants, Date } = pin;

            // Split coordinates [lat, lon] -> [lng, lat] for MapLibre
            const [lat, lon] = AccommodationCoordinates.split(',').map(coord => parseFloat(coord.trim()));
            const coordinates = [lon, lat];

            // Popup HTML
            let popupContent = `
            <b>${Accommodation}</b> <br>
            ${ParticipantGroup} ${TravelParticipants} <br>
            ${Date} <br>
            <a href="?path=trip:${OuterId}" class="iib-map-ref" data-iib-tripDomain="${InnerId.charAt(0)}">${OuterId} ${OverallDestination}</a> <br>
            `;
            if (AccommodationCoordinatesAccuracy) {
                popupContent += `<b>Coordinate Accuracy:</b> ${AccommodationCoordinatesAccuracy} <br>`;
            }

            // Create a custom SVG marker element
            const el = document.createElement('div');
            el.className = 'custom-icon';
            el.innerHTML = `
            <svg class="iib-trip-tab" width="32" height="32" viewBox="0 0 460.298 460.297">
            <g>
            <g>
            <path class="accommodationColor" d="M230.149,120.939L65.986,256.274c0,0.191-0.048,0.472-0.144,0.855c-0.094,0.38-0.144,0.656-0.144,0.852v137.041
            c0,4.948,1.809,9.236,5.426,12.847c3.616,3.613,7.898,5.431,12.847,5.431h109.63V303.664h73.097v109.64h109.629
            c4.948,0,9.236-1.814,12.847-5.435c3.617-3.607,5.432-7.898,5.432-12.847V257.981c0-0.76-0.104-1.334-0.288-1.707L230.149,120.939
            z"/>
            <path class="accommodationColor" d="M457.122,225.438L394.6,173.476V56.989c0-2.663-0.856-4.853-2.574-6.567c-1.704-1.712-3.894-2.568-6.563-2.568h-54.816
            c-2.666,0-4.855,0.856-6.57,2.568c-1.711,1.714-2.566,3.905-2.566,6.567v55.673l-69.662-58.245
            c-6.084-4.949-13.318-7.423-21.694-7.423c-8.375,0-15.608,2.474-21.698,7.423L3.172,225.438c-1.903,1.52-2.946,3.566-3.14,6.136
            c-0.193,2.568,0.472,4.811,1.997,6.713l17.701,21.128c1.525,1.712,3.521,2.759,5.996,3.142c2.285,0.192,4.57-0.476,6.855-1.998
            L230.149,95.817l197.57,164.741c1.526,1.328,3.521,1.991,5.996,1.991h0.858c2.471-0.376,4.463-1.43,5.996-3.138l17.703-21.125
            c1.522-1.906,2.189-4.145,1.991-6.716C460.068,229.007,459.021,226.961,457.122,225.438z"/>
            </g>
            </g>
            </svg>
            `;

            // Add marker with popup
            new maplibregl.Marker(el)
            .setLngLat(coordinates)
            .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(popupContent))
            .addTo(map);

            bounds.extend(coordinates);
        });

        map.fitBounds(bounds, { padding: 50, maxZoom: 12, linear: true });

        console.log("Map initialized with auto-zoom");
    } catch (error) {
        console.error("JSON Parse Error:", error);
    }
}


function load_theme_map() {


    let map = initiate_map();

    const mapContainer = document.getElementById('map');
    const mapPinDataContainer = document.getElementById('map-pin-data');
    const rawData = mapPinDataContainer.getAttribute('data-map');
    const assetsSettings = mapPinDataContainer.getAttribute("data-settings-assets");


    if (!rawData) return;
    console.log(assetsSettings);
    try {
        const jsonData = JSON.parse(rawData);
        const bounds = new maplibregl.LngLatBounds();
        const allSubThemes = [];

        jsonData.forEach(item => {
            const regex = /\{([^{}]*?)\|([^{}]*?)\|([^{}]*?)\}/g;

            if (typeof item.AdditionalNotes === 'string') {
                let match;
                while ((match = regex.exec(item.AdditionalNotes)) !== null) {
                    const [lat, lon] = match[2]
                    .split(',')
                    .map(v => parseFloat(v.trim()));

                    const themes = Object.fromEntries(
                        assetsSettings
                        .split('\n')
                        .slice(1)
                        .map(l => l.split(':'))
                    );

                    const theme = themes[match[3].trim()];

                    allSubThemes.push({
                        InnerId: item.InnerId,
                        OuterId: item.OuterId,
                        ParticipantGroup: item.ParticipantGroup,
                        TravelParticipants: item.TravelParticipants,
                        Date: item.Date,
                        OverallDestination: item.OverallDestination,
                        ThemePlaceName: match[1].trim(),
                                        ThemeLat: lat,
                                        ThemeLon: lon,
                                        ThemeAbbr: match[3].trim(),
                                        ThemeName: theme?.label ?? ''
                    });
                }
            }
        });

        console.log("allSubThemes", allSubThemes);

        allSubThemes.forEach(item => {
            const { ThemeLat: lat, ThemeLon: lon } = item;

            const popupContent = `
            <a class="link-color"
            href="https://www.google.com/maps/?q=${lat},${lon}"
            target="_blank">
            <b>${item.ThemePlaceName}</b>
            </a><br>
            ${item.ParticipantGroup} ${item.TravelParticipants}<br>
            ${item.Date}<br>
            <a href="?path=trip:${item.OuterId}" class="iib-map-ref" data-iib-tripDomain="${item.InnerId.charAt(0)}">${item.OuterId} ${item.OverallDestination}</a>
            `;

            const el = document.createElement('div');
            el.className = 'custom-icon';
            el.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg"
            width="32" height="32"
            viewBox="0 0 16 16">
            <path class="themePinColor"
            d="M2 15.5V2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.74.439L8 13.069l-5.26 2.87A.5.5 0 0 1 2 15.5M8.16 4.1a.178.178 0 0 0-.32 0l-.634 1.285a.18.18 0 0 1-.134.098l-1.42.206a.178.178 0 0 0-.098.303L6.58 6.993c.042.041.061.1.051.158L6.39 8.565a.178.178 0 0 0 .258.187l1.27-.668a.18.18 0 0 1 .165 0l1.27.668a.178.178 0 0 0 .257-.187L9.368 7.15a.18.18 0 0 1 .05-.158l1.028-1.001a.178.178 0 0 0-.098-.303l-1.42-.206a.18.18 0 0 1-.134-.098z"/>
            </svg>
            `;

            const popup = new maplibregl.Popup({ offset: 25 })
            .setHTML(popupContent);

            new maplibregl.Marker({ element: el })
            .setLngLat([lon, lat])
            .setPopup(popup)
            .addTo(map);

            bounds.extend([lon, lat]);
        });

        if (allSubThemes.length > 0) {
            map.fitBounds(bounds, { padding: 50, maxZoom: 12, linear: true });
        }

        console.log("MapLibre map initialized with auto-zoom");

    } catch (err) {
        console.error("JSON Parse Error:", err);
    }
}
