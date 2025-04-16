function main() {
    const currentDate = new Date();
    const dateFormat = d3.timeFormat("%d-%b-%Y");
    const formattedDate = dateFormat(currentDate);
    d3.select("span.date").text("Date: " + formattedDate);

    const width = 900;
    const height = 600;

    const svg = d3.select("#map-holder")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#f8f4f0");

    const tooltip = d3.select("#tooltip");

    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(1000);

    const path = d3.geoPath().projection(projection);

    const myColor = d3.scaleSequential()
        .interpolator(d3.interpolateInferno)
        .domain([1, 0]);

    const legendWidth = 400;
    const legendHeight = 15;

    const legendSvg = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(50, 0)`);

    const defs = svg.append("defs");

    const gradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%").attr("x2", "100%")
        .attr("y1", "0%").attr("y2", "0%");

    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        gradient.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", myColor(t));
    }

    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .attr("stroke", "#aaa");

    const legendScale = d3.scaleLinear().domain([0, 150]).range([
        0,
        legendWidth,
    ]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5).tickFormat(
        d3.format("~s"),
    );

    legendSvg.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .select(".domain").remove();

    let geoData, outbreakData, texasGeoData, texasCountyData;

    Promise.all([
        d3.json("us-state-boundaries.geojson"),
        d3.csv("outbreak-by-state.csv", (d) => ({
            state: d.state,
            year: +d.year,
            cases: +d.cases,
        })),
        d3.json("tx_counties.geojson"),
        d3.csv("measles-outbreak-by-texas-county.csv", (d) => ({
            county: d.county,
            cases: +d.cases,
        })),
    ]).then(([usGeo, usData, txGeo, txData]) => {
        geoData = usGeo;
        outbreakData = usData;
        texasGeoData = txGeo;
        texasCountyData = txData;

        drawMap(2024);
        updateText(2024);

        d3.selectAll("#year-buttons button").on("click", function () {
            const selectedYear = +d3.select(this).attr("data-year");
            d3.selectAll("#year-buttons button").classed("active", false);
            d3.select(this).classed("active", true);
            drawMap(selectedYear);
            updateText(selectedYear);
        });

        let currentYear = 2024;
        window.addEventListener("wheel", function (event) {
            if (event.deltaY > 0 && currentYear === 2024) {
                currentYear = 2025;
            } else if (event.deltaY < 0 && currentYear === 2025) {
                currentYear = 2024;
            } else return;

            drawMap(currentYear);
            updateText(currentYear);
            d3.selectAll("#year-buttons button").classed("active", false);
            d3.select(`#year-buttons button[data-year='${currentYear}']`)
                .classed("active", true);
        });

        // Scrollama setup
        const scroller = scrollama();

        scroller
            .setup({
                step: ".scroll-step",
                offset: 0.5,
                debug: false,
            })
            .onStepEnter((response) => {
                const mapType = d3.select(response.element).attr("data-map");
                if (mapType === "texas") {
                    drawTexasMap();
                    showTexasScrollText();
                }
            });
    });

    function drawMap(year) {
        d3.select("#texas-scroll-text").style("display", "none");

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
                update.transition().duration(1000)
                    .attr("fill", (d) => {
                        const cases = caseMap.get(d.properties.name);
                        return cases ? myColor(cases / 150) : "#eee";
                    }),
        )
            .on("mouseover", function (event, d) {
                const state = d.properties.name;
                const cases = caseMap.get(state) || 0;
                tooltip.style("opacity", 1)
                    .html(`<strong>${state}</strong><br/>Cases: ${cases}`);
                d3.select(this).attr("fill", "cornflowerblue");
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

    function drawTexasMap() {
        svg.selectAll("path").remove();
        d3.select(".scroll-text-container").style("display", "none");
        d3.select("#texas-scroll-text").style("display", "block");

        const caseMap = new Map(
            texasCountyData.map((d) => [d.county, d.cases]),
        );

        const projection = d3.geoMercator().fitExtent(
            [[50, 50], [width - 50, height - 100]], // padding inside the map
            texasGeoData,
        );

        const path = d3.geoPath().projection(projection);

        svg.selectAll("path")
            .data(texasGeoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", (d) => {
                const county = d.properties.NAME;
                const cases = caseMap.get(county);
                return cases ? myColor(cases / 50) : "#eee";
            })
            .attr("stroke", "#999")
            .on("mouseover", function (event, d) {
                const county = d.properties.NAME;
                const cases = caseMap.get(county) || 0;
                tooltip.style("opacity", 1)
                    .html(
                        `<strong>${county} County</strong><br/>Cases: ${cases}`,
                    );
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);
            });
    }

    function updateText(year) {
        d3.selectAll(".scroll-text").classed("active", false);
        d3.select(`.scroll-text[data-year='${year}']`).classed("active", true);
    }

    function showTexasScrollText() {
        d3.selectAll(".scroll-text").classed("active", false);
        d3.select("#texas-scroll-text").style("display", "block");
        d3.selectAll("#texas-scroll-text .scroll-text").classed(
            "active",
            false,
        );
        d3.select("#texas-scroll-text .scroll-text[data-county-step='1']")
            .classed("active", true);
    }
}
