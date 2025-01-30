import { LLMRequest, LLMResponse, StreetNameEntry } from "../types";

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

    console.log(weaviateData, "weaviateData");
    // 3 Return results for visualization
    return {
      //   answer:
      //     weaviateData.results.objects.map(
      //       (obj: any) => obj.properties.honorary_name
      //     ) || "No relevant street names found.",
      //   filteredCount: weaviateData.results ? weaviateData.results.length : 0,
      filteredEntries: weaviateData.parsedEntries,

      answer: "hello",
      filteredCount: 0,
      //   filteredEntries: [],
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

  `.trim();
}
