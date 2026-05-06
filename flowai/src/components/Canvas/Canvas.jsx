import { Excalidraw } from "@excalidraw/excalidraw";
import { useRef } from "react";

const Canvas = ({ onElementsChange, onApiReady }) => {
  return (
    <div className="h-screen">
      <Excalidraw
        onChange={(elements) => onElementsChange(elements)}
        excalidrawAPI={(api) => onApiReady && onApiReady(api)}  // ✅ expose API
      />
    </div>
  );
};

export default Canvas;