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
    // Load GeoJSON and render map
    d3.json("us-state-boundaries.geojson").then((geoData) => {
        svg.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("id", function (d, i) {
                return "state" + d.properties.name;
            })
            .attr("class", "state")
            .on("mouseover", function (event, d) {
                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${d.properties.name}</strong>`);
                d3.select(this).attr("fill", "#ffcc00");
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
                d3.select(this).attr("fill", "#ccc");
            });
    }).catch((error) => {
        console.error("Error loading GeoJSON:", error);
    });
}
