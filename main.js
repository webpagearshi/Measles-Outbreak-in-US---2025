function main() {
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 900 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom; // Reduced height

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    d3.csv("weekly measles case.csv").then((data) => {
        data.forEach((d) => {
            d.week_start = new Date(d.week_start);
            d.cases = +d.cases;
        });

        const xTime = d3.scaleTime()
            .domain(d3.extent(data, (d) => d.week_start))
            .range([0, width]);

        const xBand = d3.scaleBand()
            .domain(data.map((d) => d.week_start))
            .range([0, width])
            .padding(0.05);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, (d) => d.cases)]).nice()
            .range([height, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xTime).tickFormat(d3.timeFormat("%b %y")))
            .selectAll("text")
            .attr("transform", "rotate(-30)")
            .style("text-anchor", "end");

        svg.append("g").call(d3.axisLeft(y));

        // Bars
        const bars = svg.selectAll(".bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d) => xBand(d.week_start))
            .attr("y", (d) => y(d.cases))
            .attr("width", xBand.bandwidth())
            .attr("height", (d) => height - y(d.cases))
            .attr("fill", "#69b3a2");

        // Reference line (dashed dark grey)
        const refLine = svg.append("line")
            .attr("stroke", "#555")
            .attr("stroke-width", 1.25)
            .attr("stroke-dasharray", "4 4")
            .attr("y1", 0)
            .attr("y2", height)
            .style("opacity", 0);

        const bisectDate = d3.bisector((d) => d.week_start).left;

        // Overlay for interactivity
        svg.append("rect")
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .attr("width", width)
            .attr("height", height)
            .on("mousemove", function (event) {
                const [mx] = d3.pointer(event);
                const mouseDate = xTime.invert(mx);
                const i = bisectDate(data, mouseDate);
                const d0 = data[i - 1];
                const d1 = data[i];
                const d = !d0
                    ? d1
                    : !d1
                    ? d0
                    : (mouseDate - d0.week_start < d1.week_start - mouseDate
                        ? d0
                        : d1);

                const xPos = xBand(d.week_start) + xBand.bandwidth() / 2;

                refLine
                    .attr("x1", xPos)
                    .attr("x2", xPos)
                    .style("opacity", 1);

                bars.attr("fill", (b) => (b === d ? "#ff7f0e" : "#69b3a2")); // highlight hovered bar

                tooltip
                    .html(
                        `<div style="margin-bottom: 4px;">${
                            d3.timeFormat("%B %d, %Y")(d.week_start)
                        }</div>
                        <div style="border-top: 1px solid #666; margin: 4px 0;"></div>
                        <div>Cases: ${d.cases}</div>`,
                    )
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 50) + "px")
                    .transition()
                    .duration(100)
                    .style("opacity", 1);
            })
            .on("mouseout", () => {
                refLine.style("opacity", 0);
                tooltip.transition().duration(200).style("opacity", 0);
                bars.attr("fill", "#69b3a2"); // reset highlight
            });
    });

    const mapWidth = 800;
    const mapHeight = 600;

    const mapTooltip = d3.select("body").append("div")
        .attr("class", "tooltip-map")
        .style("opacity", 0);

    // Load both files
    Promise.all([
        d3.json("tx_counties.geojson"),
        d3.csv("measles-outbreak-by-texas-county.csv"),
    ]).then(([geojson, cases]) => {
        const caseByCounty = new Map();
        cases.forEach((d) => {
            caseByCounty.set(d.county.trim().toLowerCase(), +d.cases);
        });

        const colorScale = d3.scaleSequential()
            .interpolator(d3.interpolateReds)
            .domain([0, d3.max(cases, (d) => +d.cases)]);

        const projection = d3.geoAlbersUsa()
            .fitSize([mapWidth, mapHeight], geojson);

        const path = d3.geoPath().projection(projection);

        const mapSvg = d3.select("#choropleth-map")
            .append("svg")
            .attr("width", mapWidth)
            .attr("height", mapHeight);

        mapSvg.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", (d) => {
                const name = d.properties.NAME.trim().toLowerCase();
                const cases = caseByCounty.get(name);
                return cases ? colorScale(cases) : "#eee";
            })
            .attr("stroke", "#999")
            .attr("stroke-width", 0.5)
            .on("mouseover", function (event, d) {
                const name = d.properties.NAME;
                const cases = caseByCounty.get(name.trim().toLowerCase()) || 0;

                d3.select(this)
                    .attr("stroke", "#000")
                    .attr("stroke-width", 1.2);

                mapTooltip
                    .html(`<strong>${name} County</strong><br/>Cases: ${cases}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .transition().duration(100)
                    .style("opacity", 1);
            })
            .on("mousemove", function (event) {
                mapTooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .attr("stroke", "#999")
                    .attr("stroke-width", 0.5);

                mapTooltip.transition().duration(200).style("opacity", 0);
            });
    });
}
