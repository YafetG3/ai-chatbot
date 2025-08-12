import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { RawEvent } from '@/lib/services/apify';
import { analyzeStudentPostRelevance } from './studentPostAnalyzer';

// Analysis schema for user queries
const QueryAnalysisSchema = z.object({
  location: z.string().nullable(),
  eventType: z.array(z.string()).nullable(),
  targetAudience: z.array(z.string()).nullable(),
  searchKeywords: z.array(z.string()),
  isEventSearch: z.boolean(),
});

// Event analysis schema for scraped posts
const EventAnalysisSchema = z.object({
  isStudentEvent: z.boolean(),
  title: z.string(),
  description: z.string(),
  eventType: z.array(z.string()),
  targetAudience: z.array(z.string()),
  relevance: z.number().min(0).max(1),
  eventDate: z.string().nullable(),
  price: z.string().nullable(),
  dataQuality: z.enum(['high', 'medium', 'low']),
  verificationNotes: z.string(),
});

// Enhanced event interface
export interface EnhancedEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  platform: string;
  sourceUrl: string;
  relevance: number;
  eventType: string[];
  targetAudience: string[];
  eventDate: string | null;
  price: string | null;
  dataQuality: 'high' | 'medium' | 'low';
  verificationNotes: string;
  originalData: RawEvent;
}

/**
 * Step 1: Analyze user query to determine if it's an event search
 */
export async function analyzeUserQuery(userQuery: string): Promise<{
  location: string | null;
  eventType: string[] | null;
  targetAudience: string[] | null;
  searchKeywords: string[];
  isEventSearch: boolean;
}> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt: `Analyze this user request and extract structured information. The user is asking for travel/event recommendations, so be flexible in your interpretation:

User Request: "${userQuery}"

Extract and return ONLY valid JSON:
{
  "location": string | null,
  "eventType": string[] | null,
  "targetAudience": string[] | null,
  "searchKeywords": string[],
  "isEventSearch": boolean
}

Guidelines:
- location: Extract ANY location mentioned (city, country, neighborhood, area) - don't limit to specific cities
- eventType: Extract ANY type of activity, place, or event mentioned (bars, restaurants, clubs, museums, parks, etc.)
- targetAudience: Extract WHO this is for (students, travelers, young people, etc.) - be flexible
- searchKeywords: Key terms that would be useful for searching social media posts
- isEventSearch: true if they're asking about places to go, things to do, or activities (be generous in interpretation)

Examples:
- "where do undergraduates go for bars in kenya" → location: "kenya", eventType: ["bars"], targetAudience: ["undergraduates", "students"], isEventSearch: true
- "best places to eat in tokyo" → location: "tokyo", eventType: ["restaurants", "food"], targetAudience: null, isEventSearch: true
- "student life in paris" → location: "paris", eventType: null, targetAudience: ["students"], isEventSearch: true
- "what's fun to do in a small town in norway" → location: "norway", eventType: null, targetAudience: null, isEventSearch: true

Be flexible and don't require specific keywords to be present. If the user is asking about ANYTHING related to places, activities, or recommendations, set isEventSearch to true.`,
      schema: QueryAnalysisSchema,
    });

    return result.object;
  } catch (error) {
    console.error('Query analysis failed:', error);
    // If AI fails, return a default that will still allow the system to work
    return {
      location: null,
      eventType: null,
      targetAudience: null,
      searchKeywords: userQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2),
      isEventSearch: true, // Default to true to be generous
    };
  }
}

/**
 * Step 2: Analyze scraped social media posts for relevance
 */
