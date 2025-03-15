// Function to initialize the chart when the canvas is ready

function initializeChart() {
    const canvas = document.getElementById('stat-trip-overview');
    if (canvas) {
        // Get the div containing the chart data
        const chartDataDiv = document.getElementById('stat-trip-overview-chart-data');

        // Extract JSON data for main content and colors from the div's data attributes
        const jsonData = JSON.parse(chartDataDiv.getAttribute('data-json'));
        const colorData = JSON.parse(chartDataDiv.getAttribute('data-json-color'));

        // Ensure jsonData and colorData are valid
        if (Array.isArray(jsonData) && jsonData.length > 0 && Array.isArray(colorData)) {
            // Aggregate the data
            const aggregatedData = aggregateData(jsonData, colorData);
            // Get the canvas context
            const ctx = canvas.getContext('2d');

            // Create the chart using the aggregated data
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: aggregatedData.labels,  // Years
                    datasets: aggregatedData.datasets  // Stacked datasets by DomainAbbreviation
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            stacked: true  // Enable stacking on x-axis
                        },
                        y: {
                            stacked: true,  // Enable stacking on y-axis
                            beginAtZero: true
                        }
                    }
                }
            });
        } else {
            console.error("Invalid or empty jsonData or colorData:", jsonData, colorData);
        }
    } else {
        // If the canvas is not found yet, try again after a short delay
        setTimeout(initializeChart, 100);
    }
}

// Function to aggregate data by Year and DomainAbbreviation
function aggregateData(jsonData, colorData) {
    const dataMap = {};

    // Initialize the dataMap with years and domain abbreviations
    jsonData.forEach(item => {
        const year = item.Year;
        const domainDesc = item.DomainDescription;
        const count = item.AbbreviationCount;

        if (!dataMap[year]) {
            dataMap[year] = {};
        }
        if (!dataMap[year][domainDesc]) {
            dataMap[year][domainDesc] = 0;
        }
        dataMap[year][domainDesc] += count;
    });

    // Prepare labels and datasets for chart
    const years = Object.keys(dataMap);
    const domainAbbrs = new Set(jsonData.map(item => item.DomainDescription));

    // Map the colors to their domain abbreviations
    const domainColors = colorData.reduce((acc, { DomainDescription, Color }) => {
        acc[DomainDescription] = Color;
        return acc;
    }, {});

    const datasets = Array.from(domainAbbrs).map(domain => {
        return {
            label: domain,
            data: years.map(year => dataMap[year][domain] || 0),
            backgroundColor: domainColors[domain] || "#cccccc", // Default color if not found
            borderColor: domainColors[domain] || "#cccccc", // Default color if not found
            borderWidth: 1
        };
    });

    return {
        labels: years,
        datasets: datasets
    };
}

// Function to initialize the second chart (for overnights)
function initializeChartOvernights() {
    const canvasOvernights = document.getElementById('stat-trip-overnights');

    // If the canvas is found, initialize the chart
    if (canvasOvernights) {
        const chartDataOvernights = JSON.parse(document.getElementById("stat-trip-overnights-chart-data").getAttribute('data-json'));
        const ctxOvernights = canvasOvernights.getContext('2d');

        const labels = chartDataOvernights.map(item => item.AccommodationCountry);
        const data = chartDataOvernights.map(item => item.Overnights);

        new Chart(ctxOvernights, {
            type: 'bar',
            data: {
                labels: labels, // Labels for the x-axis
                datasets: [{
                    label: '',
                    data: data, // Data values
                    backgroundColor: 'rgba(111, 117, 126, 0.8)',
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false  // Hide the legend
                    }
            }

        }
        });

    } else {
        // If the canvas is not found yet, retry after a short delay
        setTimeout(initializeChartOvernights, 100);
    }
}
