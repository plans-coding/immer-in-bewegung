// CHART SCRIPT  -----------------------------------------------------------------------

function initializeChart() {
    const canvas = document.getElementById('stat-trip-overview');
    if (canvas) {
        const chartDataDiv = document.getElementById('stat-trip-overview-chart-data');

        const jsonData = JSON.parse(chartDataDiv.getAttribute('data-json'));
        const colorData = JSON.parse(chartDataDiv.getAttribute('data-json-color'));

        const barColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text')
        .trim();

        if (Array.isArray(jsonData) && jsonData.length > 0 && Array.isArray(colorData)) {
            const aggregatedData = aggregateData(jsonData, colorData);
            const ctx = canvas.getContext('2d');

            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: aggregatedData.labels,
                    datasets: aggregatedData.datasets
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            stacked: true,
                            ticks: {
                                color: barColor
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            ticks: {
                                color: barColor
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: barColor
                            }
                        }
                    }
                }
            });
        } else {
            console.error("Invalid or empty jsonData or colorData:", jsonData, colorData);
        }
    } else {
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
                                                    backgroundColor: domainColors[domain] || "#cccccc",
                                                    borderColor: domainColors[domain] || "#cccccc",
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

        const existingChart = Chart.getChart(canvasOvernights);
        if (existingChart) {
            existingChart.destroy();
        }

        const barColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-filter')
        .trim();

        new Chart(ctxOvernights, {
            type: 'bar',
            data: {
                labels: labels, // Labels for the x-axis
                datasets: [{
                    label: '',
                    data: data, // Data values
                    backgroundColor: barColor,
                    color: barColor,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: barColor
                        }
                    },
                    x: {
                        ticks: {
                            color: barColor
                        }
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
