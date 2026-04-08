import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { TYPE_COLORS, REL_COLORS } from "./constants";

export default function ForceGraph({ data, width, height }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!data || !data.nodes?.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = data.nodes.map((n) => ({ ...n }));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({ ...e }));

    const g = svg.append("g");
    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])
      .on("zoom", (ev) => g.attr("transform", ev.transform));
    svg.call(zoom);

    const linkG = g.append("g");
    const nodeG = g.append("g");
    const labelG = g.append("g");

    const link = linkG.selectAll("line").data(edges).join("line")
      .attr("stroke", (d) => REL_COLORS[d.relationship] || "#ffffff20")
      .attr("stroke-width", (d) => (d.weight || 1) * 0.8);

    const node = nodeG.selectAll("circle").data(nodes).join("circle")
      .attr("r", (d) => 4 + (d.weight || 3) * 2.2)
      .attr("fill", (d) => TYPE_COLORS[d.type] || "#888")
      .attr("stroke", "#00000060")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", (ev, d) => {
        const conns = edges.filter((e) => {
          const s = typeof e.source === "object" ? e.source.id : e.source;
          const t = typeof e.target === "object" ? e.target.id : e.target;
          return s === d.id || t === d.id;
        });
        setTooltip({
          x: ev.clientX, y: ev.clientY,
          label: d.label, type: d.type, weight: d.weight,
          desc: d.metadata?.description || d.desc || "",
          connections: conns.length,
        });
      })
      .on("mouseout", () => setTooltip(null))
      .on("click", (ev, d) => {
        ev.stopPropagation();
        setSelectedNode((prev) => (prev?.id === d.id ? null : d));
      });

    const label = labelG.selectAll("text")
      .data(nodes.filter((n) => n.weight >= 5))
      .join("text")
      .text((d) => d.label)
      .attr("font-size", (d) => Math.max(8, d.weight * 1.1))
      .attr("fill", "#ffffffcc")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(8 + (d.weight || 3) * 2.2))
      .style("pointer-events", "none")
      .style("font-family", "system-ui, sans-serif")
      .style("text-shadow", "0 0 6px #000, 0 0 3px #000");

    const drag = d3.drag()
      .on("start", (ev, d) => {
        if (!ev.active) simRef.current.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on("end", (ev, d) => {
        if (!ev.active) simRef.current.alphaTarget(0);
        d.fx = null; d.fy = null;
      });
    node.call(drag);

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d) => d.id)
        .distance((d) => 80 - (d.weight || 1) * 8)
        .strength((d) => 0.2 + (d.weight || 1) * 0.08))
      .force("charge", d3.forceManyBody()
        .strength((d) => -120 - d.weight * 15).distanceMax(500))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force("collision", d3.forceCollide().radius((d) => 10 + d.weight * 2.5))
      .force("x", d3.forceX(width / 2).strength(0.02))
      .force("y", d3.forceY(height / 2).strength(0.02))
      .on("tick", () => {
        link
          .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        label.attr("x", (d) => d.x).attr("y", (d) => d.y);
      });

    simRef.current = sim;
    svg.on("click", () => setSelectedNode(null));
    svg.call(zoom.transform, d3.zoomIdentity.translate(width * 0.1, height * 0.1).scale(0.8));
    return () => sim.stop();
  }, [data, width, height]);

  const connectedEdges = selectedNode
    ? data.edges.filter((e) => {
        const s = typeof e.source === "string" ? e.source : e.source?.id;
        const t = typeof e.target === "string" ? e.target : e.target?.id;
        return s === selectedNode.id || t === selectedNode.id;
      })
    : [];

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} width={width} height={height}
        style={{
          background: "radial-gradient(ellipse at center, #0d1b2a 0%, #05080f 70%)",
          borderRadius: 8, display: "block",
        }}
      />
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x + 12, top: tooltip.y - 10,
          background: "#1a1a2e", color: "#e0e0e0", padding: "8px 12px",
          borderRadius: 6, fontSize: 12, pointerEvents: "none", zIndex: 100,
          border: `1px solid ${TYPE_COLORS[tooltip.type] || "#555"}`,
          maxWidth: 260, lineHeight: 1.5, boxShadow: "0 4px 20px #00000080",
        }}>
          <div style={{ fontWeight: 700, color: TYPE_COLORS[tooltip.type] || "#fff", marginBottom: 2 }}>
            {tooltip.label}
          </div>
          <div style={{ color: "#999", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>
            {tooltip.type} · weight {tooltip.weight} · {tooltip.connections} connections
          </div>
          {tooltip.desc && <div style={{ marginTop: 4, color: "#ccc" }}>{tooltip.desc}</div>}
        </div>
      )}
      {selectedNode && (
        <div style={{
          position: "absolute", top: 12, right: 12, background: "#0d1b2eee",
          color: "#e0e0e0", padding: 16, borderRadius: 8, width: 280, fontSize: 12,
          border: `1px solid ${TYPE_COLORS[selectedNode.type]}40`,
          boxShadow: "0 8px 32px #00000060", maxHeight: height - 24, overflowY: "auto",
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: TYPE_COLORS[selectedNode.type], marginBottom: 4 }}>
            {selectedNode.label}
          </div>
          <div style={{ color: "#888", textTransform: "uppercase", fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>
            {selectedNode.type} · weight {selectedNode.weight}/10
          </div>
          {(selectedNode.metadata?.description || selectedNode.desc) && (
            <div style={{ marginBottom: 10, color: "#bbb", lineHeight: 1.5 }}>
              {selectedNode.metadata?.description || selectedNode.desc}
            </div>
          )}
          <div style={{
            fontWeight: 600, marginBottom: 6, color: "#999",
            textTransform: "uppercase", fontSize: 10, letterSpacing: 1,
          }}>
            Connections ({connectedEdges.length})
          </div>
          {connectedEdges.map((e, i) => {
            const s = typeof e.source === "string" ? e.source : e.source?.id;
            const t = typeof e.target === "string" ? e.target : e.target?.id;
            const otherId = s === selectedNode.id ? t : s;
            const other = data.nodes.find((n) => n.id === otherId);
            const isOut = s === selectedNode.id;
            return (
              <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid #ffffff10", lineHeight: 1.5 }}>
                <span style={{ color: TYPE_COLORS[other?.type] || "#aaa" }}>
                  {isOut ? "→" : "←"} {other?.label || otherId}
                </span>
                <span style={{ color: "#666", marginLeft: 6, fontSize: 10 }}>{e.relationship}</span>
                {e.context && <div style={{ color: "#777", fontSize: 11, marginTop: 2 }}>{e.context}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
