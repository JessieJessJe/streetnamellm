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

    console.log(firstResult, "first");

    // If the response isn't a filter array (question is super irrelevant), return result directly.
    if (!firstResult.result.startsWith("[")) {
      return {
        answer: firstResult.result,
        filteredEntries: entries,
        filteredCount: entries.length,
      };
    }

    // Parse and apply filters
    let filteredEntries = entries;
    try {
      const filterCriteria = JSON.parse(firstResult.result);
      filteredEntries = applyFilters(entries, filterCriteria);
    } catch (error) {
      console.error("Failed to parse filter criteria:", error);
    }

    //Step 2.1 if no entries found: LLM answer according to internet knowledge. Trigger semantic search.
    if (filteredEntries.length === 0) {
      const prompt = buildNullPrompt(question);
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error("LLM buildnullprompt request failed");
      const result = await response.json();

      // If the response isn't a filter array (LLM could not find internet answers), return result directly.
      if (!result.result.startsWith("[")) {
        return {
          answer: result.result,
          filteredEntries: entries,
          filteredCount: entries.length,
        };
      }

      try {
        const filterCriteria = JSON.parse(result.result);
        filteredEntries = applyFilters(entries, filterCriteria);
      } catch (error) {
        console.error("Failed to parse filter criteria:", error); // Fallback to original entries on error
      }

      console.log(result, filteredEntries, "nullprompt");
    }

    // Step 2.2: Generate summary from filtered entries
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
  1. Determine if we can find some relevant answer from the dataset. Assume question is about street names even if it is not explicitly stated.
  2. If we can, provide SQL like filter criteria for the dataset. 
     Filter criteria is abstracted from question. 
     Your response should always be a valid array of JSON objects that can be parsed by JSON.parse(). It begins with '[' and ends with ']'. 
     
     Inside, each object should have the following attributes:
     - coname: a name or honorary street name or 'na' 
     - location: a street name or 'na'
     - borough: "manhattan", "brooklyn", "queens", "staten island", "bronx" or 'na'
     - reason:  a keyword or 'na'

    For example, this is a valid response:
    [
        { "coname": "na", "location": "na", "borough": "na", "reason": "violinist" },
        { "coname": "isaac stern place", "location": "na", "borough": "na", "reason": "na" }
    ]
    this is not a valid response:
    { "coname": "na", "location": "na", "borough": "na", "reason": "violinist" }

    this is not a valid response:
    [
        { "coname": "na", "location": "na", "borough": "na", "reason": "violinist" },
        { "coname": "isaac stern place", "location": "na", "borough": "na

  3. If we can't find a relevant answer, answer the question with your knowledge in 2~3 sentences and encourage the user to ask one follow up question. 

### Examples User Question and  Your Response:
Example 1:
  User Question: "Who are the crazy people?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "na", "reason": "crazy" }, 
    { "coname": "na", "location": "na", "borough": "na", "reason": "crazy people" }, 
    { "coname": "george carlin", "location": "na", "borough": "na", "reason": "na" },
    { "coname": "jimi hendrix", "location": "na", "borough": "na", "reason": "na" },
    { "coname": "jean michel basquiat", "location": "na", "borough": "na", "reason": "na" }]

Example 2:
  User Question: "What are the street names in brooklyn?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "brooklyn", "reason": "na" },
    { "coname": "na", "location": "na", "borough": "na", "reason": "brooklyn" }]

Example 3:
  User Question: "street names in williamsburg?"
  Your response:
   [{ "coname": "na", "location": "na", "borough": "brooklyn", "reason": "williamsburg"}, 
    { "coname": "na", "location": "na", "borough": "na", "reason": "williamsburg" }]

Example 4:
  User Question: "who is Isaac Stern?"
  Your response:
   [{ "coname": "Isaac Stern", "location": "na", "borough": "na", "reason": "na" },
    { "coname": "na", "location": "na", "borough": "na", "reason": "Isaac Stern" }]

Example 5:
  User Question: "How are you feeling?"
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
