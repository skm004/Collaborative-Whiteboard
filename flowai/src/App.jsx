import { useRef, useState } from "react";
import Canvas from "./components/Canvas/Canvas";
import ReactMarkdown from "react-markdown"; // ✅ markdown rendering
import {
  cleanElements,
  interpretElements,
  buildConnections,
  mapConnections,
  buildFlowSequence,
} from "./utils/parser";
import { fetchExplanation } from "./api/explain";
import { generateDiagram } from "./api/generateDiagram";

function buildExcalidrawElements(nodes) {
  const elements = [];

  const SHAPE_WIDTH = 160;
  const SHAPE_HEIGHT = 80;
  const GAP_Y = 100;
  const GAP_X = 260;
  const START_X = 300;
  const START_Y = 80;

  const idMap = {};
  const posMap = {};

  let currentY = START_Y;
  let lastDecisionIndex = -1;

  // =========================
  // 1. POSITIONING
  // =========================
  nodes.forEach((node, i) => {
    if (node.type === "decision") {
      lastDecisionIndex = i;

      posMap[i] = {
        x: START_X,
        y: currentY,
      };

      currentY += SHAPE_HEIGHT + GAP_Y;
    } else if (node.branch === "yes" && lastDecisionIndex !== -1) {
      const dec = posMap[lastDecisionIndex];

      posMap[i] = {
        x: dec.x + GAP_X,
        y: dec.y + SHAPE_HEIGHT + GAP_Y,
      };
    } else if (node.branch === "no" && lastDecisionIndex !== -1) {
      const dec = posMap[lastDecisionIndex];

      posMap[i] = {
        x: dec.x - GAP_X,
        y: dec.y + SHAPE_HEIGHT + GAP_Y,
      };
    } else {
      posMap[i] = {
        x: START_X,
        y: currentY,
      };

      currentY += SHAPE_HEIGHT + GAP_Y;
    }
  });

  // =========================
  // 2. SHAPES + TEXT
  // =========================
  nodes.forEach((node, i) => {
    const id = `shape-${i}`;
    idMap[i] = id;

    const { x, y } = posMap[i];
    const type = node.type === "decision" ? "diamond" : "rectangle";

    // Shape
    elements.push({
      id,
      type,
      x,
      y,
      width: SHAPE_WIDTH,
      height: SHAPE_HEIGHT,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: type === "rectangle" ? { type: 3 } : null,
      isDeleted: false,
      boundElements: [{ type: "text", id: `text-${i}` }],
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      updated: Date.now(),
      link: null,
      locked: false,
    });

    // Text (centered)
    elements.push({
      id: `text-${i}`,
      type: "text",

      // 🔥 CENTER via container, not manual math
      x: x,
      y: y,

      width: SHAPE_WIDTH,
      height: SHAPE_HEIGHT,

      angle: 0,
      text: node.label || "",
      originalText: node.label || "",

      fontSize: 16,
      fontFamily: 1,

      textAlign: "center",
      verticalAlign: "middle",

      containerId: id, // 🔥 THIS is key

      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,

      groupIds: [],
      frameId: null,
      isDeleted: false,
      boundElements: [],

      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      updated: Date.now(),
      link: null,
      locked: false,

      autoResize: true,
      lineHeight: 1.25,
    });
  });

  // =========================
  // 3. ARROWS
  // =========================
  nodes.forEach((node, i) => {
    if (i === 0) return;

    let fromIdx = i - 1;

    // 🔥 FIX: branch connects from decision
    if (node.branch && lastDecisionIndex !== -1) {
      fromIdx = lastDecisionIndex;
    }

    const fromId = idMap[fromIdx];
    const toId = idMap[i];

    const { x: fx, y: fy } = posMap[fromIdx];
    const { x: tx, y: ty } = posMap[i];

    const startX = fx + SHAPE_WIDTH / 2;
    const startY = fy + SHAPE_HEIGHT;

    const endX = tx + SHAPE_WIDTH / 2;
    const endY = ty;

    elements.push({
      id: `arrow-${i}`,
      type: "arrow",
      x: startX,
      y: startY,
      width: endX - startX,
      height: endY - startY,
      angle: 0,
      points: [
        [0, 0],
        [endX - startX, endY - startY],
      ],
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      startBinding: { elementId: fromId, focus: 0, gap: 8 },
      endBinding: { elementId: toId, focus: 0, gap: 8 },
      endArrowhead: "arrow",
      isDeleted: false,
      boundElements: node.branch
        ? [{ type: "text", id: `arrow-text-${i}` }]
        : [],
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      updated: Date.now(),
      link: null,
      locked: false,
    });

    // Arrow label (Yes/No)
    if (node.branch) {
      elements.push({
        id: `arrow-text-${i}`,
        type: "text",
        x: startX + (endX - startX) / 2 - 15,
        y: startY + (endY - startY) / 2 - 10,
        width: 30,
        height: 20,
        angle: 0,
        text: node.branch,
        originalText: node.branch,
        fontSize: 13,
        fontFamily: 1,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: `arrow-${i}`,
        strokeColor: "#e03131",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        isDeleted: false,
        boundElements: [],
        version: 1,
        versionNonce: Math.floor(Math.random() * 100000),
        updated: Date.now(),
        link: null,
        locked: false,
        autoResize: true,
        lineHeight: 1.25,
      });
    }
  });

  return elements;
}

