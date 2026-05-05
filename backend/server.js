import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