export async function analyzeScrapedEvents(
  posts: RawEvent[],
  userQuery: string,
  searchParams: any,
): Promise<EnhancedEvent[]> {
  console.log(`🔍 Analyzing ${posts.length} scraped posts for relevance...`);
  
  const enhancedEvents: EnhancedEvent[] = [];
  const relevanceThreshold = 0.7;

  for (const post of posts) {
    try {
      const studentAnalysis = await analyzeStudentPostRelevance(post, userQuery);
      
      if (!studentAnalysis.isStudentRelevant || studentAnalysis.studentFriendlinessScore < 6) {
        console.log(`⏭️ Skipping post ${post.id}: Not student-relevant (score: ${studentAnalysis.studentFriendlinessScore})`);
        continue;
      }

      const analysis = await generateObject({
        model: openai('gpt-4o-mini'),
        prompt: `Analyze this social media post for relevance to the user's query:

POST: "${post.description}"
LOCATION: "${post.location}"
USER QUERY: "${userQuery}"

Rate relevance 0.0-1.0 based on how well this post matches what the user is looking for.
Be strict - only high relevance (0.7+) should be included.

Return JSON with:
{
  "isStudentEvent": boolean,
  "title": string,
  "description": string,
  "eventType": string[],
  "targetAudience": string[],
  "relevance": number (0.0-1.0),
  "eventDate": string | null,
  "price": string | null,
  "dataQuality": "high" | "medium" | "low",
  "verificationNotes": string
}`,
        schema: EventAnalysisSchema,
      });

      const eventAnalysis = analysis.object;

      if (eventAnalysis.relevance >= relevanceThreshold) {
        enhancedEvents.push({
          id: post.id,
          title: eventAnalysis.title,
          description: eventAnalysis.description,
          location: post.location || 'Unknown',
          platform: post.platform,
          sourceUrl: post.sourceUrl,
          relevance: eventAnalysis.relevance,
          eventType: eventAnalysis.eventType,
          targetAudience: eventAnalysis.targetAudience,
          eventDate: eventAnalysis.eventDate,
          price: eventAnalysis.price,
          dataQuality: eventAnalysis.dataQuality,
          verificationNotes: `${eventAnalysis.verificationNotes} | Student score: ${studentAnalysis.studentFriendlinessScore}/10`,
          originalData: post,
        });
      } else {
        console.log(`⏭️ Skipping post ${post.id}: Low relevance (${eventAnalysis.relevance})`);
      }
    } catch (error) {
      console.error(`Failed to analyze post ${post.id}:`, error);
      continue;
    }
  }

  console.log(`✅ Found ${enhancedEvents.length} highly relevant events`);
  
  return enhancedEvents.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Step 3: Generate final response combining scraped events and AI recommendations
 */
export async function generateEventResponse(
  userQuery: string,
  searchParams: any,
  scrapedEvents: EnhancedEvent[],
): Promise<string> {
  try {
    let responsePrompt: string;

    if (scrapedEvents.length > 0) {
      // We have scraped events - let the AI incorporate them naturally
      const eventsContext = scrapedEvents
        .slice(0, 5) // Give AI more context with top 5 events
        .map((event) => ({
          title: event.title,
          description: event.description,
          location: event.location,
          platform: event.platform,
          relevance: event.relevance,
          eventType: event.eventType,
          sourceUrl: event.sourceUrl,
        }));

      responsePrompt = `You are Raava AI, a helpful assistant for student travelers. The user asked: "${userQuery}"

I found ${scrapedEvents.length} relevant posts/events from social media platforms that might help answer their question. Here's what I found:

${JSON.stringify(eventsContext, null, 2)}

Please provide a helpful response that:
1. Naturally incorporates the relevant scraped events I found (mention the platform and key details)
2. Provides additional helpful recommendations based on your knowledge
3. Addresses the user's specific question about "${userQuery}"
4. Sounds conversational and helpful, not like a data dump
5. If the scraped events aren't very relevant, acknowledge that but still try to help

Be specific, helpful, and conversational. Don't just list events - explain why they might be relevant to the user's question.`;
    } else {
      // No scraped events found - let AI provide helpful recommendations
      responsePrompt = `You are Raava AI, a helpful assistant for student travelers. The user asked: "${userQuery}"

I wasn't able to find specific social media posts or events that directly answer their question, but I can still help! Please provide:

1. 3-5 specific, helpful recommendations based on your knowledge
2. Explain why these recommendations would be good for the user's situation
3. Be specific about locations, types of places, or activities
4. Consider the user's context (students, travelers, etc.)
5. Sound helpful and conversational

Focus on being genuinely helpful rather than generic.`;
    }

    const response = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: responsePrompt,
      temperature: 0.7,
    });

    return response.text;
  } catch (error) {
    console.error('Response generation failed:', error);
    return fallbackResponse(userQuery, scrapedEvents);
  }
}

/**
 * Fallback methods when AI fails
 */
function fallbackResponse(
  userQuery: string,
  scrapedEvents: EnhancedEvent[],
): string {
  if (scrapedEvents.length > 0) {
    const eventsList = scrapedEvents
      .slice(0, 3)
      .map(
        (event) =>
          `- ${event.title} in ${event.location}: ${event.description}`,
      )
      .join('\n');

    return `Here are some events I found from students online:
${eventsList}

Here are some additional recommendations I came up with:
- Check out student discount nights at popular venues
- Join local student Facebook groups for event updates
- Visit university areas for student-friendly establishments`;
  } else {
    return `I couldn't find specific events for "${userQuery}", but here are some general recommendations:
- Check out student discount nights at popular venues
- Join local student Facebook groups for event updates
- Visit university areas for student-friendly establishments
- Use apps like Meetup to find local events
- Ask your university's international student office for recommendations`;
  }
}
