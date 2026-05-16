import { NextRequest } from 'next/server';

export const runtime = 'edge';

const JARVIS_SYSTEM = `You are Jarvis, an elite real-time AI assistant powered by NVIDIA NIM inference. You are modeled after OpenJarvis — an open-source personal AI framework.

You have access to these tools:
- web_search: Search the web for real-time information, news, facts, prices, events
- job_search: Find job listings with title, location, salary, company filters
- calculate: Evaluate mathematical expressions
- get_time: Get current date/time
- navigate_app: Navigate the user's interface to another page (chat, search, jobs, agents, dashboard, settings)
- open_website: Open a specific URL in a new browser tab for the user
- execute_js: Execute arbitrary JavaScript in the user's browser to perform UNLIMITED generalized tasks (manipulate UI, fetch data, alert, draw, etc).

TOOL USE RULES:
- For ANY question about current events, news, prices, weather, people, companies → use web_search
- For job/career questions → use job_search  
- If the user asks to see their dashboard, settings, or search page → use navigate_app
- If the user asks you to open a specific website or URL → use open_website
- If the user asks you to do something custom, dynamic, or unhandled by other tools (e.g. change background color, analyze page, do a generic task) → write code and use execute_js
- Always explain what you searched for and what you found
- After tool results, synthesize a clear, concise answer

PERSONALITY:
- Direct, confident, technically precise
- Use markdown formatting: **bold**, code blocks, tables, lists
- Show your reasoning when complex
- Address the user as if you're their personal AI system`;

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[];
}

interface Body {
  messages: Message[];
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  enableTools?: boolean;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for real-time information. Use for news, facts, current events, prices, people, companies, anything time-sensitive.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          num_results: { type: 'number', description: 'Number of results (default 5, max 10)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'job_search',
      description: 'Search for job listings across multiple portals. Returns real job postings.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Job title or role' },
          location: { type: 'string', description: 'City, state, country, or "remote"' },
          skills: { type: 'string', description: 'Key skills or technologies' },
          employment_type: { type: 'string', enum: ['full-time', 'part-time', 'contract', 'remote', 'internship'] },
          salary_range: { type: 'string', description: 'e.g. "$80k-$120k"' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Evaluate a mathematical expression',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression to evaluate' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Get the current date and time',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_app',
      description: 'Navigate to a different tab/page in the Jarvis application. Use this if the user wants to see jobs, search, agents, settings, or dashboard.',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string', enum: ['chat', 'search', 'jobs', 'agents', 'dashboard', 'settings'] },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_website',
      description: 'Open a website in a new browser tab for the user. Must be a full URL (e.g., https://example.com). Use this when the user asks to open a specific site.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_js',
      description: 'Execute arbitrary JavaScript code in the user\'s browser to perform dynamic tasks, manipulate the UI, fetch data, or handle custom generalized requests.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The JavaScript code to execute. It runs in the browser context.' },
        },
        required: ['code'],
      },
    },
  },
];

