import { NextResponse } from "next/server";
import weaviate, { WeaviateClient } from "weaviate-client";
import { StreetNameEntry } from "../../../types";

const weaviateURL = process.env.WEAVIATE_URL as string;
const weaviateKey = process.env.WEAVIATE_ADMIN_KEY as string;

// Lazy initialization to prevent await errors in global scope
let client: WeaviateClient | null = null;

function parseWeaviateResults(results: any): StreetNameEntry[] {
  return results.map((obj: any) => {
    const props = obj.properties;

    return {
      record_id: props.record_id,
      honorary_name: props.honorary_name,
      borough: props.borough,
      type: props.type,
      limits: props.limits || "N/A",
      bio: props.bio || "No biography available",
      geometry_wkt: props.geometry_wkt,
      geolocation: props.geolocation || undefined,
    };
  });
}

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

export async function POST(req: Request) {
  const { searchTerms, location } = await req.json();

  try {
    const client = await getWeaviateClient();
    const collection = client.collections.get("HonoraryStreet");

    let parsedEntries: StreetNameEntry[] = [];

    if (location !== null) {
      // Convert location name to lat/lng using OpenStreetMap
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${location}, NYC&format=json`
      );
      const geoData = await geoResponse.json();

      if (geoData.length > 0) {
        const { lat, lon } = geoData[0];

        const result = await collection.query.nearText(searchTerms, {
          filters: collection.filter.byProperty("geolocation").withinGeoRange({
            latitude: lat,
            longitude: lon,
            distance: 1000,
          }),
        });
        parsedEntries = parseWeaviateResults(result.objects);
      } else {
        // Perform hybrid vector search
        const result = await collection.query.hybrid(searchTerms, {
          alpha: 0.5,
          limit: 10,
          returnMetadata: ["score", "explainScore"],
        });
        parsedEntries = parseWeaviateResults(result.objects);
      }

      return NextResponse.json({ parsedEntries });
    }
  } catch (error) {
    console.error("Weaviate API error:", error);
    return NextResponse.json(
      { error: "Weaviate query failed" },
      { status: 500 }
    );
  }
}
