import { openai } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { RawEvent } from '../services/apify';

export interface FilteredEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  dateTime?: string;
  platform: string;
  sourceUrl: string;
  relevanceScore: number;
  isStudentFriendly: boolean;
  studentFriendlinessScore: number;
  eventType: string;
  confidence: number;
}

// AI-powered event relevance filtering
export async function filterEventsByRelevance(
  events: RawEvent[],
  originalQuery: string,
  location: string,
): Promise<FilteredEvent[]> {
  if (events.length === 0) return [];

  try {
    const response = await generateText({
      model: openai('gpt-4o'),
      prompt: `You are an expert at filtering and ranking events for international students studying abroad. 

Analyze each event and score it based on:
1. Relevance to the user's query (0-10)
2. Student-friendliness (0-10)
3. Event type categorization
4. Overall confidence in the event details

Return a JSON array with filtered and scored events. Only include events with relevance score > 6.

Consider:
- Does this match what the user is looking for?
- Is this suitable for students (budget, safety, accessibility)?
- Is this actually an event or just a general post?
- Are the details clear and trustworthy?

Format each event as:
{
  "id": "original_id",
  "title": "cleaned_title",
  "description": "cleaned_description", 
  "location": "extracted_location",
  "dateTime": "extracted_datetime_or_null",
  "platform": "original_platform",
  "sourceUrl": "original_url",
  "relevanceScore": 0-10,
  "isStudentFriendly": boolean,
  "studentFriendlinessScore": 0-10,
  "eventType": "social|academic|cultural|sports|nightlife|general",
  "confidence": 0-10
}

User query: "${originalQuery}" in ${location}

Events to filter:
${JSON.stringify(events, null, 2)}`,
      temperature: 0.1,
    });

    const result = response.text;
    const filteredEvents: FilteredEvent[] = JSON.parse(result);

    // Validate and clean the results
    return filteredEvents
      .filter(
        (event) =>
          event.relevanceScore >= 6 &&
          event.confidence >= 5 &&
          event.title &&
          event.description,
      )
      .map((event) => ({
        ...event,
        relevanceScore: Math.min(10, Math.max(0, event.relevanceScore)),
        studentFriendlinessScore: Math.min(
          10,
          Math.max(0, event.studentFriendlinessScore),
        ),
        confidence: Math.min(10, Math.max(0, event.confidence)),
      }));
  } catch (error) {
    console.error('AI event filtering failed:', error);
    // Fallback to basic filtering
    return fallbackEventFiltering(events, originalQuery, location);
  }
}

// Fallback filtering when AI fails
function fallbackEventFiltering(
  events: RawEvent[],
  query: string,
  location: string,
): FilteredEvent[] {
  const lowerQuery = query.toLowerCase();
  const lowerLocation = location.toLowerCase();

  return events
    .filter((event) => {
      const text = `${event.title} ${event.description}`.toLowerCase();

      // Basic relevance check
      const hasQueryKeywords = lowerQuery
        .split(' ')
        .some((word) => word.length > 3 && text.includes(word));

      const hasLocation = text.includes(lowerLocation);
      const hasEventKeywords =
        /\b(event|party|meetup|bar|club|activity)\b/.test(text);

      return hasEventKeywords && (hasQueryKeywords || hasLocation);
    })
    .map((event) => ({
      id: event.id,
      title: event.title || 'Event',
      description: event.description || 'Event description',
      location: event.location || location,
      dateTime: event.dateTime,
      platform: event.platform,
      sourceUrl: event.sourceUrl,
      relevanceScore: 7,
      isStudentFriendly: true,
      studentFriendlinessScore: 7,
      eventType: 'general',
      confidence: 6,
    }))
    .slice(0, 10); // Limit results
}

// Score individual event for student friendliness
export async function scoreEventStudentFriendliness(
  event: RawEvent,
): Promise<number> {
  try {
    const response = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Score this event from 0-10 on how suitable it is for international students studying abroad.

Consider:
- Budget-friendliness (affordable for students)
- Safety and accessibility
- Language barriers
- Cultural appropriateness
- Student community presence
- Transportation accessibility

Return only the score (0-10).

Event: ${event.title}
Description: ${event.description}
Location: ${event.location}
Platform: ${event.platform}`,
      temperature: 0.1,
    });

    const score = parseInt(response.text.trim());
    return isNaN(score) ? 5 : Math.min(10, Math.max(0, score));
  } catch (error) {
    console.error('Student friendliness scoring failed:', error);
    return 5; // Default neutral score
  }
}

// Rank events by overall quality
export async function rankEventsByQuality(
  events: FilteredEvent[],
): Promise<FilteredEvent[]> {
  // Sort by combined score (relevance + student friendliness + confidence)
  return events.sort((a, b) => {
    const scoreA =
      (a.relevanceScore + a.studentFriendlinessScore + a.confidence) / 3;
    const scoreB =
      (b.relevanceScore + b.studentFriendlinessScore + b.confidence) / 3;
    return scoreB - scoreA;
  });
}

// Generate AI summary of events
export async function generateEventSummary(
  events: FilteredEvent[],
  query: string,
  location: string,
): Promise<string> {
  if (events.length === 0) {
    return `I couldn't find any specific events matching "${query}" in ${location}, but I can suggest some general activities and places that students typically enjoy in that area.`;
  }

  try {
    const response = await generateText({
      model: openai('gpt-4o'),
      prompt: `You are a helpful assistant for international students studying abroad. 

Create a natural, conversational summary of the events found. 
- Be enthusiastic and helpful
- Mention the variety of options found
- Highlight student-friendly aspects
- Keep it under 150 words
- Make it sound like a friend giving recommendations

User asked: "${query}" in ${location}

Found these events:
${events.map((e) => `- ${e.title} (${e.platform}): ${e.description}`).join('\n')}`,
      temperature: 0.7,
    });

    return response.text;
  } catch (error) {
    console.error('Event summary generation failed:', error);
    return `I found ${events.length} events that match your query "${query}" in ${location}! Here are some highlights: ${events
      .slice(0, 3)
      .map((e) => e.title)
      .join(', ')}.`;
  }
}
