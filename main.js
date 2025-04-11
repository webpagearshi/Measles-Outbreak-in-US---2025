function main() {
    //d3 code goes here

    //add current date to the top right corner of nav bar
    // Get the current date
    const currentDate = new Date();
    // Create a formatter for the desired format (e.g., DD-MM-YYYY)Month is in String format
    const dateFormat = d3.timeFormat("%d-%b-%Y");
    // Format the current date
    const formattedDate = dateFormat(currentDate);
    // Insert the formatted date into an HTML element (span in this case)
    d3.select("span.date").text("Date: " + formattedDate);

    const width = 900;
    const height = 600;

    const svg = d3.select("#map-holder")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#ffffff");
    //style buttons
    d3.selectAll("#year-buttons button").style("border-radius", "8px");
    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(1000);

    const path = d3.geoPath().projection(projection);
    const tooltip = d3.select("#tooltip");

    // Build color scale
    var myColor = d3.scaleSequential()
        .interpolator(d3.interpolateInferno)
        .domain([1, 0]);
    let geoData, outbreakData;

    // Load both datasets once
    Promise.all([
        d3.json("us-state-boundaries.geojson"),
        d3.csv("outbreak-by-state.csv", (d) => ({
            state: d.state,
            year: +d.year,
            cases: +d.cases,
        })),
    ]).then(([geo, data]) => {
        geoData = geo;
        outbreakData = data;
        drawMap(2025); // initial year

        // Attach event listeners to year buttons
        d3.selectAll("#year-buttons button").on("click", function () {
            const selectedYear = +d3.select(this).attr("data-year");
            d3.selectAll("#year-buttons button").classed("active", false);
            d3.select(this).classed("active", true);
            drawMap(selectedYear);
        });
    });

    function drawMap(year) {
        const filtered = outbreakData.filter((d) => d.year === year);
        const caseMap = new Map(filtered.map((d) => [d.state, d.cases]));

        const paths = svg.selectAll("path")
            .data(geoData.features, (d) => d.properties.name);

        paths.join(
            (enter) =>
                enter.append("path")
                    .attr("d", path)
                    .attr("fill", (d) => {
                        const cases = caseMap.get(d.properties.name);
                        return cases ? myColor(cases / 150) : "#eee";
                    })
                    .attr("stroke", "#AAA"),
            (update) =>
                update
                    .transition().duration(1000)
                    .attr("fill", (d) => {
                        const cases = caseMap.get(d.properties.name);
                        return cases ? myColor(cases / 150) : "#eee";
                    }),
        )
            .on("mouseover", function (event, d) {
                const state = d.properties.name;
                const cases = caseMap.get(state) || 0;
                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${state}</strong><br/>Cases: ${cases}`);
                d3.select(this).attr("fill", "#170fff");
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function (event, d) {
                tooltip.style("opacity", 0);
                const cases = caseMap.get(d.properties.name);
                d3.select(this).attr(
                    "fill",
                    cases ? myColor(cases / 150) : "#eee",
                );
            });
    }
}
