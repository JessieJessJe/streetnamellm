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

    if (!response.ok) throw new Error("LLM second request failed");
    const result = await response.json();

    console.log(result, filteredEntries, "second");

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
): StreetNameEntry[] {
  return entries.filter((entry) =>
    filterSet.some((filter) => {
      const { coname, location, borough, reason } = filter;

      return (
        (coname === "na" ||
          entry.coname.toLowerCase().includes(coname.toLowerCase())) &&
        (location === "na" ||
          entry.location.toLowerCase().includes(location.toLowerCase())) &&
        (borough === "na" ||
          entry.borough.toLowerCase() === borough.toLowerCase()) &&
        (reason === "na" ||
          entry.reason.toLowerCase().includes(reason.toLowerCase()))
      );
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
  - Reason (reason): Why the street is named. 
  
  The user has asked: "${question}"
  
  ### Your Task:
  1. Determine if we can find some relevant answer from the dataset.
  2. If we can, provide structured filter criteria for the dataset. The filters should include the following attributes:
     - coname: a specific street name or part of a name to filter by (or 'na' if not applicable).
     - location: part of the street address to filter by (or 'na' if not applicable).
     - borough: a borough to filter by (or 'na' if not applicable).
     - reason: a keyword or topic in the "reason" field to filter by (or 'na' if not applicable).
  3. If we can't find a relevant answer, answer the question with your knowledge.".


### Here's a sample filter response if 2 is true. Your response should be a JSON array.
  [
    { "coname": "na", "location": "na", "borough": "manhattan", "reason": "violinist" },
    { "coname": "isaac stern place", "location": "na", "borough": "na", "reason": "na" }
  ]


### Examples Response:
For some examples I provide a reason section to explain why I choose the filter criteria. But for your response, you should only provide the filter criteria.

  The user has asked: "Who are 9/11 heroes?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "na", "reason": "911 heroes" }]

  The user has asked: "Who are the artists that have honorary street names?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "na", "reason": "artist" }]
  Reason: this is an indirect question because we are not asking for specific street names. But the answer can be derived by analyzing from a pool of entries. This is your judgement to how to create the filter criteria to select the most relevant entries. A good start is to have a keyword in the reason field.

  The user has asked: "What are the street names in brooklyn?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "brooklyn", "reason": "na" },
    { "coname": "na", "location": "na", "borough": "na", "reason": "brooklyn" }]
  Reason: this question is quite specific. We can filter for "brooklyn" in the borough field. And as a good practice to not miss a candidate entry, we add an additional filter criteria for "brooklyn" in the reason field.

  The user has asked: "What are the street names in williamsburg?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "brooklyn", "reason": "williamsburg" }, { "coname": "na", "location": "na", "borough": "na", "reason": "williamsburg" }]
  Reason: this question is quite specific. But since williamsburg is part of brooklyn, we put brooklyn for borough and williamsburg in reason. As a good practice to not miss a candidate entry, we add an additional filter criteria for "williamsburg" in the reason field.


  The user has asked: "what are the street names about famous people in brooklyn??"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "brooklyn", "reason": "famous" },
    { "coname": "na", "location": "na", "borough": "brooklyn", "reason": "famous people" }]
  Reason: this question is quite specific. It requires joint filtering for a location and a subject. Notice for reason we have two filter criteria to catch all possible entries.

  The user has asked: "in soho?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "na", "reason": "soho" }]
  Reason: soho is a neighborhood in manhattan. because for borough we only have 5 values, we can't filter for "soho" in the borough field. Thus we put soho in the reason field. and na in the location field and borough field.

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
