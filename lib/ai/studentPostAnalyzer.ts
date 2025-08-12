import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { RawEvent } from '../services/apify';

const StudentPostAnalysisSchema = z.object({
  isStudentRelevant: z.boolean(),
  studentFriendlinessScore: z.number().min(0).max(10),
  studyAbroadRelevance: z.number().min(0).max(10),
  criteria: z.object({
    budgetFriendly: z.boolean(),
    ageAppropriate: z.boolean(),
    safetyConsidered: z.boolean(),
    culturallyAccessible: z.boolean(),
    studentCommunityPresent: z.boolean(),
    transportationAccessible: z.boolean(),
  }),
  reasoning: z.string(),
});

export async function analyzeStudentPostRelevance(
  event: RawEvent,
  userQuery: string
): Promise<{
  isStudentRelevant: boolean;
  studentFriendlinessScore: number;
  studyAbroadRelevance: number;
  reasoning: string;
}> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: StudentPostAnalysisSchema,
      prompt: `Analyze this social media post to determine if it's relevant for international students studying abroad.

Post Details:
- Title: ${event.title}
- Description: ${event.description}
- Location: ${event.location}
- Platform: ${event.platform}
- User Query: ${userQuery}

Evaluate based on these criteria:
1. Budget-friendly: Affordable for students (free, cheap, student discounts)
2. Age-appropriate: Suitable for 18-25 year olds
3. Safety: Safe environment, well-lit areas, reputable venues
4. Cultural accessibility: Welcoming to international students, language-friendly
5. Student community: Likely to have other students present
6. Transportation: Accessible by public transport or walking

**Special consideration for Reddit content:**
- Reddit posts with high upvotes/comments indicate community trust
- Look for authentic user experiences and recommendations
- Posts asking for student advice or sharing student experiences are highly relevant
- Comments providing specific recommendations are valuable

Scoring:
- isStudentRelevant: true if this would be useful/relevant for students
- studentFriendlinessScore: 0-10 overall suitability for students
- studyAbroadRelevance: 0-10 specific relevance for study abroad students
- reasoning: explain your assessment

Be strict - only mark as student-relevant if it genuinely serves student needs and interests.`,
    });

    return {
      isStudentRelevant: result.object.isStudentRelevant,
      studentFriendlinessScore: result.object.studentFriendlinessScore,
      studyAbroadRelevance: result.object.studyAbroadRelevance,
      reasoning: result.object.reasoning,
    };
  } catch (error) {
    console.error('Student post analysis failed:', error);
    return analyzeStudentPostFallback(event);
  }
}

function analyzeStudentPostFallback(event: RawEvent): {
  isStudentRelevant: boolean;
  studentFriendlinessScore: number;
  studyAbroadRelevance: number;
  reasoning: string;
} {
  const text = `${event.title} ${event.description}`.toLowerCase();
  
  const studentKeywords = ['student', 'university', 'college', 'cheap', 'free', 'discount', 'young', 'international'];
  const hasStudentKeywords = studentKeywords.some(keyword => text.includes(keyword));
  
  const eventKeywords = ['party', 'bar', 'club', 'meetup', 'event', 'activity'];
  const hasEventKeywords = eventKeywords.some(keyword => text.includes(keyword));
  
  const isRelevant = hasStudentKeywords && hasEventKeywords;
  
  return {
    isStudentRelevant: isRelevant,
    studentFriendlinessScore: isRelevant ? 7 : 4,
    studyAbroadRelevance: isRelevant ? 6 : 3,
    reasoning: `Fallback analysis: ${hasStudentKeywords ? 'Contains student keywords' : 'No student keywords'}, ${hasEventKeywords ? 'Contains event keywords' : 'No event keywords'}`,
  };
}