function App() {
  const elementsRef = useRef([]);
  const sequenceRef = useRef([]);
  const excalidrawApiRef = useRef(null);
  const [aiText, setAiText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleElementsChange = (rawElements) => {
    const cleaned = cleanElements(rawElements);
    console.log(
      "Cleaned Elements:",
      cleaned.map((e) => ({ type: e.type, text: e.text })),
    );
    const interpreted = interpretElements(cleaned);
    elementsRef.current = interpreted;
    const connections = buildConnections(interpreted);
    const sequence = buildFlowSequence(interpreted, connections);
    sequenceRef.current = sequence;
  };

  // Manual explain button handler
  const handleExplain = async () => {
    const sequence = sequenceRef.current;
    if (!sequence.length || sequence.length < 2) {
      setAiText("Please draw a flowchart with at least 2 connected shapes.");
      return;
    }
    try {
      setLoading(true);
      const explanation = await fetchExplanation(sequence);
      setAiText(explanation);
    } catch (err) {
      console.error(err);
      setAiText("Error generating explanation.");
    } finally {
      setLoading(false);
    }
  };

  // Copy button handler
  const handleCopy = () => {
    navigator.clipboard.writeText(aiText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      setGenerating(true);
      const data = await generateDiagram(prompt);
      console.log("Generated Diagram Data:", data);

      // ✅ Convert to Excalidraw elements and place on canvas
      const elements = buildExcalidrawElements(data);
      if (excalidrawApiRef.current) {
        excalidrawApiRef.current.updateScene({ elements }); // ✅ THIS is what was missing
        setTimeout(() => {
          excalidrawApiRef.current.scrollToContent(undefined, {
            animate: true,
          });
        }, 100);
      }
    } catch (err) {
      console.error("Generation Error:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Canvas */}
      <div className="w-3/4">
        <Canvas
          onElementsChange={handleElementsChange}
          onApiReady={(api) => (excalidrawApiRef.current = api)}
        />
      </div>

      {/* Right panel */}
      <div className="w-1/4 p-4 border-l overflow-auto flex flex-col gap-3">
        <h2 className="text-xl font-bold">AI Explanation</h2>
        <div className="flex flex-col gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your flow (e.g. user logs in...)"
            className="border p-2 rounded text-sm"
          />

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-green-600 text-white px-3 py-2 rounded"
          >
            {generating ? "Generating..." : "⚡ Generate Diagram"}
          </button>
        </div>
        {/* ✅ Explain button */}
        <button
          onClick={handleExplain}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "✨ Explain Flowchart"}
        </button>

        {/* ✅ Markdown rendered explanation */}
        {aiText && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{aiText}</ReactMarkdown>
          </div>
        )}

        {/* ✅ Copy button */}
        {aiText && !loading && (
          <button
            onClick={handleCopy}
            className="mt-auto bg-gray-100 border px-4 py-2 rounded hover:bg-gray-200 text-sm"
          >
            {copied ? "✅ Copied!" : "📋 Copy Explanation"}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
