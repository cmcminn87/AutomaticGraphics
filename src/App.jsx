import { useState, useEffect, useCallback } from "react";
import ForceGraph from "./ForceGraph";
import { TYPE_COLORS } from "./constants";
import { sanitizeAndParse, loadFromUrl, generateShareLink, mergeGraphs } from "./utils";

function Legend() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", padding: "8px 0" }}>
      {Object.entries(TYPE_COLORS).map(([t, c]) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#aaa" }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: c, flexShrink: 0,
            boxShadow: `0 0 6px ${c}60`,
          }} />
          <span style={{ textTransform: "capitalize", letterSpacing: 0.3 }}>{t.replace("_", " ")}</span>
        </div>
      ))}
    </div>
  );
}

function StatsBar({ data }) {
  if (!data?.nodes?.length) return null;
  const typeCounts = {};
  data.nodes.forEach((n) => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const avg = (data.nodes.reduce((s, n) => s + (n.weight || 0), 0) / data.nodes.length).toFixed(1);
  const strong = data.edges.filter((e) => e.weight >= 4).length;

  const Stat = ({ value, label, color }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
      <span style={{
        color, fontWeight: 700, fontSize: 20, fontFamily: "'Inter', system-ui",
        textShadow: `0 0 12px ${color}30`,
      }}>{value}</span>
      <span style={{ fontSize: 11, color: "#666", letterSpacing: 0.5 }}>{label}</span>
    </div>
  );

  return (
    <div style={{
      display: "flex", gap: 28, padding: "12px 24px",
      borderBottom: "1px solid #ffffff08",
      background: "linear-gradient(90deg, #ffffff03, transparent)",
    }}>
      <Stat value={data.nodes.length} label="nodes" color="#00d4ff" />
      <Stat value={data.edges.length} label="edges" color="#ff7043" />
      <Stat value={strong} label="strong links" color="#ffd54f" />
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontSize: 11, color: "#666" }}>avg weight</span>
        <span style={{ color: "#66bb6a", fontWeight: 600 }}>{avg}</span>
      </div>
      {topType && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontSize: 11, color: "#666" }}>most common:</span>
          <span style={{ color: TYPE_COLORS[topType[0]], fontWeight: 600 }}>
            {topType[0]} ({topType[1]})
          </span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("graph");
  const [graphData, setGraphData] = useState(null);
  const [jsonInput, setJsonInput] = useState("");
  const [mergeInputs, setMergeInputs] = useState("");
  const [error, setError] = useState(null);
  const [loadSource, setLoadSource] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dims, setDims] = useState({ w: window.innerWidth - 40, h: window.innerHeight - 200 });

  useEffect(() => {
    const handleResize = () => {
      setDims({ w: window.innerWidth - 40, h: window.innerHeight - 200 });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const urlData = loadFromUrl();
    if (urlData?.nodes?.length) {
      setGraphData(urlData);
      setLoadSource("url");
      setTab("graph");
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const urlData = loadFromUrl();
      if (urlData?.nodes?.length) {
        setGraphData(urlData);
        setLoadSource("url");
        setTab("graph");
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const loadJson = useCallback(() => {
    try {
      setError(null);
      const parsed = sanitizeAndParse(jsonInput);
      if (!parsed.nodes || !parsed.edges) throw new Error("JSON must have 'nodes' and 'edges'");
      setGraphData(parsed);
      setLoadSource("manual");
      setTab("graph");
    } catch (e) { setError(e.message); }
  }, [jsonInput]);

  const runMerge = useCallback(() => {
    try {
      setError(null);
      const arr = JSON.parse(mergeInputs);
      if (!Array.isArray(arr)) throw new Error("Must be a JSON array");
      const merged = mergeGraphs(arr);
      setGraphData(merged);
      setLoadSource("merge");
      setTab("graph");
    } catch (e) { setError(e.message); }
  }, [mergeInputs]);

  const shareLink = graphData ? generateShareLink(graphData) : "";
  const noGraph = !graphData?.nodes?.length;

  const tabStyle = (t) => ({
    padding: "8px 20px", fontSize: 13, fontWeight: tab === t ? 700 : 400,
    cursor: "pointer", background: tab === t ? "#0d1b2a" : "transparent",
    color: tab === t ? "#00d4ff" : "#666", border: "none",
    borderBottom: tab === t ? "2px solid #00d4ff" : "2px solid transparent",
    transition: "all 0.3s ease",
    letterSpacing: 0.5,
    textShadow: tab === t ? "0 0 10px #00d4ff30" : "none",
  });

  const btnStyle = (color) => ({
    padding: "10px 22px", background: "#0d1b2a", color,
    border: `1px solid ${color}30`, borderRadius: 8,
    fontWeight: 600, cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: `0 0 12px ${color}10`,
  });

  return (
    <div style={{
      background: "#060a12", color: "#e0e0e0", minHeight: "100vh",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Google Font for cursive */}
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        padding: "14px 24px 0", display: "flex", alignItems: "center", gap: 16,
        borderBottom: "1px solid #ffffff08",
        background: "linear-gradient(180deg, #0a101a, transparent)",
      }}>
        {/* Branding */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 22, fontWeight: 600,
            background: "linear-gradient(135deg, #00d4ff, #a855f7, #ec4899)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 0.5,
          }}>
            CregenWare
          </span>
          <span style={{ color: "#444", fontSize: 12, fontStyle: "italic", letterSpacing: 0.5 }}>presents</span>
          <span style={{
            fontWeight: 700, fontSize: 16, color: "#e0e0e0",
            letterSpacing: 1.5, textTransform: "uppercase",
          }}>
            Knowledge Graph
          </span>
        </div>

        {graphData?.meta?.title && graphData.meta.title !== "Knowledge Graph" && (
          <span style={{
            color: "#555", fontSize: 12,
            background: "#ffffff06", padding: "3px 10px", borderRadius: 20,
          }}>
            {graphData.meta.title}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button style={tabStyle("graph")} onClick={() => setTab("graph")}>Graph</button>
        <button style={tabStyle("import")} onClick={() => setTab("import")}>Import</button>
        <button style={tabStyle("merge")} onClick={() => setTab("merge")}>Merge</button>
        <button style={tabStyle("share")} onClick={() => setTab("share")}>Share</button>
      </div>

      {!noGraph && tab === "graph" && <StatsBar data={graphData} />}
      {!noGraph && tab === "graph" && (
        <div style={{ padding: "4px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Legend />
          {loadSource === "url" && (
            <span style={{
              fontSize: 10, color: "#66bb6a", background: "#66bb6a10",
              padding: "3px 12px", borderRadius: 20, letterSpacing: 0.5,
              border: "1px solid #66bb6a20",
            }}>
              ✦ Loaded from link
            </span>
          )}
        </div>
      )}

      <div style={{ padding: "10px 20px 20px", minHeight: 500 }}>
        {error && (
          <div style={{
            background: "linear-gradient(135deg, #2a1520, #1a1020)",
            border: "1px solid #ef535030", padding: 14, borderRadius: 8,
            marginBottom: 12, fontSize: 13, color: "#ef9a9a",
          }}>{error}</div>
        )}

        {tab === "graph" && noGraph && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: 400, gap: 18, color: "#555",
          }}>
            <div style={{ fontSize: 56, opacity: 0.15 }}>◆</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#444", letterSpacing: 1 }}>No graph loaded</div>
            <div style={{ fontSize: 13, color: "#333", textAlign: "center", maxWidth: 420, lineHeight: 1.6 }}>
              Open a shared link, or go to Import to paste graph JSON from your Logic App.
            </div>
            <button onClick={() => setTab("import")}
              style={{
                marginTop: 8, padding: "12px 28px",
                background: "linear-gradient(135deg, #00d4ff10, #a855f710)",
                color: "#00d4ff", border: "1px solid #00d4ff20", borderRadius: 8,
                fontWeight: 600, cursor: "pointer", letterSpacing: 0.5,
                transition: "all 0.3s",
              }}>
              Import JSON
            </button>
          </div>
        )}

        {tab === "graph" && !noGraph && (
          <ForceGraph data={graphData} width={dims.w} height={dims.h} />
        )}

        {tab === "import" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "calc(100vh - 160px)" }}>
            <div style={{ color: "#888", fontSize: 13 }}>
              Paste the JSON output from your Logic App.
            </div>
            <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"meta":{...}, "nodes":[...], "edges":[...]}'
              style={{
                flex: 1, background: "#0a101a", color: "#e0e0e0",
                border: "1px solid #ffffff10", borderRadius: 8, padding: 14,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, resize: "none",
                outline: "none",
              }}
            />
            <button onClick={loadJson}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg, #00d4ff, #0088cc)",
                color: "#000", border: "none", borderRadius: 8,
                fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
                boxShadow: "0 0 20px #00d4ff20",
              }}>
              Load Graph
            </button>
          </div>
        )}

        {tab === "merge" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "calc(100vh - 160px)" }}>
            <div style={{ color: "#888", fontSize: 13 }}>
              Paste a JSON array of chunked graphs to merge.
            </div>
            <textarea value={mergeInputs} onChange={(e) => setMergeInputs(e.target.value)}
              placeholder="[{...graph1}, {...graph2}]"
              style={{
                flex: 1, background: "#0a101a", color: "#e0e0e0",
                border: "1px solid #ffffff10", borderRadius: 8, padding: 14,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 12, resize: "none",
                outline: "none",
              }}
            />
            <button onClick={runMerge}
              style={{
                padding: "12px 28px",
                background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                color: "#fff", border: "none", borderRadius: 8,
                fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
                boxShadow: "0 0 20px #a855f720",
              }}>
              Merge & Visualize
            </button>
          </div>
        )}

        {tab === "share" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
            <div style={{ color: "#888", fontSize: 13 }}>
              Share link with graph data encoded in the URL. No server needed.
            </div>
            {noGraph ? (
              <div style={{ color: "#555", padding: 24, textAlign: "center" }}>
                Load a graph first.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#666", letterSpacing: 0.5 }}>Shareable Link:</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input readOnly value={shareLink}
                    style={{
                      flex: 1, background: "#0a101a", color: "#00d4ff",
                      border: "1px solid #ffffff10", borderRadius: 8,
                      padding: "10px 14px", fontFamily: "monospace", fontSize: 12,
                      outline: "none",
                    }}
                  />
                  <button onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    style={{ ...btnStyle("#00d4ff"), whiteSpace: "nowrap" }}>
                    {copied ? "✓ Copied!" : "Copy Link"}
                  </button>
                </div>
                <div style={{ color: "#555", fontSize: 11 }}>
                  URL length: {shareLink.length.toLocaleString()} chars
                  {shareLink.length > 8000
                    ? <span style={{ color: "#ef5350" }}> — may exceed browser limits</span>
                    : <span style={{ color: "#66bb6a" }}> — safe for all browsers</span>}
                </div>

                <div style={{ borderTop: "1px solid #ffffff08", paddingTop: 18, marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 10, letterSpacing: 0.5 }}>
                    Logic App Expression (Compose_Link):
                  </div>
                  <div style={{
                    background: "#0a101a", border: "1px solid #ffffff10",
                    borderRadius: 8, padding: 14,
                    fontFamily: "monospace", fontSize: 11, color: "#ffd54f",
                    wordBreak: "break-all", lineHeight: 1.6,
                  }}>
                    {"https://orange-hill-0dac85010.7.azurestaticapps.net/#data=@{base64(string(outputs('Compose_Final_Graph')))}"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, borderTop: "1px solid #ffffff08", paddingTop: 18 }}>
                  <button onClick={() => {
                    const b = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
                    const u = URL.createObjectURL(b);
                    const a = document.createElement("a"); a.href = u; a.download = "knowledge-graph.json"; a.click();
                    URL.revokeObjectURL(u);
                  }} style={btnStyle("#00d4ff")}>Download JSON</button>
                  <button onClick={() => {
                    const cy = [
                      "// Neo4j Cypher",
                      ...graphData.nodes.map((n) => `CREATE (${n.id}:${n.type} {id:"${n.id}",label:"${n.label.replace(/"/g, '\\"')}",weight:${n.weight}});`),
                      ...graphData.edges.map((e) => `MATCH (a {id:"${e.source}"}),(b {id:"${e.target}"}) CREATE (a)-[:${e.relationship.toUpperCase()} {weight:${e.weight}}]->(b);`),
                    ].join("\n");
                    const b = new Blob([cy], { type: "text/plain" });
                    const u = URL.createObjectURL(b);
                    const a = document.createElement("a"); a.href = u; a.download = "graph.cypher"; a.click();
                    URL.revokeObjectURL(u);
                  }} style={btnStyle("#ffd54f")}>Download Cypher</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
