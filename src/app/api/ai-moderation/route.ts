import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey && apiKey !== 'your-gemini-api-key' ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const textToAnalyze = content.trim();

    // 1. Mock Fallback if Gemini is not configured
    if (!genAI) {
      console.log('Gemini API key not configured. Using Mock Moderation Fallback.');
      
      const lower = textToAnalyze.toLowerCase();
      const forbiddenWords = ['spam', 'toxic', 'abuse', 'kill', 'hate', 'stupid', 'idiot', 'scam', 'crypto buy'];
      const flaggedWord = forbiddenWords.find(word => lower.includes(word));
      
      if (flaggedWord) {
        return NextResponse.json({
          approved: false,
          reason: `Contains inappropriate language or terms ("${flaggedWord}")`
        });
      }
      
      return NextResponse.json({ approved: true, reason: '' });
    }

    // 2. Real Gemini moderation query
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are a moderator for a live Q&A session. Analyze this question submitted by an attendee:
"${textToAnalyze}"

Decide if it is appropriate. It should be REJECTED (approved: false) if it is:
- Severe toxicity, hate speech, threats, or harassment.
- Heavy profanity or inappropriate sexual references.
- Spam, advertisements, or promotional links.
- Gibberish (random keystrokes, e.g. "asdfghjk" or "123123123").

Otherwise, it should be APPROVED (approved: true).

Respond ONLY with a JSON object. Do not include markdown code block formatting (like \`\`\`json). The JSON must match this structure:
{
  "approved": boolean,
  "reason": "short 3-8 word explanation of why it was rejected, or empty if approved"
}`;

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

    const moderation = JSON.parse(cleanJsonText);
    return NextResponse.json({
      approved: moderation.approved ?? true,
      reason: moderation.reason ?? ''
    });
  } catch (err) {
    console.error('Moderation API Error:', err);
    // Graceful fallback to approval on server error so user isn't blocked
    return NextResponse.json({ approved: true, reason: 'Moderation error bypassed' });
  }
}
