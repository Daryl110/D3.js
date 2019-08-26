import * as D3 from 'd3';

export default class E3 {
    static graph(idSvg = '', width, height, data, nodeFunctions = [], backgroundColor = 'white') {
        const svg = D3.select('#' + idSvg);
        svg.attr('height', height);
        svg.attr('width', width);
        svg.style('background-color', backgroundColor);

        const links = data.arches.map(d => Object.create(d));
        const nodes = data.nodes.map(d => Object.create(d));

        const simulation = D3.forceSimulation(nodes)
            .force("link", D3.forceLink(links).id(d => d.id))
            .force("charge", D3.forceManyBody())
            .force("center", D3.forceCenter(width / 2, height / 2));

        const color = () => {
            const scale = D3.scaleOrdinal(D3.schemeCategory10);
            return d => scale(d.group);
        };

        const drag = (simulation) => {

            function dragstart(d) {
                if (!D3.event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(d) {
                d.fx = D3.event.x;
                d.fy = D3.event.y;
            }

            function dragend(d) {
                if (!D3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            return D3.drag()
                .on("start", dragstart)
                .on("drag", dragged)
                .on("end", dragend);
        };

        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => Math.sqrt(d.value));

        const node = svg.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", 5)
            .attr("fill", color(nodes))
            .call(drag(simulation));

        link.append("title")
            .text(d => {
                return 'Value: ' + d.value;
            });

        node.append("title")
            .text(d => {
                if (d.title) {
                    return d.title;
                }
                return d.id;
            });

        nodeFunctions.forEach(funcion => {
            node.on(funcion.accion, funcion.funcion);
        });

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });
    }

    static bubble(idSvg = '', data, width, height, font_family = 'sans-serif', legends = true) {
        let svg = D3.select('#' + idSvg);
        svg.attr('width', width);
        svg.attr('height', height);
        svg.attr('font-size', 10);
        svg.attr('text-anchor', 'middle');
        svg.attr('font-family', font_family);
        width = svg.property('clientWidth');
        height = +svg.attr('height');
        let centerX = width * 0.5;
        let centerY = height * 0.5;
        let strength = 0.05;
        let focusedNode;

        let format = D3.format(',d');

        let scaleColor = D3.scaleOrdinal(D3.schemeCategory10);

        let pack = D3.pack()
            .size([width, height])
            .padding(1.5);

        let forceCollide = D3.forceCollide(d => d.r + 1);

        let simulation = D3.forceSimulation()
            .force('charge', D3.forceManyBody())
            .force('collide', forceCollide)
            .force('x', D3.forceX(centerX).strength(strength))
            .force('y', D3.forceY(centerY).strength(strength));

        if ('matchMedia' in window && window.matchMedia('(max-device-width: 767px)').matches) {
            data = data.filter(el => {
                return el.value >= 50;
            });
        }

        let root = D3.hierarchy({children: data})
            .sum(d => d.value);

        let nodes = pack(root).leaves().map(node => {
            const data = node.data;
            return {
                x: centerX + (node.x - centerX) * 3,
                y: centerY + (node.y - centerY) * 3,
                r: 0,
                radius: node.r,
                id: data.title + '.' + (data.description.title.replace(/\s/g, '-')),
                title: data.title,
                name: data.description,
                value: data.value,
                icon: data.icon
            };
        });
        simulation.nodes(nodes).on('tick', ticked);

        svg.style('background-color', '#eee');
        let node = svg.selectAll('.node')
            .data(nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(D3.drag()
                .on('start', (d) => {
                    if (!D3.event.active) {
                        simulation.alphaTarget(0.2).restart();
                    }
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (d) => {
                    d.fx = D3.event.x;
                    d.fy = D3.event.y;
                })
                .on('end', (d) => {
                    if (!D3.event.active) {
                        simulation.alphaTarget(0);
                    }
                    d.fx = null;
                    d.fy = null;
                }));

        node.append('circle')
            .attr('id', d => d.id)
            .attr('r', 0)
            .style('fill', d => scaleColor(d.title))
            .transition().duration(2000).ease(D3.easeElasticOut)
            .tween('circleIn', (d) => {
                let i = D3.interpolateNumber(0, d.radius);
                return (t) => {
                    d.r = i(t);
                    simulation.force('collide', forceCollide);
                };
            });

        node.append('clipPath')
            .attr('id', d => `clip-${d.id}`)
            .append('use')
            .attr('xlink:href', d => `#${d.id}`);

        node.filter(d => !String(d.icon).includes('img/'))
            .append('text')
            .classed('node-icon', true)
            .attr('clip-path', d => `url(#clip-${d.id})`)
            .selectAll('tspan')
            .data(d => d.icon.split(';'))
            .enter()
            .append('tspan')
            .attr('x', 0)
            .attr('y', (d, i, nodes) => (13 + (i - nodes.length / 2 - 0.5) * 10))
            .text(name => name);

        node.filter(d => String(d.icon).includes('img/'))
            .append('image')
            .classed('node-icon', true)
            .attr('clip-path', d => `url(#clip-${d.id})`)
            .attr('xlink:href', d => d.icon)
            .attr('x', d => -d.radius * 0.7)
            .attr('y', d => -d.radius * 0.7)
            .attr('height', d => d.radius * 2 * 0.7)
            .attr('width', d => d.radius * 2 * 0.7);

        node.append('title')
            .text(d => (d.title + '\nValue: ' + format(d.value)));

        let legendOrdinal = D3.legendColor()
            .scale(scaleColor)
            .shape('circle');

        if (legends) {
            svg.append('g')
                .classed('legend-color', true)
                .attr('text-anchor', 'start')
                .attr('transform', 'translate(20,30)')
                .style('font-size', '12px')
                .call(legendOrdinal);

            let sizeScale = D3.scaleOrdinal()
                .domain(['Menos abonados', 'Mas abonados'])
                .range([5, 10]);

            D3.legendSize()
                .scale(sizeScale)
                .shape('circle')
                .shapePadding(10)
                .labelAlign('end');
        }

        let infoBox = node.append('foreignObject')
            .classed('circle-overlay hidden', true)
            .attr('x', d => -d.radius * 0.7)
            .attr('y', d => -d.radius * 0.7)
            .attr('height', d => d.radius * 2 * 0.7)
            .attr('width', d => d.radius * 2 * 0.7)
            .attr('id', d => d.id + '_')
            .append('xhtml:div')
            .classed('circle-overlay ', true);

        infoBox.append('h2')
            .classed('circle-overlay ', true)
            .text(d => d.name.title);

        infoBox.append('p')
            .classed('circle-overlay ', true)
            .html(d => d.name.details);

        D3.selectAll('.hidden').style("display", "none");

        node.on('click', (currentNode) => {
            ocultarDetalles();
            D3.event.stopPropagation();
            let currentTarget = D3.event.currentTarget;

            if (currentNode === focusedNode) {
                return;
            }

            let lastNode = focusedNode;
            focusedNode = currentNode;

            simulation.alphaTarget(0.2).restart();
            document.getElementById(node._groups[0][currentNode.index].lastChild.id).style.display = 'block';
            D3.selectAll('.node-icon').classed('node-icon--faded', false);

            if (lastNode) {
                lastNode.fx = null;
                lastNode.fy = null;
                node.filter((d, i) => i === lastNode.index)
                    .transition().duration(2000).ease(D3.easePolyOut)
                    .tween('circleOut', () => {
                        let irl = D3.interpolateNumber(lastNode.r, lastNode.radius);
                        return (t) => {
                            lastNode.r = irl(t);
                        };
                    })
                    .on('interrupt', () => {
                        lastNode.r = lastNode.radius;
                    });
            }

            D3.transition().duration(2000).ease(D3.easePolyOut)
                .tween('moveIn', () => {
                    let ix = D3.interpolateNumber(currentNode.x, centerX);
                    let iy = D3.interpolateNumber(currentNode.y, centerY);
                    let ir = D3.interpolateNumber(currentNode.r, centerY * 0.5);
                    return function (t) {
                        currentNode.fx = ix(t);
                        currentNode.fy = iy(t);
                        currentNode.r = ir(t);
                        simulation.force('collide', forceCollide);
                    };
                })
                .on('end', () => {
                    simulation.alphaTarget(0);
                    let $currentGroup = D3.select(currentTarget);
                    $currentGroup.select('.circle-overlay')
                    $currentGroup.select('.node-icon')
                        .classed('node-icon--faded', true);

                })
                .on('interrupt', () => {
                    console.log('move interrupt', currentNode);
                    currentNode.fx = null;
                    currentNode.fy = null;
                    simulation.alphaTarget(0);
                });

        });

        D3.select(document).on('click', () => {
            let target = D3.event.target;
            if (!target.closest('#circle-overlay') && focusedNode) {
                focusedNode.fx = null;
                focusedNode.fy = null;
                simulation.alphaTarget(0.2).restart();
                D3.transition().duration(2000).ease(D3.easePolyOut)
                    .tween('moveOut', function () {
                        console.log('tweenMoveOut', focusedNode);
                        let ir = D3.interpolateNumber(focusedNode.r, focusedNode.radius);
                        return function (t) {
                            focusedNode.r = ir(t);
                            simulation.force('collide', forceCollide);
                        };
                    })
                    .on('end', () => {
                        focusedNode = null;
                        simulation.alphaTarget(0);
                    })
                    .on('interrupt', () => {
                        simulation.alphaTarget(0);
                    });

                hideDetails();
                D3.selectAll('.node-icon').classed('node-icon--faded', false);
            }
        });

        function ticked() {
            node
                .attr('transform', d => `translate(${d.x},${d.y})`)
                .select('circle')
                .attr('r', d => d.r);
        }

        function hideDetails() {
            var foraneos = document.getElementsByClassName('hidden');
            for (var i = 0; i < foraneos.length; i++) {
                foraneos[i].style.display = 'none';
            }
        }


    }
};
