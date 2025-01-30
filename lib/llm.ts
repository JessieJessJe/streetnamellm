import { LLMRequest, LLMResponse } from "../types";
import { StreetNameEntry } from "../types";

export async function queryLLM({ question }: LLMRequest): Promise<LLMResponse> {
  try {
    // 1 Call OpenAI to extract location & search terms
    const firstPrompt = buildFirstPrompt(question);
    const firstResponse = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: firstPrompt }),
    });
    if (!firstResponse.ok) throw new Error("LLM first request failed");

    const firstResult = await firstResponse.json();

    let queryParams = { location: "null", searchTerms: "newyork" };

    try {
      queryParams = JSON.parse(firstResult.result);
    } catch (error) {
      console.error("Failed to parse query params:", error);
    }

    // 2️ Call Weaviate API route

    console.log(queryParams, "queryParams");

    const { searchTerms, location } = queryParams;

    const weaviateResponse = await fetch("/api/weaviate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchTerms, location }),
    });

    const weaviateData = await weaviateResponse.json();

    console.log(weaviateData.parsedEntries, "weaviateData");

    // 3 Return results for visualization
    //placeholder for calling llm to generate a summary answer
    // 3️⃣ Filter the top 10 most relevant results
    let filteredEntries: StreetNameEntry[] = weaviateData.parsedEntries || [];

    // If more than 10 results, sort by score and pick top 10
    if (filteredEntries.length > 10) {
      filteredEntries = filteredEntries
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) // Sort descending by score
        .slice(0, 10);
    }

    // 4️⃣ Call OpenAI LLM to generate a summary
    const summaryPrompt = buildSummaryPrompt(filteredEntries);
    const summaryResponse = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: summaryPrompt }),
    });

    let summary = "No summary available.";
    if (summaryResponse.ok) {
      const summaryResult = await summaryResponse.json();
      summary = summaryResult.result || summary;
    }

    return {
      answer: summary, //this should be the summary answer
      filteredEntries: weaviateData.parsedEntries,
      filteredCount: weaviateData.parsedEntries.length,
    };
  } catch (error) {
    console.error("Error in queryLLM:", error);
    throw error;
  }
}

function buildFirstPrompt(question: string): string {
  return `
    You are an intelligent assistant with access to a dataset about NYC honorary street names.
    The user has asked: "${question}"
      ### Your Task:
      1. analyze the question and extract "location" and "searchTerms" info for vector search.
      2. return in JSON format. FOR EXAMPLE: {"location": "brooklyn", "searchTerms": "musicians"}

      To extract "location":
      If the question contains a neighborhood, borough, or specific street, extract it. if not, return "null"

      To extract "searchTerms" for vector search.
     - Identify key concepts (e.g., musicians, artists, scientists, activists).  
     - Expand broad concepts into related term. (e.g., "creative people" → "artists", "musicians")  

    Example 1:
    User Question: "Street names about love?"
    Your response: {"location": "null", "searchTerms": "love"}

    Example 2:
    User Question: "Street names about musicians in WILLIAMSBURG?"
    Your response: {"location": "williamsburg", "searchTerms": "musicians"}

    Example 3:
    User Question: "near the Brooklyn Bridge?"
    Your response: {"location": "brooklyn bridge", "searchTerms": "brooklyn bridge"

    Example 4:
    User Question: "where is walt whitman street?"
    Your response: {"location": "null", "searchTerms": "walt whitman"

  `.trim();
}

// Helper function to build OpenAI prompt for summary
function buildSummaryPrompt(entries: StreetNameEntry[]): string {
  const formattedEntries = entries
    .map(
      (entry, index) =>
        `${index + 1}. **${entry.honorary_name}** 
        }) - ${entry.bio}`
    )
    .join("\n");

  return `
      You are an AI that provides a short summary of NYC honorary street names.
  
      Given the following list of honorary streets and their descriptions, summarize the key themes:
  
      ${formattedEntries}
  
      Summarize the main themes of these honorary street names in 2-3 sentences.
    `.trim();
}