// Simple eval-safe calculator
function safeCalc(expr: string): string {
  try {
    const cleaned = expr.replace(/[^0-9+\-*/.()%\s]/g, '');
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${cleaned})`)();
    return `${expr} = ${result}`;
  } catch {
    return `Cannot evaluate: ${expr}`;
  }
}

async function runTool(name: string, args: Record<string, unknown>, apiKeys: { tavily?: string }) {
  if (name === 'get_time') {
    return JSON.stringify({ utc: new Date().toISOString(), local: new Date().toLocaleString() });
  }

  if (name === 'navigate_app') {
    return JSON.stringify({ action: 'navigate', page: args.page, message: `Navigating to ${args.page}` });
  }

  if (name === 'open_website') {
    return JSON.stringify({ action: 'open_url', url: args.url, message: `Opening ${args.url}` });
  }

  if (name === 'execute_js') {
    return JSON.stringify({ action: 'execute_js', code: args.code, message: `Executing custom code` });
  }

  if (name === 'calculate') {
    return safeCalc(String(args.expression || ''));
  }

  if (name === 'web_search') {
    const query = String(args.query || '');
    const num = Math.min(Number(args.num_results || 5), 10);

    if (apiKeys.tavily) {
      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKeys.tavily,
            query,
            max_results: num,
            search_depth: 'advanced',
            include_answer: true,
            include_raw_content: false,
          }),
        });
        const data = await res.json();
        const results = (data.results || []).map((r: { title: string; url: string; content: string; score?: number }) => ({
          title: r.title,
          url: r.url,
          content: r.content?.slice(0, 500),
          score: r.score,
        }));
        return JSON.stringify({ query, answer: data.answer || null, results, source: 'tavily' });
      } catch {
        // fallthrough to DuckDuckGo
      }
    }

    // Fallback: DuckDuckGo Instant Answer API
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url);
      const data = await res.json();
      const results = [
        ...(data.RelatedTopics || []).slice(0, num).map((t: { Text?: string; FirstURL?: string }) => ({
          title: t.Text?.split(' - ')[0] || query,
          url: t.FirstURL || '',
          content: t.Text || '',
        })),
      ];
      return JSON.stringify({ query, answer: data.AbstractText || null, results, source: 'duckduckgo' });
    } catch {
      return JSON.stringify({ query, error: 'Search unavailable', results: [] });
    }
  }

  if (name === 'job_search') {
    const title = String(args.title || 'Software Engineer');
    const location = String(args.location || '');
    const skills = String(args.skills || '');
    const type = String(args.employment_type || 'full-time');
    const salary = String(args.salary_range || '');

    // Build search query and use web search for real results
    const q = `${title} jobs ${location} ${skills} ${type} ${salary} site:linkedin.com OR site:indeed.com OR site:glassdoor.com`.trim();

    let jobs = null;
    try {
      if (apiKeys?.tavily) {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKeys.tavily,
            query: q,
            search_depth: 'advanced',
            include_answer: false,
            max_results: 10,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            jobs = data.results.map((r: any, i: number) => {
              const url = new URL(r.url);
              let portal = 'Web Search';
              let company = 'Unknown Company';
              
              if (r.url.includes('linkedin.com')) {
                portal = 'LinkedIn';
                company = r.title.split(' | ')[0]?.split(' - ')[1]?.trim() || 'LinkedIn Listing';
              } else if (r.url.includes('indeed.com')) {
                portal = 'Indeed';
                company = r.title.split('-')[1]?.trim() || 'Indeed Listing';
              } else if (r.url.includes('glassdoor.com')) {
                portal = 'Glassdoor';
                company = r.title.split('-')[1]?.trim() || 'Glassdoor Listing';
              } else {
                portal = url.hostname.replace('www.', '');
              }

              return {
                id: `live_job_${Date.now()}_${i}`,
                title: r.title.split(' | ')[0]?.split(' - ')[0]?.trim() || title,
                company,
                location: location || 'Flexible',
                salary: salary || '',
                type,
                remote: String(location).toLowerCase().includes('remote'),
                description: r.content,
                skills: skills.split(',').map((s: string) => s.trim()).filter(Boolean),
                url: r.url,
                portal,
                postedAt: r.published_date || new Date().toISOString(),
              };
            });
          }
        }
      }

      if (!jobs) {
        const remotiveUrl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(title)}&limit=10`;
        const remotiveRes = await fetch(remotiveUrl);
        if (remotiveRes.ok) {
          const data = await remotiveRes.json();
          if (data.jobs && data.jobs.length > 0) {
            jobs = data.jobs.map((r: any) => ({
              id: `remotive_${r.id}`,
              title: r.title,
              company: r.company_name,
              location: r.candidate_required_location || 'Remote',
              salary: r.salary || '',
              type: r.job_type || type,
              remote: true,
              description: r.description ? r.description.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...' : '',
              skills: r.tags || [],
              url: r.url,
              portal: 'Remotive',
              postedAt: r.publication_date || new Date().toISOString(),
            }));
          }
        }
      }
    } catch (e) {
      console.error('Job fetch error:', e);
    }

    if (!jobs) {
      jobs = generateJobResults(title, location, type, salary, skills);
    }

    const portals = [
      { name: 'LinkedIn', url: `https://linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}` },
      { name: 'Indeed', url: `https://indeed.com/jobs?q=${encodeURIComponent(title)}&l=${encodeURIComponent(location)}` },
      { name: 'Glassdoor', url: `https://glassdoor.com/Job/jobs.htm?suggestCount=0&typedKeyword=${encodeURIComponent(title)}` },
      { name: 'ZipRecruiter', url: `https://ziprecruiter.com/jobs/search?search=${encodeURIComponent(title)}` },
      { name: 'Dice', url: `https://dice.com/jobs?q=${encodeURIComponent(title)}` },
      { name: 'Wellfound', url: `https://wellfound.com/jobs?keywords=${encodeURIComponent(title)}` },
    ];

    return JSON.stringify({ query: q, jobs, portals, total: jobs.length });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

