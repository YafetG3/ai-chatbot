import { scrapeMultiplePlatforms, RawEvent } from './apify';
import { isEventQuery, extractLocationFromText } from '../ai/eventDetection';
import { filterEventsByRelevance, rankEventsByQuality, generateEventSummary } from '../ai/eventFilter';
import { db } from '../db';
import { events, eventQueries } from '../db/schema';
import { eq } from 'drizzle-orm';
import { SessionCache } from '../sessionCache';
import { BlobStorage } from '../blob';

export interface EventDiscoveryResult {
  events: FilteredEvent[];
  summary: string;
  query: string;
  location: string;
  totalFound: number;
  isFromScraping: boolean;
}

// Main event discovery pipeline
export async function processEventQuery(
  query: string, 
  userId: string,
  chatId: string
): Promise<EventDiscoveryResult> {
  try {
    // Check rate limiting
    const canProceed = await SessionCache.checkRateLimit(userId, 'event_query', 5, 3600);
    if (!canProceed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Check cache first
    const cacheKey = `${query}:${userId}`;
    const cached = await SessionCache.getEventCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        isFromCache: true,
      };
    }

    // 1. Detect and parse query
    const eventAnalysis = await isEventQuery(query);
    
    if (!eventAnalysis.isEventQuery || eventAnalysis.confidence < 0.6) {
      throw new Error('Query is not event-related enough');
    }
    
    const location = eventAnalysis.location || extractLocationFromText(query) || 'unknown';
    
    // 2. Check if we have recent results for this query
    const cachedResults = await getCachedEventResults(query, location);
    if (cachedResults && cachedResults.length > 0) {
      const summary = await generateEventSummary(cachedResults, query, location);
      return {
        events: cachedResults,
        summary,
        query,
        location,
        totalFound: cachedResults.length,
        isFromScraping: false,
      };
    }
    
    // 3. Scrape social media platforms
    const rawEvents = await scrapeMultiplePlatforms(query, location, {
      maxResults: 50,
      timeout: 300000, // 5 minutes
    });
    
    if (rawEvents.length === 0) {
      // Fallback to AI-generated suggestions
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
    }
    
    // 4. AI filtering and ranking
    const filteredEvents = await filterEventsByRelevance(rawEvents, query, location);
    const rankedEvents = await rankEventsByQuality(filteredEvents);
    
    // 5. Store results
    await storeEventResults(rankedEvents, query, userId, chatId);
    
    // 6. Generate summary
    const summary = await generateEventSummary(rankedEvents, query, location);
    
    return {
      events: rankedEvents,
      summary,
      query,
      location,
      totalFound: rankedEvents.length,
      isFromScraping: true,
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

// Get cached event results (within last 24 hours)
async function getCachedEventResults(query: string, location: string): Promise<FilteredEvent[]> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const cachedEvents = await db
      .select()
      .from(events)
      .where(
        eq(events.location, location) &&
        eq(events.scrapedAt, oneDayAgo)
      )
      .limit(20);
    
    return cachedEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      dateTime: event.dateTime,
      platform: event.platform || '',
      sourceUrl: event.sourceUrl || '',
      relevanceScore: event.relevanceScore || 7,
      isStudentFriendly: event.isStudentFriendly || false,
      studentFriendlinessScore: 7,
      eventType: 'general',
      confidence: 7,
    }));
  } catch (error) {
    console.error('Cache retrieval failed:', error);
    return [];
  }
}

// Store event results in database
async function storeEventResults(
  events: FilteredEvent[], 
  query: string, 
  userId: string,
  chatId: string
): Promise<void> {
  try {
    // Store event query
    await db.insert(eventQueries).values({
      query,
      location: events[0]?.location || 'unknown',
      userId,
      chatId,
      resultsFound: events.length,
    });
    
    // Store individual events
    for (const event of events) {
      await db.insert(events).values({
        title: event.title,
        description: event.description,
        location: event.location,
        dateTime: event.dateTime,
        platform: event.platform,
        sourceUrl: event.sourceUrl,
        relevanceScore: event.relevanceScore,
        isStudentFriendly: event.isStudentFriendly,
        chatId,
      });
    }
  } catch (error) {
    console.error('Failed to store event results:', error);
  }
}

