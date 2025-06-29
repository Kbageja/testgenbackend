import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({
  model: 'models/gemini-1.5-flash',
});

export const generateQuestions = async ({ subject, mcqCount, shortAnswerCount, difficulty, educationLevel, prompt }) => {
  const promptText = `You are an expert test creator. Create ${mcqCount} MCQs and ${shortAnswerCount} short answer questions based on the prompt "${prompt}" with subject "${subject}".
Difficulty: ${difficulty}
Education Level: ${educationLevel}
Return only JSON in the following format (do not add any explanations or markdown):

{
  "mcqs": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "..."
    }
  ],
  "shortAnswers": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}
`;

  try {
    const result = await geminiModel.generateContent(promptText);
    let rawText = await result.response.text();

    // Remove markdown backticks and extract JSON only
    rawText = rawText.replace(/```(?:json)?/g, '').trim();

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Gemini response');

    const jsonString = jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    // Optional: Validate shape
    if (!parsed.mcqs || !parsed.shortAnswers) {
      throw new Error('Response JSON missing required fields');
    }

    return parsed;
  } catch (err) {
    console.error('❌ Error from Gemini:', err.message);
    throw new Error('Failed to generate or parse questions from Gemini');
  }
};
