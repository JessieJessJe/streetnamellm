import { NextResponse } from "next/server";
import weaviate, { WeaviateClient } from "weaviate-client";
import { StreetNameEntry } from "../../../types";

const weaviateURL = process.env.WEAVIATE_URL as string;
const weaviateKey = process.env.WEAVIATE_ADMIN_KEY as string;

let client: WeaviateClient | null = null;

async function getWeaviateClient() {
  if (!client) {
    client = await weaviate.connectToWeaviateCloud(weaviateURL, {
      authCredentials: new weaviate.ApiKey(weaviateKey),
      headers: {
        "X-Openai-Api-Key": process.env.OPENAI_APIKEY as string,
      },
    });
  }
  return client;
}
export async function GET() {
  try {
    const client = await getWeaviateClient();
    const collectionEntries = client.collections.get("HonoraryStreet");

    let results: StreetNameEntry[] = [];

    for await (const entry of collectionEntries.iterator()) {
      const parsedEntry: StreetNameEntry = {
        record_id: String(entry.properties.record_id || ""),
        honorary_name: String(entry.properties.honorary_name || ""),
        borough: String(entry.properties.borough || ""),
        type: entry.properties.type as "line" | "point",
        bio: String(entry.properties.bio || ""),
        limits: String(entry.properties.limits || ""),
        geolocation: {
          latitude: Number(entry.properties.latitude || 0),
          longitude: Number(entry.properties.longitude || 0),
        },
      };
      results.push(parsedEntry);
    }

    console.log(results, "initial load");

    client.close();
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Weaviate fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
