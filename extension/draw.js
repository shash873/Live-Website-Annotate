// Based on the following bl.ock: http://bl.ocks.org/nitaku/d79632a53187f8e92b15

(function() {
    let enabled = false; // drawing disabled

    var SWATCH_D,
        active_color,
        active_line,
        canvas,
        drag,
        drawing_data,
        lines_layer,
        palette,
        redraw,
        render_line,
        swatches,
        trash_btn,
        ui;

    SWATCH_D = 32;
    render_line = d3
        .line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis);

    drawing_data = {
        lines: []
    };

    active_line = {};
    active_color = {};
    const default_color = "#333333";
    let active_local_color = default_color;

    canvas = d3.select("#annotation-canvas");
    lines_layer = canvas.append("g");
    ui = d3.select("#annotation-ui");
    palette = ui
        .append("g")
        .attr(
            "transform",
            "translate(" +
                (document.documentElement.clientWidth - 136 + SWATCH_D / 2) +
                "," +
                (document.documentElement.clientHeight - 630 + SWATCH_D / 2) +
                ")"
        )
        .style("display", "none")
        .classed("color-palette", true);

    swatches = palette
        .selectAll(".swatch")
        .data([
            "#333333", // black
            "#ffffff", // white
            "#959697", // gray
            "#FF1493", // pink
            "#2772F7", // blue
            "#8527AF", // purple
            "#32cd32", // green
            "#FFFF00", // yellow
            "#FFA500", // orange
            "#FF0000", // red
        ]);
    
    trash_btn = ui.append('text').html('')
        .attr("class", 'btn')
        .attr("id", "trash")
        .on('click', function () {
            drawing_data.lines = [];
            return redraw();
        });

    const swatchEnter = swatches.enter().append("circle");

    swatchEnter
        .attr("class", "swatch")
        .attr("cy", function (d, i) {
            if (i % 2) {
                return ((i - 1) * (SWATCH_D + 8)) / 2;
            } else {
                return (i * (SWATCH_D + 8)) / 2;
            }
        })
        .attr("cx", function(d, i) {
            if (i % 2) {
                return SWATCH_D + 8;
            } else {
                return 0;
            }
        })
        .attr("r", SWATCH_D / 2)
        .attr("fill", d => d)
        .on("click", function(d) {
            active_color[d3.event.collaboratorId] = d;
            if (d3.event.isLocalEvent) {
                active_local_color = d;
                palette.selectAll(".swatch").classed("active", false);
                return d3.select(this).classed("active", true);
            }
        });

    swatchEnter.each(function(d) {
        if (d === active_local_color) {
            return d3.select(this).classed("active", true);
        }
    });

    drag = vc.drag(); // = d3.drag();
    var rafRequest = 0;

    drag.on("start", function() {
        active_line[d3.event.sourceEvent.collaboratorId] = {
            points: [],
            color: active_color[d3.event.sourceEvent.collaboratorId] || default_color
        };
        drawing_data.lines.push(active_line[d3.event.sourceEvent.collaboratorId]);
        redraw();
    });

    drag.on("drag", function() {
        if (active_line[d3.event.sourceEvent.collaboratorId]) {
            active_line[d3.event.sourceEvent.collaboratorId].points.push(vc.mouse(this));
            if (!rafRequest) {
                rafRequest = requestAnimationFrame(redraw.bind(this));
            }
        }
        console.log(document.querySelectorAll(":hover"));
    });

    drag.on("end", function() {
        if (
            active_line[d3.event.sourceEvent.collaboratorId] &&
            active_line[d3.event.sourceEvent.collaboratorId].points.length === 0
        ) {
            drawing_data.lines.pop();
        }
        active_line[d3.event.sourceEvent.collaboratorId] = null;
    });

    canvas.call(drag);

    redraw = function() {
        rafRequest = 0;
        const lines = lines_layer.selectAll(".line").data(drawing_data.lines);
        const enter = lines.enter();

        enter
            .append("path")
            .attr("class", "line")
            .attr("stroke", function(d) {
                return d.color;
            })
            .each(function(d) {
                return (d.elem = d3.select(this));
            });

        lines.attr("d", function(d) {
            return render_line(d.points);
        });
        lines.exit().remove();
    };

    redraw();

    const isLeader = () => {
        let url = window.location.href;
        return !url.includes("?visconnectid=");
    };

    setTimeout(() => {
        b = document.body;

        b.insertAdjacentHTML(
            "beforeend",
            `<div id="palette-background">
            </div>`
        );

        b.insertAdjacentHTML(
            "beforeend",
            `<div id="pointer-events-btn">
                <img id="pointer-events-btn-img" src=${chrome.runtime.getURL("icons/pen.png")} alt="delete"/>
            </div>`
        );
        let pointerEventsImg = document.getElementById("pointer-events-btn-img");
        pointerEventsImg.addEventListener("mouseover", function() {
            if (!enabled) {
                pointerEventsImg.src = `${chrome.runtime.getURL("icons/pen-white.png")}`;
            } else {
                pointerEventsImg.src = `${chrome.runtime.getURL("icons/cursor-white.png")}`;
            }
            pointerEventsImg.style.cursor = "pointer";
        });
        pointerEventsImg.addEventListener("mouseout", function() {
            if (!enabled) {
                pointerEventsImg.src = `${chrome.runtime.getURL("icons/pen.png")}`;
            } else {
                pointerEventsImg.src = `${chrome.runtime.getURL("icons/cursor.png")}`;
            }
            pointerEventsImg.style.cursor = "pointer";
        });
        pointerEventsImg.addEventListener("click", _e => {
            let c = document.getElementById("annotation-canvas");
            if (!enabled) {
                c.style["pointer-events"] = "stroke";
                c.style["background"] = "rgb(255, 0, 0, 0.1)";
                document.body.style["userSelect"] = "none";
                pointerEventsImg.src = `${chrome.runtime.getURL("icons/cursor.png")}`;
            } else {
                c.style["pointer-events"] = "none";
                c.style["background"] = "transparent";
                document.body.style["userSelect"] = "auto";
                pointerEventsImg.src = `${chrome.runtime.getURL("icons/pen.png")}`;
            }
            enabled = !enabled;
        });

        b.insertAdjacentHTML(
            "beforeend",
            `<div id="trash-btn">
                <img id="trash-btn-img" src=${chrome.runtime.getURL("icons/rubbish.png")} alt="delete"/>
            </div>`
        );
        let trashBtnImg = document.getElementById("trash-btn-img");
        trashBtnImg.addEventListener("mouseover", function() {
            trashBtnImg.src = `${chrome.runtime.getURL("icons/rubbish-white.png")}`;
            trashBtnImg.style.cursor = "pointer";
        });
        trashBtnImg.addEventListener("mouseout", function() {
            trashBtnImg.src = `${chrome.runtime.getURL("icons/rubbish.png")}`;
            trashBtnImg.style.cursor = "pointer";
        });
        trashBtnImg.addEventListener("click", _e => {
            d3.select('#trash').dispatch('click');
        });

        const updatePalette = () => {
            let clientWidth = document.documentElement.clientWidth;
            let clientHeight = document.documentElement.clientHeight;

            d3.select("#annotation-ui")
                .selectAll("g")
                .attr(
                    "transform",
                    "translate(" +
                    (document.documentElement.clientWidth - 136 + SWATCH_D / 2) +
                    "," +
                    (document.documentElement.clientHeight - 630 + SWATCH_D / 2) +
                    ")"
                );

            d3.select(".color-palette").style("display", "block");
            d3.select("#desc-container").style("display", "flex");
            d3.select("html").style("cursor", "unset");
        };
        window.onresize = updatePalette;
        updatePalette();
    }, 1000);
}.call(this));
