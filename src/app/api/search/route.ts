import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { query, apiKey, maxResults = 8 } = await req.json();
  const finalApiKey = apiKey || process.env.TAVILY_API_KEY;

  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

  if (finalApiKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: finalApiKey,
          query,
          max_results: maxResults,
          search_depth: 'advanced',
          include_answer: true,
          include_raw_content: false,
          include_images: false,
        }),
      });
      const data = await res.json();
      return NextResponse.json({
        query,
        answer: data.answer || null,
        results: data.results || [],
        source: 'tavily',
      });
    } catch {
      // fallthrough
    }
  }

  // DuckDuckGo fallback
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = await res.json();

    const results = (data.RelatedTopics || []).slice(0, maxResults).map((t: { Text?: string; FirstURL?: string; Result?: string }) => ({
      title: (t.Text || '').split(' - ')[0] || query,
      url: t.FirstURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      content: t.Text || '',
      score: 0.5,
    }));

    return NextResponse.json({
      query,
      answer: data.AbstractText || null,
      results,
      source: 'duckduckgo',
    });
  } catch {
    return NextResponse.json({ query, error: 'Search failed', results: [] }, { status: 500 });
  }
}
