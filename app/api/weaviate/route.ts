import { NextResponse } from "next/server";
import weaviate, { WeaviateClient } from "weaviate-client";
import type { StreetNameEntry } from "../../../types";

const weaviateURL = process.env.WEAVIATE_URL as string;
const weaviateKey = process.env.WEAVIATE_ADMIN_KEY as string;

let client: WeaviateClient | null = null;

// Update the response type to explicitly define geolocation structure
type WeaviateResponseObject = {
  properties: {
    record_id?: string;
    honorary_name?: string;
    borough?: string;
    type?: string;
    limits?: string;
    bio?: string;
    geometry_wkt?: string;
    geolocation?: { latitude: number; longitude: number };
  };
};

function parseWeaviateResults(
  results?: WeaviateResponseObject[]
): StreetNameEntry[] {
  if (!results?.length) return [];

  return results.map(({ properties }) => {
    const geolocation =
      typeof properties.geolocation === "object" &&
      properties.geolocation !== null
        ? properties.geolocation
        : { latitude: 0, longitude: 0 };

    return {
      record_id: String(properties.record_id || ""),
      honorary_name: String(properties.honorary_name || ""),
      borough: String(properties.borough || ""),
      type: (String(properties.type) || "point") as "line" | "point",
      limits: String(properties.limits || "N/A"),
      bio: String(properties.bio || "No biography available"),
      geometry_wkt: String(properties.geometry_wkt || ""),
      geolocation: {
        latitude: Number(geolocation.latitude),
        longitude: Number(geolocation.longitude),
      },
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
  try {
    const { searchTerms, location } = await req.json();
    const client = await getWeaviateClient();
    const collection = client.collections.get("HonoraryStreet");

    let results: WeaviateResponseObject[] = [];

    if (location !== "null") {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          location
        )}, NYC&format=json`
      );
      const geoData = await geoResponse.json();

      if (geoData.length > 0) {
        const { lat, lon } = geoData[0];
        const result = await collection.query.nearText(searchTerms, {
          filters: collection.filter.byProperty("geolocation").withinGeoRange({
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            distance: 1000,
          }),
        });
        results = result.objects || [];
      }
    } else {
      const result = await collection.query.hybrid(searchTerms, {
        alpha: 0.5,
        limit: 10,
      });
      results = result.objects || [];
    }

    return NextResponse.json({
      parsedEntries: parseWeaviateResults(results),
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
