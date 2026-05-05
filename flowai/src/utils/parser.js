export function cleanElements(elements) {
  // Build bound text map using containerId
  const boundTextMap = new Map();
  elements.forEach((el) => {
    if (el.type === "text" && el.containerId) {
      boundTextMap.set(el.containerId, el.text || "");
    }
  });

  // ✅ Debug - remove after fixing
  console.log("Bound text map:", Object.fromEntries(boundTextMap));

  return elements
    .filter((el) => el.type !== "text") // ✅ filter out standalone text elements
    .map((el) => ({
      id: el.id,
      type: el.type,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      text: boundTextMap.get(el.id) || el.text || "",  // ✅ lookup by shape id
      startBinding: el.startBinding || null,
      endBinding: el.endBinding || null,
      boundElements: el.boundElements || [],
    }));
}

export function interpretElements(elements) {
  return elements.map((el) => {
    let role = "unknown";
    if (el.type === "rectangle") role = "process";
    else if (el.type === "diamond") role = "decision";
    else if (el.type === "arrow") role = "flow";
    else if (el.type === "ellipse") role = "start_end";
    else if (el.type === "parallelogram") role = "input_output";  // ✅ new
    return {
      ...el,
      role,
    };
  });
}

export function buildConnections(elements) {
  const connections = [];
  elements.forEach((el) => {
    if (el.type === "arrow" && el.startBinding && el.endBinding) {

      if (!el.startBinding || !el.endBinding) return;

      // ✅ extract Yes/No label from arrow text
      const label = el.text?.trim().toLowerCase().replace(".", "");
      let branch = null;
      if (label === "yes" || label === "y") branch = "yes";
      else if (label === "no" || label === "n") branch = "no";

      const conn = {
        from: el.startBinding.elementId,
        to: el.endBinding.elementId,
        branch,  // ✅ yes/no branch
      };
      if (!connections.some((c) => c.from === conn.from && c.to === conn.to)) {
        connections.push(conn);
      }
    }
  });
  return connections;
}

export function mapConnections(elements, connections) {
  return connections.map((conn) => {
    const fromEl = elements.find((el) => el.id === conn.from);
    const toEl = elements.find((el) => el.id === conn.to);
    return {
      from: fromEl?.role || "unknown",
      fromLabel: fromEl?.text || "",
      to: toEl?.role || "unknown",
      toLabel: toEl?.text || "",
      branch: conn.branch || null,
    };
  });
}

export function buildFlowSequence(elements, connections) {
  if (!connections.length) return [];

  const outgoing = new Map();
  const incomingCount = new Map();

  elements.forEach((el) => {
    outgoing.set(el.id, []);
    incomingCount.set(el.id, 0);
  });

  connections.forEach(({ from, to }) => {
    if (outgoing.has(from)) outgoing.get(from).push(to);
    if (incomingCount.has(to))
      incomingCount.set(to, incomingCount.get(to) + 1);
  });

  const startNodes = [];
  incomingCount.forEach((count, id) => {
    if (count === 0) startNodes.push(id);
  });

  const visited = new Set();
  const queue = [...startNodes];
  const sequence = [];

  while (queue.length) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const el = elements.find((el) => el.id === currentId);
    if (el && el.role !== "flow") {
      // ✅ find branches coming out of this element
      const outgoingConns = connections.filter((c) => c.from === currentId);
      const branches = outgoingConns
        .filter((c) => c.branch)
        .map((c) => {
          const target = elements.find((e) => e.id === c.to);
          return {
            branch: c.branch,
            targetLabel: target?.text || target?.role || "unknown",
          };
        });

      sequence.push({
        id: el.id,
        role: el.role,
        type: el.type,
        label: el.text || "",       // ✅ include label
        branches,                   // ✅ include yes/no branches
      });
    }

    const nextNodes = outgoing.get(currentId) || [];
    nextNodes.forEach((nextId) => {
      if (!visited.has(nextId)) queue.push(nextId);
    });
  }

  return sequence;
}