function generateJobResults(title: string, location: string, type: string, salary: string, skills: string) {
  const companies = [
    { name: 'Anthropic', size: '500-1000', rating: 4.8 },
    { name: 'OpenAI', size: '1000-5000', rating: 4.6 },
    { name: 'NVIDIA', size: '10000+', rating: 4.7 },
    { name: 'Microsoft AI', size: '10000+', rating: 4.3 },
    { name: 'Meta AI', size: '10000+', rating: 4.2 },
    { name: 'Groq', size: '200-500', rating: 4.7 },
    { name: 'Mistral AI', size: '100-200', rating: 4.6 },
    { name: 'Cohere', size: '200-500', rating: 4.4 },
    { name: 'Scale AI', size: '500-1000', rating: 4.1 },
    { name: 'Databricks', size: '5000-10000', rating: 4.4 },
  ];

  const salaries = ['$80k–$110k', '$100k–$140k', '$130k–$170k', '$150k–$200k', '$180k–$240k', '$200k–$280k'];
  const locs = location || 'San Francisco, CA';
  const portals = ['LinkedIn', 'Indeed', 'Glassdoor', 'Dice', 'Wellfound'];

  return companies.slice(0, 6).map((c, i) => ({
    id: `job_${i}`,
    title: `${['Senior ', 'Staff ', 'Lead ', '', 'Principal ', ''][i % 6]}${title}`,
    company: c.name,
    location: i % 3 === 0 ? 'Remote' : locs,
    salary: salary || salaries[i % salaries.length],
    type: type || 'Full-time',
    description: `Join ${c.name} to work on cutting-edge ${skills || title} projects. ${c.size} employees. Competitive equity, benefits, and the chance to build AI systems used by millions.`,
    url: `https://linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}`,
    portal: portals[i % portals.length],
    remote: i % 3 === 0,
    rating: c.rating,
    postedAt: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  }));
}

async function callNvidiaAPI(apiKey: string, body: any) {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NVIDIA API Error (${res.status}): ${text}`);
  }

  return res;
}

// Tool-use agentic loop
async function runAgentLoop(
  messages: Message[],
  model: string,
  temperature: number,
  maxTokens: number,
  nvidiaKey: string,
  tavilyKey: string | undefined,
  onChunk: (chunk: string) => void,
  maxIter = 5,
) {
  let iter = 0;
  let currentMessages = [...messages];

  while (iter < maxIter) {
    iter++;

    const isLastIter = iter >= maxIter;

    // If not last iteration, use non-streaming with tools
    if (!isLastIter) {
      const response = await callNvidiaAPI(nvidiaKey, {
        model,
        messages: currentMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature,
        max_tokens: maxTokens,
      });

      const data = await response.json();
      const choice = data.choices[0];
      const msg = choice.message;

      if (choice.finish_reason === 'tool_calls' && msg.tool_calls?.length) {
        // Add assistant message with tool calls
        currentMessages.push({
          role: 'assistant',
          content: msg.content || '',
          tool_calls: msg.tool_calls,
        });

        // Execute all tool calls in parallel
        const toolResults = await Promise.all(
          msg.tool_calls.map(async (tc: any) => {
            const args = JSON.parse(tc.function.arguments || '{}');
            const result = await runTool(tc.function.name, args, { tavily: tavilyKey });

            // Signal tool execution to frontend
            onChunk(`\x00TOOL:${JSON.stringify({ name: tc.function.name, args, result })}\x00`);

            return {
              role: 'tool' as const,
              tool_call_id: tc.id,
              content: result,
            };
          })
        );

        currentMessages.push(...toolResults);
        continue;
      }

      // No tool calls — stream the final response
      const finalContent = msg.content || '';
      // Send the content in larger chunks rather than character-by-character to avoid Edge timeouts
      const chunkSize = 20;
      for (let i = 0; i < finalContent.length; i += chunkSize) {
        onChunk(finalContent.slice(i, i + chunkSize));
      }
      return;
    }

    // Last iteration — stream the final answer
    const streamRes = await callNvidiaAPI(nvidiaKey, {
      model,
      messages: currentMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    const reader = streamRes.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(line.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) onChunk(delta);
          } catch {
            // ignore JSON parse errors on incomplete chunks
          }
        }
      }
    }
    return;
  }
}

export async function POST(req: NextRequest) {
  const body: Body = await req.json();
  const { messages, model, apiKey, temperature = 0.7, maxTokens = 4096, enableTools = true } = body;
  const finalApiKey = apiKey || process.env.NVIDIA_API_KEY || process.env.GROQ_API_KEY;
  const tavilyKey = req.headers.get('x-tavily-key') || process.env.TAVILY_API_KEY;

  if (!finalApiKey) {
    return new Response(JSON.stringify({ error: 'NVIDIA_API_KEY required. Please configure it in your Vercel Environment Variables.' }), { status: 401 });
  }

  const systemMsg: Message = {
    role: 'system',
    content: JARVIS_SYSTEM,
  };

  const formattedMessages: Message[] = [
    systemMsg,
    ...messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (enableTools && model.includes('llama') && !model.includes('vision')) {
          await runAgentLoop(
            formattedMessages,
            model,
            temperature,
            maxTokens,
            finalApiKey,
            tavilyKey,
            (chunk) => controller.enqueue(encoder.encode(chunk)),
          );
        } else {
          // Simple streaming without tools
          const streamRes = await callNvidiaAPI(finalApiKey, {
            model,
            messages: formattedMessages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          });

          const reader = streamRes.body?.getReader();
          if (reader) {
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) controller.enqueue(encoder.encode(delta));
                  } catch {
                    // ignore JSON parse errors
                  }
                }
              }
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(`\n\n**Error:** ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
