import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey && apiKey !== 'your-gemini-api-key' ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const { questions } = await request.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Questions list is required' }, { status: 400 });
    }

    // 1. Mock Fallback if Gemini is not configured
    if (!genAI) {
      console.log('Gemini API key not configured. Using Mock Summarizer Fallback.');
      
      const qCount = questions.length;
      
      const summaryList = [
        `• Theme 1 (Popularity: High): Attendees are actively asking about project setup parameters and framework configuration.`,
        `• Theme 2 (Popularity: Medium): General questions concerning the integration of the database, Supabase Realtime, and state sync.`,
        `• Theme 3 (Audience Size: ${qCount} questions): Queries around AI services, moderation rules, and Vercel compatibility.`
      ];

      return NextResponse.json({ summary: summaryList.join('\n') });
    }

    // 2. Real Gemini summarization query
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Sort questions by popularity before sending to give LLM better context
    const sortedQuestions = [...questions].sort((a: { votes_count?: number }, b: { votes_count?: number }) => (b.votes_count || 0) - (a.votes_count || 0));
    
    const questionsText = sortedQuestions
      .map((q: { votes_count?: number; content: string }, idx: number) => `${idx + 1}. [Upvotes: ${q.votes_count || 0}] ${q.content}`)
      .join('\n');

    const prompt = `You are an assistant summarizing questions asked during a live presentation. Below is a list of questions submitted by the audience, ordered by popularity (upvotes).

Summarize these questions into exactly 3 bullet points. Focus on:
- What are the major themes or topics of interest?
- What are the most popular concerns?
- Group similar questions together.

Keep the summary concise, professional, and clear. Each bullet point should be a single, descriptive sentence.

Here are the questions:
${questionsText}`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Summary API Error:', err);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
