import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

//Explain Route
app.post("/explain", async (req, res) => {
  try {
    const { sequence } = req.body;

    const prompt = `
You are an expert at explaining flowcharts clearly.

Here are the steps in the flowchart:
${sequence
  .map((s, i) => {
    let line = `Step ${i + 1}: [${s.role}]`;
    if (s.label) {
      line += ` — "${s.label}"`;
    } else {
      line += ` — (${s.role})`;
    }
    if (s.branches?.length) {
      s.branches.forEach((b) => {
        line += `\n   → If ${b.branch}: goes to "${b.targetLabel}"`;
      });
    }
    return line;
  })
  .join("\n")}

Explain this flowchart step-by-step in a clear and structured way.
Use bullet points and keep it concise.
`;

    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ explanation: result.choices[0].message.content });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

//Generate Diagram Route
app.post("/generate", async (req, res) => {
    try{
        const { prompt } = req.body;
        const aiPrompt = `
Convert this into a flowchart structure.

Rules:
- Return JSON only
- Use types: process, decision
- Include label
- Include branch for decisions (yes/no)

Input:
"${prompt}"

Output format:
[
  { "type": "process", "label": "Login" },
  { "type": "decision", "label": "Valid?" },
  { "type": "process", "label": "Dashboard", "branch": "yes" },
  { "type": "process", "label": "Error", "branch": "no" }
]
`;
        const model = genAI.getGenerativeModel({
            model: "llama3-8b-8192",
        });

        const result = await model.generateContent(aiPrompt);
        const text = result.response.text();

        const json = JSON.parse(text);
        res.json(json);
    } catch(err){
        console.error("Generation Error:", err);
        res.status(500).json({ error: "Failed to generate diagram" });
    }
});


app.listen(5000, () => {
  console.log("Server running on port 5000");
});
