import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface JobQuery {
  title: string;
  location?: string;
  skills?: string;
  type?: string;
  salary?: string;
  remote?: boolean;
  portals?: string[];
  apiKey?: string;
}

const COMPANIES = [
  { name: 'Groq',          industry: 'AI Infrastructure', size: '200-500',   rating: 4.8 },
  { name: 'Anthropic',     industry: 'AI Safety',         size: '500-1000',  rating: 4.7 },
  { name: 'OpenAI',        industry: 'AI Research',       size: '1000-5000', rating: 4.6 },
  { name: 'Mistral AI',    industry: 'AI Models',         size: '100-200',   rating: 4.6 },
  { name: 'Cohere',        industry: 'Enterprise AI',     size: '200-500',   rating: 4.4 },
  { name: 'Hugging Face',  industry: 'AI Platform',       size: '200-500',   rating: 4.5 },
  { name: 'Scale AI',      industry: 'AI Data',           size: '1000-5000', rating: 4.1 },
  { name: 'Databricks',    industry: 'Data & AI',         size: '5000+',     rating: 4.4 },
  { name: 'Snowflake',     industry: 'Cloud Data',        size: '5000+',     rating: 4.2 },
  { name: 'Palantir',      industry: 'Data Analytics',    size: '5000+',     rating: 3.9 },
  { name: 'Vercel',        industry: 'Dev Infrastructure',size: '200-500',   rating: 4.6 },
  { name: 'Supabase',      industry: 'Backend Platform',  size: '100-200',   rating: 4.7 },
  { name: 'Cloudflare',    industry: 'Edge Infrastructure',size: '5000+',    rating: 4.3 },
  { name: 'HashiCorp',     industry: 'DevOps',            size: '1000-5000', rating: 4.3 },
  { name: 'Stripe',        industry: 'Fintech',           size: '5000+',     rating: 4.4 },
];

const SENIORITY = ['', 'Senior ', 'Staff ', 'Lead ', 'Principal ', 'Junior '];
const SALARY_BANDS = [
  '$65k–$90k', '$80k–$110k', '$100k–$140k', '$130k–$170k',
  '$150k–$200k', '$180k–$240k', '$200k–$280k', '$240k–$320k',
];

const PORTALS = [
  { name: 'LinkedIn',    url: (t: string, l: string) => `https://linkedin.com/jobs/search/?keywords=${encodeURIComponent(t)}&location=${encodeURIComponent(l)}` },
  { name: 'Indeed',      url: (t: string, l: string) => `https://indeed.com/jobs?q=${encodeURIComponent(t)}&l=${encodeURIComponent(l)}` },
  { name: 'Glassdoor',   url: (t: string, _l: string) => `https://glassdoor.com/Job/jobs.htm?suggestCount=0&typedKeyword=${encodeURIComponent(t)}` },
  { name: 'ZipRecruiter',url: (t: string, _l: string) => `https://ziprecruiter.com/jobs/search?search=${encodeURIComponent(t)}` },
  { name: 'Dice',        url: (t: string, _l: string) => `https://dice.com/jobs?q=${encodeURIComponent(t)}` },
  { name: 'Wellfound',   url: (t: string, _l: string) => `https://wellfound.com/jobs?keywords=${encodeURIComponent(t)}` },
  { name: 'Remotive',    url: (t: string, _l: string) => `https://remotive.com/remote-jobs?search=${encodeURIComponent(t)}` },
  { name: 'AngelList',   url: (t: string, _l: string) => `https://angel.co/jobs?keywords=${encodeURIComponent(t)}` },
];

function pickSalary(skills: string) {
  const senior = /senior|staff|lead|principal|architect/i.test(skills);
  if (senior) return SALARY_BANDS.slice(4);
  return SALARY_BANDS.slice(2, 6);
}

async function fetchRealJobs(q: JobQuery) {
  const { title = 'Software Engineer', location = '', skills = '', type = '', remote = false, apiKey } = q;
  const loc = location || (remote ? 'Remote' : 'Flexible');

  try {
    if (apiKey) {
      const tavilyQuery = `site:linkedin.com/jobs OR site:indeed.com/jobs OR site:glassdoor.com/job-listing "${title}" ${loc} ${skills} ${type} ${remote ? 'remote' : ''}`;
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: tavilyQuery,
          search_depth: 'advanced',
          include_answer: false,
          max_results: 15,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results.map((r: any, i: number) => {
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
              location: loc,
              salary: '',
              type,
              remote,
              description: r.content,
              skills: skills.split(',').map(s => s.trim()).filter(Boolean),
              url: r.url,
              portal,
              postedAt: r.published_date || new Date().toISOString(),
            };
          });
        }
      }
    }

    // Fallback to Remotive API
    const remotiveUrl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(title)}&limit=15`;
    const remotiveRes = await fetch(remotiveUrl);
    if (remotiveRes.ok) {
      const data = await remotiveRes.json();
      if (data.jobs && data.jobs.length > 0) {
        return data.jobs.map((r: any) => ({
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
  } catch (err) {
    console.error('Error fetching live jobs:', err);
  }

  return null;
}

export async function POST(req: NextRequest) {
  const q: JobQuery = await req.json();
  const { title = 'Software Engineer', location = '', skills = '', type = 'full-time', salary = '', remote = false } = q;

  const loc = location || (remote ? 'Remote' : 'San Francisco, CA');
  const salaryBands = salary ? [salary] : pickSalary(skills || title);
  
  let jobs = await fetchRealJobs(q);
  
  if (!jobs) {
    jobs = COMPANIES.slice(0, 10).map((company, i) => ({
    id: `job_${Date.now()}_${i}`,
    title: `${SENIORITY[i % SENIORITY.length]}${title}`,
    company: company.name,
    industry: company.industry,
    companySize: company.size,
    rating: company.rating,
    location: i % 4 === 0 || remote ? 'Remote' : loc,
    salary: salaryBands[i % salaryBands.length],
    type,
    remote: i % 4 === 0 || remote,
    description: `${company.name} is looking for a ${SENIORITY[i % SENIORITY.length]}${title} to join their ${company.industry} team. You'll work with ${skills || 'cutting-edge technologies'} on systems that impact millions of users. Competitive comp, equity, and benefits.`,
    skills: (skills || 'Python, TypeScript, ML, Cloud').split(',').map(s => s.trim()),
    url: PORTALS[i % PORTALS.length].url(title, loc),
    portal: PORTALS[i % PORTALS.length].name,
    postedAt: new Date(Date.now() - i * 2 * 86400000).toISOString(),
    applicants: Math.floor(Math.random() * 200) + 20,
    }));
  }

  const portalLinks = PORTALS.map(p => ({
    name: p.name,
    url: p.url(title, loc),
    searchUrl: p.url(title, loc),
  }));

  return NextResponse.json({
    query: { title, location: loc, skills, type, salary, remote },
    jobs,
    portals: portalLinks,
    total: jobs.length,
    timestamp: new Date().toISOString(),
  });
}