// Generate AI event suggestions when scraping fails
async function generateAIEventSuggestions(
  query: string, 
  location: string
): Promise<FilteredEvent[]> {
  try {
    const response = await openai('gpt-4o').generate({
      messages: [
        {
          role: 'system',
          content: `You are an expert on student life and activities in different cities. 
          
          Generate 5-8 realistic event suggestions for international students based on the query.
          Make them specific, actionable, and student-friendly.
          
          Return as JSON array with:
          {
            "id": "ai_suggestion_1",
            "title": "Event title",
            "description": "Brief description",
            "location": "Specific location",
            "dateTime": "When it happens",
            "platform": "ai_generated",
            "sourceUrl": "",
            "relevanceScore": 8,
            "isStudentFriendly": true,
            "studentFriendlinessScore": 9,
            "eventType": "social|academic|cultural|sports|nightlife",
            "confidence": 8
          }`
        },
        {
          role: 'user',
          content: `Query: "${query}" in ${location}`
        }
      ],
      maxTokens: 1000,
      temperature: 0.7,
    });

    const aiEvents: FilteredEvent[] = JSON.parse(response.text);
    return aiEvents.filter(event => event.title && event.description);
    
  } catch (error) {
    console.error('AI event generation failed:', error);
    
    // Return basic fallback suggestions
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
      },
      {
        id: 'fallback_2',
        title: 'Cultural Exchange Dinner',
        description: 'Monthly potluck dinner where students share food from their home countries',
        location: location || 'university area',
        dateTime: 'First Saturday of each month',
        platform: 'ai_generated',
        sourceUrl: '',
        relevanceScore: 7,
        isStudentFriendly: true,
        studentFriendlinessScore: 9,
        eventType: 'cultural',
        confidence: 6,
      }
    ];
  }
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

```

```

## Phase 6: Create New API Routes

Now let's create the new API routes for event discovery:

```typescript:app/api/events/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processEventQuery } from '@/lib/services/eventPipeline';
import { auth } from '@/app/(auth)/auth';
import { SessionCache } from '@/lib/sessionCache';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limiting
    const canProceed = await SessionCache.checkRateLimit(
      session.user.id, 
      'event_query', 
      5, 
      3600
    );
    
    if (!canProceed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' }, 
        { status: 429 }
      );
    }

    const { query, chatId } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const result = await processEventQuery(query, session.user.id, chatId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Event query failed:', error);
    return NextResponse.json(
      { error: 'Failed to process event query' }, 
      { status: 500 }
    );
  }
}
```

```typescript:app/api/events/scrape/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scrapeMultiplePlatforms } from '@/lib/services/apify';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, location, maxResults = 50 } = await request.json();
    
    if (!query || !location) {
      return NextResponse.json(
        { error: 'Query and location are required' }, 
        { status: 400 }
      );
    }

    const events = await scrapeMultiplePlatforms(query, location, {
      maxResults,
      timeout: 300000,
    });
    
    return NextResponse.json({ events, total: events.length });
  } catch (error) {
    console.error('Event scraping failed:', error);
    return NextResponse.json(
      { error: 'Failed to scrape events' }, 
      { status: 500 }
    );
  }
}
```

```typescript:app/api/events/filter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { filterEventsByRelevance, rankEventsByQuality } from '@/lib/ai/eventFilter';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { events, query, location } = await request.json();
    
    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events array is required' }, 
        { status: 400 }
      );
    }

    const filteredEvents = await filterEventsByRelevance(events, query, location);
    const rankedEvents = await rankEventsByQuality(filteredEvents);
    
    return NextResponse.json({ 
      events: rankedEvents, 
      total: rankedEvents.length 
    });
  } catch (error) {
    console.error('Event filtering failed:', error);
    return NextResponse.json(
      { error: 'Failed to filter events' }, 
      { status: 500 }
    );
  }
}
```

## Phase 7: Integrate Event Detection into Chat Flow

Now let's modify the existing chat route to detect event queries:

```typescript:app/api/chat/route.ts
// ... existing imports ...
import { shouldTriggerEventDiscovery } from '@/lib/services/eventPipeline';
import { processEventQuery } from '@/lib/services/eventPipeline';

export async function POST(req: Request) {
  try {
    // ... existing authentication and validation code ...

    const lastMessage = messages[messages.length - 1];
    
    // Check if this is an event discovery query
    if (shouldTriggerEventDiscovery(lastMessage.content)) {
      try {
        const eventResult = await processEventQuery(
          lastMessage.content, 
          userId, 
          chatId
        );
        
        if (eventResult.events.length > 0) {
          // Create a system message with event context
          const eventContext = {
            role: 'system' as const,
            content: `I found ${eventResult.events.length} events that match your query! Here's what I discovered:

${eventResult.summary}

Events found:
${eventResult.events.map(e => `- ${e.title} (${e.platform}): ${e.description}`).join('\n')}

Please provide a natural, helpful response incorporating these events. Be enthusiastic and make specific recommendations based on what was found.`
          };
          
          // Add event context to messages for AI processing
          const messagesWithEvents = 