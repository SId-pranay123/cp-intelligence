import { NextRequest } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';

export async function POST(req: NextRequest) {
  const { conceptId, conceptName, strength } = await req.json();

  if (!conceptId || !conceptName) {
    return new Response(JSON.stringify({ error: 'Missing conceptId or conceptName' }), { status: 400 });
  }

  const prompt = `You are a competitive programming coach.
Explain the concept "${conceptName}" to a student whose current mastery is ${strength ?? 0}/100.

Structure your response as:

**What it is**
[2 sentences, plain English, no jargon]

**Key pattern**
[The template/approach to recognise and apply this — include pseudocode if helpful]

**Common pitfall**
[The mistake most people make at strength ~${strength ?? 0}]

**Where to start**
[One specific Codeforces problem name and number that is the best entry point]

Be direct and concrete. Assume the student knows basic programming.`;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: 600,
    }),
  });

  if (!groqRes.ok || !groqRes.body) {
    const err = await groqRes.text();
    return new Response(JSON.stringify({ error: err }), { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const text = json.choices?.[0]?.delta?.content ?? '';
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // skip malformed lines
            }
          }
        }
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
