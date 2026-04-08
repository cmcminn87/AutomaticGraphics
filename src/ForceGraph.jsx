import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { TYPE_COLORS, REL_COLORS } from "./constants";

export default function ForceGraph({ data, width, height }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!data || !data.nodes?.length || width < 100 || height < 100) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Defs for glow filters and gradients
    const defs = svg.append("defs");

    // Node glow filter
    const glow = defs.append("filter").attr("id", "node-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    glow.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    // Strong glow for high-weight nodes
    const glowStrong = defs.append("filter").attr("id", "node-glow-strong").attr("x", "-80%").attr("y", "-80%").attr("width", "260%").attr("height", "260%");
    glowStrong.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
    glowStrong.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    // Edge glow
    const edgeGlow = defs.append("filter").attr("id", "edge-glow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    edgeGlow.append("feGaussianBlur").attr("stdDeviation", "2").attr("result", "blur");
    edgeGlow.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    // Radial gradient for background ambiance
    const bgGrad = defs.append("radialGradient").attr("id", "bg-pulse").attr("cx", "50%").attr("cy", "50%").attr("r", "60%");
    bgGrad.append("stop").attr("offset", "0%").attr("stop-color", "#0f2847").attr("stop-opacity", 0.5);
    bgGrad.append("stop").attr("offset", "100%").attr("stop-color", "#050810").attr("stop-opacity", 0);

    const nodes = data.nodes.map((n) => ({ ...n }));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({ ...e }));

    const g = svg.append("g");

    // Background ambient circle
    g.append("circle")
      .attr("cx", width / 2).attr("cy", height / 2)
      .attr("r", Math.max(width, height) * 0.6)
      .attr("fill", "url(#bg-pulse)").attr("opacity", 0.4);

    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])
      .on("zoom", (ev) => g.attr("transform", ev.transform));
    svg.call(zoom);

    const linkG = g.append("g");
    const nodeG = g.append("g");
    const labelG = g.append("g");

    // Curved edges with glow
    const link = linkG.selectAll("path").data(edges).join("path")
      .attr("stroke", (d) => {
        const c = REL_COLORS[d.relationship] || "#ffffff20";
        return c.length === 9 ? c.slice(0, 7) : c;
      })
      .attr("stroke-opacity", (d) => 0.15 + (d.weight || 1) * 0.12)
      .attr("stroke-width", (d) => 0.5 + (d.weight || 1) * 0.7)
      .attr("fill", "none")
      .attr("filter", (d) => d.weight >= 4 ? "url(#edge-glow)" : null);

    // Outer glow ring for nodes
    const glowRing = nodeG.selectAll("circle.glow").data(nodes).join("circle")
      .attr("class", "glow")
      .attr("r", (d) => 6 + (d.weight || 3) * 3)
      .attr("fill", (d) => TYPE_COLORS[d.type] || "#888")
      .attr("opacity", (d) => 0.08 + d.weight * 0.02)
      .attr("filter", "url(#node-glow-strong)");

    const node = nodeG.selectAll("circle.node").data(nodes).join("circle")
      .attr("class", "node")
      .attr("r", (d) => 4 + (d.weight || 3) * 2.5)
      .attr("fill", (d) => TYPE_COLORS[d.type] || "#888")
      .attr("stroke", (d) => {
        const c = TYPE_COLORS[d.type] || "#888";
        return c;
      })
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", (d) => d.weight >= 8 ? 2 : 0.5)
      .attr("filter", (d) => d.weight >= 7 ? "url(#node-glow)" : null)
      .style("cursor", "pointer")
      .on("mouseover", (ev, d) => {
        d3.select(ev.target).transition().duration(200)
          .attr("r", 6 + (d.weight || 3) * 3)
          .attr("stroke-opacity", 0.8)
          .attr("stroke-width", 2);

        // Highlight connected edges
        link.transition().duration(200)
          .attr("stroke-opacity", (e) => {
            const s = typeof e.source === "object" ? e.source.id : e.source;
            const t = typeof e.target === "object" ? e.target.id : e.target;
            return (s === d.id || t === d.id) ? 0.8 : 0.05;
          })
          .attr("stroke-width", (e) => {
            const s = typeof e.source === "object" ? e.source.id : e.source;
            const t = typeof e.target === "object" ? e.target.id : e.target;
            return (s === d.id || t === d.id) ? 2 + (e.weight || 1) : 0.3;
          });

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
      .on("mouseout", (ev, d) => {
        d3.select(ev.target).transition().duration(300)
          .attr("r", 4 + (d.weight || 3) * 2.5)
          .attr("stroke-opacity", 0.3)
          .attr("stroke-width", d.weight >= 8 ? 2 : 0.5);

        link.transition().duration(300)
          .attr("stroke-opacity", (e) => 0.15 + (e.weight || 1) * 0.12)
          .attr("stroke-width", (e) => 0.5 + (e.weight || 1) * 0.7);

        setTooltip(null);
      })
      .on("click", (ev, d) => {
        ev.stopPropagation();
        setSelectedNode((prev) => (prev?.id === d.id ? null : d));
      });

    const label = labelG.selectAll("text")
      .data(nodes.filter((n) => n.weight >= 5))
      .join("text")
      .text((d) => d.label)
      .attr("font-size", (d) => Math.max(9, d.weight * 1.2))
      .attr("fill", "#ffffffdd")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(10 + (d.weight || 3) * 2.8))
      .style("pointer-events", "none")
      .style("font-family", "'Inter', system-ui, sans-serif")
      .style("font-weight", (d) => d.weight >= 8 ? "600" : "400")
      .style("letter-spacing", "0.3px")
      .style("text-shadow", "0 0 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.5)");

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

    // More spread out forces
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d) => d.id)
        .distance((d) => 140 + (5 - (d.weight || 1)) * 20)
        .strength((d) => 0.15 + (d.weight || 1) * 0.05))
      .force("charge", d3.forceManyBody()
        .strength((d) => -300 - d.weight * 40).distanceMax(800))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.03))
      .force("collision", d3.forceCollide().radius((d) => 20 + d.weight * 4).strength(0.8))
      .force("x", d3.forceX(width / 2).strength(0.015))
      .force("y", d3.forceY(height / 2).strength(0.015))
      .on("tick", () => {
        // Curved edges
        link.attr("d", (d) => {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
          return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });
        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        glowRing.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        label.attr("x", (d) => d.x).attr("y", (d) => d.y);
      });

    simRef.current = sim;
    svg.on("click", () => setSelectedNode(null));
    svg.call(zoom.transform, d3.zoomIdentity.translate(width * 0.05, height * 0.05).scale(0.9));
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
          background: "radial-gradient(ellipse at 40% 40%, #0d1b2a 0%, #080e1a 50%, #04060c 100%)",
          borderRadius: 12, display: "block",
          boxShadow: "inset 0 0 120px rgba(0,100,180,0.03), 0 0 40px rgba(0,0,0,0.5)",
        }}
      />
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x + 14, top: tooltip.y - 12,
          background: "linear-gradient(135deg, #1a1a2eee, #0d1b2aee)",
          color: "#e0e0e0", padding: "10px 14px",
          borderRadius: 8, fontSize: 12, pointerEvents: "none", zIndex: 100,
          border: `1px solid ${TYPE_COLORS[tooltip.type] || "#555"}`,
          maxWidth: 280, lineHeight: 1.6,
          boxShadow: `0 4px 24px #00000080, 0 0 15px ${TYPE_COLORS[tooltip.type] || "#555"}20`,
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ fontWeight: 700, color: TYPE_COLORS[tooltip.type] || "#fff", marginBottom: 3, fontSize: 13 }}>
            {tooltip.label}
          </div>
          <div style={{ color: "#999", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2 }}>
            {tooltip.type} · weight {tooltip.weight} · {tooltip.connections} connections
          </div>
          {tooltip.desc && <div style={{ marginTop: 5, color: "#ccc", fontSize: 11.5 }}>{tooltip.desc}</div>}
        </div>
      )}
      {selectedNode && (
        <div style={{
          position: "absolute", top: 16, right: 16,
          background: "linear-gradient(180deg, #0d1b2ef0, #0a1220f0)",
          color: "#e0e0e0", padding: 18, borderRadius: 12, width: 290, fontSize: 12,
          border: `1px solid ${TYPE_COLORS[selectedNode.type]}30`,
          boxShadow: `0 8px 40px #00000070, 0 0 20px ${TYPE_COLORS[selectedNode.type]}10`,
          maxHeight: height - 32, overflowY: "auto",
          backdropFilter: "blur(12px)",
        }}>
          <div style={{
            fontWeight: 700, fontSize: 15, color: TYPE_COLORS[selectedNode.type], marginBottom: 4,
            textShadow: `0 0 12px ${TYPE_COLORS[selectedNode.type]}40`,
          }}>
            {selectedNode.label}
          </div>
          <div style={{ color: "#888", textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2, marginBottom: 10 }}>
            {selectedNode.type} · weight {selectedNode.weight}/10
          </div>
          {(selectedNode.metadata?.description || selectedNode.desc) && (
            <div style={{ marginBottom: 12, color: "#bbb", lineHeight: 1.6 }}>
              {selectedNode.metadata?.description || selectedNode.desc}
            </div>
          )}
          <div style={{
            fontWeight: 600, marginBottom: 8, color: "#999",
            textTransform: "uppercase", fontSize: 10, letterSpacing: 1.2,
            borderTop: "1px solid #ffffff10", paddingTop: 10,
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
              <div key={i} style={{ padding: "5px 0", borderBottom: "1px solid #ffffff08", lineHeight: 1.6 }}>
                <span style={{ color: TYPE_COLORS[other?.type] || "#aaa", fontWeight: 500 }}>
                  {isOut ? "→" : "←"} {other?.label || otherId}
                </span>
                <span style={{
                  color: "#666", marginLeft: 6, fontSize: 10,
                  background: "#ffffff08", padding: "1px 6px", borderRadius: 3,
                }}>{e.relationship}</span>
                {e.context && <div style={{ color: "#777", fontSize: 11, marginTop: 3 }}>{e.context}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
