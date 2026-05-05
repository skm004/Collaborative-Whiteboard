export async function fetchExplanation(sequence) {
  const res = await fetch("http://localhost:5000/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sequence }),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch explanation");
  }

  const data = await res.json();
  return data.explanation;
}