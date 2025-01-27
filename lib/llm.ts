import { LLMRequest, LLMResponse, StreetNameEntry } from "../types";

export async function queryLLM({
  entries,
  question,
}: LLMRequest): Promise<LLMResponse> {
  try {
    // Step 1: Get filter criteria or direct answer from LLM
    const firstPrompt = buildFirstPrompt(question);
    const firstResponse = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: firstPrompt }),
    });

    if (!firstResponse.ok) throw new Error("LLM first request failed");
    const firstResult = await firstResponse.json();
    const firstResponseText = firstResult.result;

    console.log(firstResponseText, "first");

    // If the response isn't a filter array, return it as the answer
    if (!firstResponseText.startsWith("[")) {
      return {
        answer: firstResponseText,
        filteredEntries: entries,
        filteredCount: entries.length,
      };
    }

    // Parse and apply filters
    let filteredEntries = entries;
    try {
      const filterCriteria = JSON.parse(firstResponseText);
      filteredEntries = applyFilters(entries, filterCriteria);
    } catch (error) {
      console.error("Failed to parse filter criteria:", error);
      // Fallback to original entries on error
    }

    // Step 2: Generate summary from filtered entries
    const entriesForLLM = filteredEntries.slice(0, 10);
    const prompt = buildSecondPrompt(entriesForLLM, question);
    const response = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    console.log(response, "second");

    if (!response.ok) throw new Error("LLM second request failed");
    const result = await response.json();
    return {
      answer: result.result,
      filteredEntries: filteredEntries,
      filteredCount: filteredEntries.length,
    };
  } catch (error) {
    console.error("Error in queryLLM:", error);
    throw error;
  }
}

function applyFilters(
  entries: StreetNameEntry[],
  filterSet: Array<{
    coname: string;
    location: string;
    borough: string;
    reason: string;
  }>
) {
  return entries.filter((entry) =>
    filterSet.some((filter) => {
      const matches = [
        filter.coname === "na" ||
          entry.coname.toLowerCase().includes(filter.coname.toLowerCase()),
        filter.location === "na" ||
          entry.location.toLowerCase().includes(filter.location.toLowerCase()),
        filter.borough === "na" ||
          entry.borough.toLowerCase() === filter.borough.toLowerCase(),
        filter.reason === "na" ||
          entry.reason.toLowerCase().includes(filter.reason.toLowerCase()),
      ];
      return matches.every(Boolean);
    })
  );
}

function buildFirstPrompt(question: string): string {
  return `
  You are an intelligent assistant with access to a dataset about NYC honorary street names.
  
  Each entry in the dataset contains the following structure:
  - Name (coname): The street's honorary name.
  - Location (location): The street's address. This will be a street name, or two street names if the honorary name is an intersection.
  - Borough (borough): The borough where the street is located, values are "manhattan", "brooklyn", "queens", "staten island", "bronx".
  - Reason (reason): Why the street is named. Some are pretty detailed and lengthy. You can treat this as the wildcard to filter entries by.
  
  The user has asked: "${question}"
  
  ### Your Task:
  1. Determine if we can find some relevant answer from the dataset.
  2. If we can, provide structured filter criteria for the dataset. The filters should include the following attributes:
     - coname: a specific street name or part of a name to filter by (or 'na' if not applicable).
     - location: part of the street address to filter by (or 'na' if not applicable).
     - borough: a borough to filter by (or 'na' if not applicable).
     - reason: a keyword or topic in the "reason" field to filter by (or 'na' if not applicable).
  
  ### Example Response:
  [
    { "coname": "na", "location": "na", "borough": "manhattan", "reason": "violinist" },
    { "coname": "isaac stern place", "location": "na", "borough": "na", "reason": "na" }
  ]


  3. If we can't find a relevant answer, answer the question with your knowledge.".

  ### Examples:
  The user has asked: "Who are 9/11 heroes?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "na", "reason": "911 heroes" }]

  The user has asked: "Who are the artists that have honorary street names?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "na", "reason": "artist" }]

  The user has asked: "What are the street names in brooklyn?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "brooklyn", "reason": "brooklyn" }]

  The user has asked: "in soho?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "brooklyn", "reason": "soho" }]

  The user has asked: "who is Isaac Stern?"
  Your response:
   [{ "coname": "Isaac Stern", "location": "na", "borough": "na", "reason": "na" },
   { "coname": "na", "location": "na", "borough": "na", "reason": "Isaac Stern" }]

  The user has asked: "How are you feeling?"
  Your response:
   "hello, I'm ready to help you exploring the nyc honorary street names. You can try "what are the street names in brooklyn?" or "who is Isaac Stern?""

          `.trim();
}

function buildSecondPrompt(
  entries: StreetNameEntry[],
  question: string
): string {
  return `
    You are an intelligent assistant providing information about NYC honorary street names.
    The user's question is: "${question}"
    
    Here are the most relevant entries based on your filter logic:
    ${entries
      .slice(0, 10) // Limit to 10 entries for brevity
      .map(
        (entry) => `
    - Name: ${entry.coname}
      Location: ${entry.location}
      Borough: ${entry.borough}
      Reason: ${entry.reason}
    `
      )
      .join("\n")}
    
    Please generate a concise response for the user based on these entries.
                    `.trim();
}
