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

function App() {
  const elementsRef = useRef([]);
  const sequenceRef = useRef([]);
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
    if(!prompt.trim()) return;

    try{
      setGenerating(true);
      const data = await generateDiagram(prompt);
      console.log("Generated Diagram Data:", data);
    } catch(err){
      console.error("Generation Error:", err);
    }finally{
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Canvas */}
      <div className="w-3/4">
        <Canvas onElementsChange={handleElementsChange} />
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
