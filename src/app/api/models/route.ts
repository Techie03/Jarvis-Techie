import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { apiKey } = await req.json().catch(() => ({}));
  const finalApiKey = apiKey || process.env.NVIDIA_API_KEY;
  if (!finalApiKey) return NextResponse.json({ models: [] });

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${finalApiKey}`,
        "Accept": "application/json",
      }
    });
    const list = await res.json();
    return NextResponse.json({ models: list.data || [] });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
