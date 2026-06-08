import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey && apiKey !== 'your-gemini-api-key' ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(request: Request) {
  try {
    const { pollTitle, options, totalVotes } = await request.json();

    if (!pollTitle || !options || !Array.isArray(options)) {
      return NextResponse.json({ error: 'Poll details are required' }, { status: 400 });
    }

    // Sort options to find the winner
    const sorted = [...options].sort((a: { votes: number }, b: { votes: number }) => b.votes - a.votes);
    const winner = sorted[0];

    // 1. Mock Fallback if Gemini is not configured
    if (!genAI) {
      console.log('Gemini API key not configured. Using Mock Poll Insights Fallback.');
      
      if (!winner || winner.votes === 0) {
        return NextResponse.json({ insight: 'No votes have been cast yet to generate insights.' });
      }

      const insight = `"${winner.text}" leads with ${winner.votes} out of ${totalVotes} votes, demonstrating a clear preference.`;
      return NextResponse.json({ insight });
    }

    // 2. Real Gemini poll insights query
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const optionsText = options
      .map((opt: { text: string; votes: number }) => `- "${opt.text}": ${opt.votes} votes`)
      .join('\n');

    const prompt = `You are a data analyst reviewing real-time poll results. Here is the data:
Poll Title: "${pollTitle}"
Total Votes Cast: ${totalVotes}
Options and vote distribution:
${optionsText}

Write a single-sentence takeaway (under 25 words) explaining the main trend. What does the leading option suggest about the audience? Keep it concise and professional.`;

    const result = await model.generateContent(prompt);
    const insight = result.response.text().trim();

    return NextResponse.json({ insight });
  } catch (err) {
    console.error('Poll Insights API Error:', err);
    return NextResponse.json({ error: 'Failed to generate poll insights' }, { status: 500 });
  }
}
