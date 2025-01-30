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
      answer:
        weaviateData.results.objects.map(
          (obj: any) => obj.properties.honorary_name
        ) || "No relevant street names found.",
      filteredCount: weaviateData.results ? weaviateData.results.length : 0,
      filteredEntries: [],

      //   answer: "hello",
      //   filteredCount: 0,
      //   filteredEntries: [],
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

function buildSecondPrompt(
  entries: StreetNameEntry[],
  question: string
): string {
  return `
    You are an intelligent assistant providing information about NYC honorary street names.
    The user's question is: "${question}"
    
    Here are some relevant entries selected from a set of filtering logic. But the logic can be too preliminary, too strict or mechanical:
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
    
    Please generate a concise, friendly, poetic response:
    1. Looking at the entries, provide your summary. 
    2. Then, based on your knowledge from the internet, you will highlight 1~3 honorary street names that are relevant to the user's question if applicable.
       
    
    ### Examples:
    Example 1:
    User Question: "Street names about love?"
    Your response:

     "What a question? It is clear that many honorary street names in NYC are dedicated to heroes and loved ones who lost their lives in the tragic events of September 11, 2001. These names serve as a poignant reminder of the sacrifices made on that day and the enduring love and memory of those who were lost.
     For example, "Martin J. Egan Jr. Corner" in Staten Island. This name not only honors the memory of those lost in the 9/11 attacks but also conveys a sense of love and remembrance for the heroes who bravely responded to the tragedy
     "Jimmy Quinn Way" in Brooklyn is another street name that reflects the theme of love and remembrance. By honoring Jimmy Quinn, this street serves as a lasting tribute to his life and the love he shared with his community."

    `.trim();
}

function buildNullPrompt(question: string): string {
  return `
      You are an intelligent assistant providing information about NYC honorary street names.
      The user's question is: "${question}"

      We have a dataset of NYC honorary street names. Each entry in the dataset contains the following structure:
        - Name (coname): The street's honorary name.
        - Location (location): The street's address. This will be a street name, or two street names if the honorary name is an intersection.
        - Borough (borough): The borough where the street is located, values are "manhattan", "brooklyn", "queens", "staten island", "bronx".
        - Reason (reason): Why the street is named. 
      
      However we could not find any relevant entries through a traditional SQL keyword search. So based on your knowledge from the internet, you will help user find the honorary street names that are relevant to the question.

  
        ### Your Task:
        1. Assume question is about street names even if it is not explicitly stated. Assume there will be a street name that satisfies the question.
        2. Provide structured filter criteria for the dataset. The filters should include the following attributes:
            - coname: the honoree's name or honorary street name (according to your knowledge from the internet).
            - location: this attribute is 'na'
            - borough:  this attribute is 'na'
            - reason:  this attributer is 'na'

        Your response should be an array of JSON objects AND nothing else. for example:
        [
            { "coname": "joanne", "location": "na", "borough": "na", "reason": "na" },
            { "coname": "isaac stern", "location": "na", "borough": "na", "reason": "na" }
        ]
        
        You should try to come up at least 3 filter criteria.


  3. If there is no specific street names can be queried, answer the question with your knowledge and encourage the user to ask one follow up question.   
                      `.trim();
}
