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
        .style("background-color", "#f5f5f5")
        .style("margin-top", 20);

    // Setup projection and path generator
    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(1000);

    const path = d3.geoPath().projection(projection);
    const tooltip = d3.select("#tooltip");
    Promise.all([
        d3.json("us-state-boundaries.geojson"),
        d3.csv("outbreak-by-state.csv", (d) => ({
            state: d.state,
            year: +d.year,
            cases: +d.cases,
        })),
    ]).then(([geoData, data]) => {
        const year = 2025; // or 2024 if switching
        const filtered = data.filter((d) => d.year === year);

        const caseMap = new Map(filtered.map((d) => [d.state, d.cases]));
        svg.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", (d) => {
                const state = d.properties.name;
                const cases = caseMap.get(state);
                return cases ? d3.interpolateYlGnBu(cases / 150) : "#eee";
            })
            .attr("stroke", "#181818")
            .on("mouseover", function (event, d) {
                const state = d.properties.name;
                const cases = caseMap.get(state) || 0;

                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${state}</strong><br/>Cases: ${cases}`);
                d3.select(this).attr("fill", "#ffcc00");
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
                d3.select(this).attr("fill", (d) => {
                    const state = d.properties.name;
                    const cases = caseMap.get(state);
                    return cases ? d3.interpolateYlGnBu(cases / 150) : "#eee";
                });
            });
    });
    S;
}
