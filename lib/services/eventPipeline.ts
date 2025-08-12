import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { RawEvent } from './apify';
import { isEventQuery, extractLocationFromQuery } from '../ai/eventDetection';
import { FilteredEvent } from '../ai/eventFilter';

export interface EventDiscoveryResult {
  events: FilteredEvent[];
  summary: string;
  query: string;
  location: string;
  totalFound: number;
  isFromScraping: boolean;
}

// Main event discovery pipeline - simplified for enhanced dynamic system
export async function processEventQuery(
  query: string, 
  userId: string,
  chatId: string
): Promise<EventDiscoveryResult> {
  try {
    // 1. Detect and parse query
    const isEvent = await isEventQuery(query);
    
    if (!isEvent) {
      throw new Error('Query is not event-related enough');
    }
    
    const location = (await extractLocationFromQuery(query)) || 'unknown';
    
    const aiEvents = await generateAIEventSuggestions(query, location);
    const summary = await generateEventSummary(aiEvents, query, location);
    
    return {
      events: aiEvents,
      summary,
      query,
      location,
      totalFound: aiEvents.length,
      isFromScraping: false,
    };
    
  } catch (error) {
    console.error('Event processing failed:', error);
    
    // Fallback to AI suggestions
    const aiEvents = await generateAIEventSuggestions(query, 'unknown');
    const summary = await generateEventSummary(aiEvents, query, 'unknown');
    
    return {
      events: aiEvents,
      summary,
      query,
      location: 'unknown',
      totalFound: aiEvents.length,
      isFromScraping: false,
    };
  }
}

// Generate event summary using AI
async function generateEventSummary(
  events: FilteredEvent[],
  query: string,
  location: string
): Promise<string> {
  try {
    const response = await generateText({
      model: openai('gpt-4o'),
      prompt: `Create a brief, enthusiastic summary of these events for a student asking: "${query}" in ${location}

Events found:
${events.map(e => `- ${e.title}: ${e.description}`).join('\n')}

Keep it under 100 words and sound like a helpful friend.`,
      temperature: 0.7,
    });

    return response.text;
  } catch (error) {
    console.error('Summary generation failed:', error);
    return `Found ${events.length} events for "${query}" in ${location}`;
  }
}

// Generate AI event suggestions using dynamic analysis
async function generateAIEventSuggestions(
  query: string, 
  location: string
): Promise<FilteredEvent[]> {
  try {
    const response = await generateText({
      model: openai('gpt-4o'),
      prompt: `You are an expert on student life and activities. Generate 5-8 realistic event suggestions for international students based on this query: "${query}" in ${location}

Make them specific, actionable, and student-friendly. Return as valid JSON array with this exact format:
[
  {
    "id": "ai_suggestion_1",
    "title": "Event title",
    "description": "Brief description",
    "location": "Specific location in ${location}",
    "dateTime": "When it happens",
    "platform": "ai_generated",
    "sourceUrl": "",
    "relevanceScore": 8,
    "isStudentFriendly": true,
    "studentFriendlinessScore": 9,
    "eventType": "social",
    "confidence": 8
  }
]

Focus on events that match the user's specific request. If they ask about clubs, suggest clubs. If they ask about restaurants, suggest restaurants.`,
      temperature: 0.7,
    });

    try {
      const aiEvents: FilteredEvent[] = JSON.parse(response.text);
      return aiEvents.filter(event => event.title && event.description);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return getFallbackSuggestions(query, location);
    }
    
  } catch (error) {
    console.error('AI event generation failed:', error);
    return getFallbackSuggestions(query, location);
  }
}

function getFallbackSuggestions(query: string, location: string): FilteredEvent[] {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('club') || queryLower.includes('nightlife')) {
    return [
      {
        id: 'fallback_club_1',
        title: 'Student Night at Local Club',
        description: 'Weekly student night with discounted drinks and international music',
        location: location || 'city center',
        dateTime: 'Every Thursday at 10 PM',
        platform: 'ai_generated',
        sourceUrl: '',
        relevanceScore: 8,
        isStudentFriendly: true,
        studentFriendlinessScore: 9,
        eventType: 'nightlife',
        confidence: 7,
      }
    ];
  }
  
  if (queryLower.includes('bar') || queryLower.includes('drink')) {
    return [
      {
        id: 'fallback_bar_1',
        title: 'International Student Happy Hour',
        description: 'Weekly happy hour for international students with half-price drinks',
        location: location || 'university district',
        dateTime: 'Every Friday at 6 PM',
        platform: 'ai_generated',
        sourceUrl: '',
        relevanceScore: 8,
        isStudentFriendly: true,
        studentFriendlinessScore: 9,
        eventType: 'social',
        confidence: 7,
      }
    ];
  }
  
  return [
    {
      id: 'fallback_1',
      title: 'Student Meetup at Local Coffee Shop',
      description: 'Weekly meetup for international students to practice language and make friends',
      location: location || 'city center',
      dateTime: 'Every Friday at 6 PM',
      platform: 'ai_generated',
      sourceUrl: '',
      relevanceScore: 7,
      isStudentFriendly: true,
      studentFriendlinessScore: 8,
      eventType: 'social',
      confidence: 6,
    }
  ];
}

// Check if query should trigger event discovery
export function shouldTriggerEventDiscovery(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  const eventTriggers = [
    'event', 'events', 'party', 'parties', 'meetup', 'meetups',
    'bar', 'bars', 'club', 'clubs', 'restaurant', 'restaurants',
    'where to go', 'what to do', 'thing to do', 'activity', 'activities',
    'best', 'top', 'popular', 'recommend', 'recommendation',
    'student', 'study abroad', 'international'
  ];
  
  return eventTriggers.some(trigger => lowerMessage.includes(trigger));
}         