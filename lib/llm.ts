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
    if (!firstResponse.ok) {
      console.log(firstResponse, "firstResponse");
      throw new Error("LLM first request failed");
    }
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

    // 3 Return results for visualization
    let filteredEntries: StreetNameEntry[] = weaviateData.parsedEntries || [];

    // If more than 50 results, sort by score and pick top 10
    if (filteredEntries.length > 10) {
      filteredEntries = filteredEntries
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) // Sort descending by score
        .slice(0, 10);
    }

    // 4.Call OpenAI LLM to generate a summary
    const summaryPrompt = buildSummaryPrompt(filteredEntries, question);
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
    You are an intelligent artist, historian who love nyc stories and have access to a dataset about NYC honorary street names.
    The user has asked: "${question}"
      ### Your Task:
      1. analyze the question and extract "location" and "searchTerms" info for vector search.
      2. return in JSON format. FOR EXAMPLE: {"location": "null", "searchTerms": "about asians in queens"}

      To extract "location":
     - If the question contains a borough (e.g., queens, brooklyn, manhattan, bronx, staten island), return "null"
     - If the question contains a street/avenue name, determine if it is a legit address in nyc. If it is, extract it. If it is not, return "null".
     - If the question contains a postal code, neighborhood (e.g., Williamsburg, Astoria, Chinatown, Bushwick, etc), a landmark (e.g., Brooklyn Bridge, Central Park, etc), extract it. 
     - If no location found, return "null"

      To extract "searchTerms" for vector search.
     - searchTerms is a string. By default, it should be the question.
     - Do not include common words or words that describe this dataset like 'about' 'street names' 'streets' 'street' 'names' 'honored' 'people'in the searchTerms.

    Example 1:
    User Question: "Street names about love?"
    Your response: {"location": "null", "searchTerms": "love"}

    Example 2:
    User Question: "Street names about musicians in WILLIAMSBURG?"
    Your response: {"location": "williamsburg", "searchTerms": "musicians in williamsburg"}

    Example 3:
    User Question: "near the central park?"
    Your response: {"location": "central park", "searchTerms": "central park"}

    Example 4:
    User Question: "where is walt whitman street?"
    Your response: {"location": "null", "searchTerms": "walt whitman"}

    Example 5:
    User Question: "which street has the most galleries?"
    Your response: {"location": "null", "searchTerms": "galleries"}

    Example 6:
    User Question: "why people are being remembered?"
    Your response: {"location": "null", "searchTerms": "remember"}

  `.trim();
}

// Helper function to build OpenAI prompt for summary
function buildSummaryPrompt(
  entries: StreetNameEntry[],
  question: string
): string {
  const formattedEntries = entries
    .map(
      (entry) =>
        `${entry.honorary_name}, current address is ${entry.limits},
        biography of the honoree: ${entry.bio}`
    )
    .join("\n");

  return `
      You are an intelligent artist, poet, and historian who love nyc stories and have access to a dataset about NYC honorary street names.
      The user has asked: "${question}" 

      Assume the question is in context about NYC honorary street names, the stories behind the street names, and the people who are honored on the street.

      We found the following list of honorary streets to be relevant. 
      
      Answer the user's question based on the provided street entries.
      If possible, provide a summary of the honoree's love and passion and how it relates to being honored on a street.
      Finally, say based on my knowledgefrom the internet and answer the question based on your knowledge in 2~3 sentence.

      ${formattedEntries}
    `.trim();
}
