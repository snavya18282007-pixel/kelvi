import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey && apiKey !== 'your-gemini-api-key' ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const { questions } = await request.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ keywords: ['Next.js 15', 'Supabase', 'Realtime', 'Gemini AI'] });
    }

    // 1. Mock Fallback if Gemini is not configured
    if (!genAI) {
      // Pick dynamic keywords based on contents of questions
      const text = questions.map(q => q.content.toLowerCase()).join(' ');
      const candidates = [
        { word: 'Supabase', match: ['db', 'database', 'supabase', 'postgres', 'sql'] },
        { word: 'Gemini AI', match: ['gemini', 'ai', 'moderation', 'summary', 'intelligence'] },
        { word: 'Realtime', match: ['realtime', 'live', 'sync', 'socket', 'instant'] },
        { word: 'Auth', match: ['auth', 'login', 'signup', 'user', 'session'] },
        { word: 'Next.js 15', match: ['next', 'react', 'router', 'frontend', 'app'] },
      ];
      
      const found = candidates
        .filter(c => c.match.some(m => text.includes(m)))
        .map(c => c.word);

      // Default keywords if none matched
      const keywords = found.length >= 2 ? found : ['Supabase', 'Gemini AI', 'Realtime', 'Next.js 15'];
      return NextResponse.json({ keywords });
    }

    // 2. Real Gemini keywords extraction query
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const questionsText = questions.map((q: { content: string }) => q.content).join('\n');
    
    const prompt = `Analyze this list of questions submitted by an audience:
${questionsText}

Extract 4-5 distinct, short (1-2 words) topic keywords or search terms that represent the main topics being discussed. These will be shown as clickable pills to filter the questions list.

Respond ONLY with a JSON array of strings. Do not include markdown code block formatting (like \`\`\`json).
Example response: ["Authentication", "Supabase", "Deployments", "Gemini"]`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = result.response.text().trim();
    
    // Parse response
    let cleanJsonText = responseText;
    if (cleanJsonText.startsWith('```json')) {
      cleanJsonText = cleanJsonText.substring(7, cleanJsonText.length - 3).trim();
    } else if (cleanJsonText.startsWith('```')) {
      cleanJsonText = cleanJsonText.substring(3, cleanJsonText.length - 3).trim();
    }

    const keywords = JSON.parse(cleanJsonText);
    return NextResponse.json({ keywords: Array.isArray(keywords) ? keywords : [] });
  } catch (err) {
    console.error('Keywords API Error:', err);
    return NextResponse.json({ keywords: ['Next.js 15', 'Supabase', 'Realtime', 'Gemini AI'] });
  }
}
