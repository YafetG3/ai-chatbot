import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { analyzeEventQuery } from '@/lib/ai/eventDetection';
import { getMockScrapingResults } from '@/lib/services/mockData';
import {
  analyzeUserQuery,
  analyzeScrapedEvents,
  generateEventResponse,
} from '@/lib/ai/eventPipeline';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      query,
      location,
      platforms,
      maxResults = 20,
    } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log(
      `Processing event query: "${query}" for user ${session.user.id}`,
    );

    // Step 1: Analyze the query to determine if it's event-related
    const analysis = await analyzeEventQuery(query);

    if (!analysis.isEventQuery) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query does not appear to be event-related',
          analysis,
          message:
            'Try asking about events, activities, places to go, or things to do in a specific location.',
        },
        { status: 200 },
      );
    }

    // Step 2: Use provided location or extracted location
    const targetLocation = location || analysis.location || 'unknown';

    if (!targetLocation || targetLocation === 'unknown') {
      return NextResponse.json(
        {
          success: false,
          error: 'Location is required for event discovery',
          analysis,
          message:
            'Please specify a location (e.g., "London", "Paris", "New York")',
        },
        { status: 200 },
      );
    }

    // Step 3: Use provided platforms or suggested platforms
    const targetPlatforms = platforms || analysis.suggestedPlatforms;

    console.log(
      `Scraping events for "${query}" in ${targetLocation} using platforms: ${targetPlatforms.join(', ')}`,
    );

    // Step 4: Use AI pipeline to analyze query and get mock data
    console.log('🔍 Analyzing user query with AI...');
    const queryAnalysis = await analyzeUserQuery(query);

    let scrapingResults: any[];

    // Be more flexible - if AI thinks it's an event search OR if user provided a location, try to find events
    if (queryAnalysis.isEventSearch || targetLocation) {
      console.log(
        '🎯 Event search detected or location provided, using mock data for testing',
      );
      scrapingResults = getMockScrapingResults(query, targetLocation);
      console.log(`📊 Mock scraping returned ${scrapingResults.length} platform results`);
      
      // Debug: Log what we got
      scrapingResults.forEach((result, index) => {
        console.log(`  Platform ${index + 1}: ${result.platform} - ${result.events.length} events`);
        if (result.events.length > 0) {
          console.log(`    First event: ${result.events[0].title} - ${result.events[0].sourceUrl}`);
        }
      });
    } else {
      console.log('💬 General query detected, no scraping needed');
      scrapingResults = [];
    }

    // Step 5: Process and filter results with AI pipeline
    const allEvents = scrapingResults
      .filter((result) => result.success)
      .flatMap((result) => result.events);

    console.log(` Total events after filtering: ${allEvents.length}`);

    // Step 5.5: Use AI to analyze and enhance scraped events
    let enhancedEvents: any[] = [];
    if (allEvents.length > 0) {
      console.log('🤖 Analyzing scraped events with AI...');
      enhancedEvents = await analyzeScrapedEvents(
        allEvents,
        query,
        queryAnalysis,
      );
      console.log(
        `✅ AI analysis completed: ${enhancedEvents.length} relevant events found`,
      );
      
      // Debug: Log enhanced events
      enhancedEvents.forEach((event, index) => {
        console.log(`  Enhanced event ${index + 1}: ${event.title} - Relevance: ${event.relevance} - URL: ${event.sourceUrl}`);
      });
    }

    if (allEvents.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        analysis,
        message: `No events found for "${query}" in ${targetLocation}. Try different keywords or check back later.`,
        scrapingResults: scrapingResults.map((result) => ({
          platform: result.platform,
          success: result.success,
          eventCount: result.events.length,
          error: result.error,
        })),
      });
    }

    // Step 6: Remove duplicates and score events
    const uniqueEvents = removeDuplicateEvents(allEvents);
    const scoredEvents = scoreAndRankEvents(
      uniqueEvents,
      query,
      targetLocation,
      analysis.eventType || undefined,
    );

    // Step 7: Apply student-friendliness filtering
    const studentFriendlyEvents = scoredEvents.filter(
      (event) => event.studentFriendlinessScore > 0.4,
    );

    // Step 8: Limit results and format response
    const finalEvents = (
      studentFriendlyEvents.length > 0 ? studentFriendlyEvents : scoredEvents
    ).slice(0, maxResults);

    console.log(
      `Found ${finalEvents.length} events for "${query}" in ${targetLocation}`,
    );

    // Step 9: Generate AI-powered response
    console.log('🧠 Generating AI response...');
    const aiResponse = await generateEventResponse(
      query,
      queryAnalysis,
      enhancedEvents,
    );

    return NextResponse.json({
      success: true,
      events: finalEvents,
      enhancedEvents: enhancedEvents,
      aiResponse: aiResponse,
      analysis: queryAnalysis,
      totalEventsFound: uniqueEvents.length,
      studentFriendlyCount: studentFriendlyEvents.length,
      query,
      location: targetLocation,
      platforms: targetPlatforms,
      message: `Found ${finalEvents.length} events for "${query}" in ${targetLocation}`,
      scrapingResults: scrapingResults.map((result) => ({
        platform: result.platform,
        success: result.success,
        eventCount: result.events.length,
        error: result.error,
      })),
    });
  } catch (error) {
    console.error('Event discovery error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to discover events',
        details: error instanceof Error ? error.message : 'Unknown error',
        message:
          'Something went wrong while searching for events. Please try again.',
      },
      { status: 500 },
    );
  }
}

/**
 * Remove duplicate events based on title and location similarity
 */
function removeDuplicateEvents(events: any[]): any[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    // Create a normalized key based on title and location
    const title = event.title?.toLowerCase().replace(/[^a-z]/g, '') || '';
    const location = event.location?.toLowerCase().replace(/[^a-z]/g, '') || '';
    const key = `${title}_${location}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Score and rank events based on relevance and student-friendliness
 */
function scoreAndRankEvents(
  events: any[],
  query: string,
  location: string,
  eventType?: string,
): any[] {
  return events
    .map((event) => {
      const relevanceScore = calculateRelevanceScore(
        event,
        query,
        location,
        eventType,
      );
      const studentFriendlinessScore = calculateStudentFriendlinessScore(event);

      return {
        ...event,
        relevanceScore,
        isStudentFriendly: studentFriendlinessScore > 0.6,
        studentFriendlinessScore,
        eventType: eventType || categorizeEventByKeywords(event),
        keywords: extractKeywordsFromEvent(event),
      };
    })
    .sort((a, b) => {
      // Sort by combined score (relevance + student-friendliness)
      const aScore = a.relevanceScore * 0.7 + a.studentFriendlinessScore * 0.3;
      const bScore = b.relevanceScore * 0.7 + b.studentFriendlinessScore * 0.3;
      return bScore - aScore;
    });
}

/**
 * Calculate relevance score for an event
 */
function calculateRelevanceScore(
  event: any,
  query: string,
  location: string,
  eventType?: string,
): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const eventText =
    `${event.title || ''} ${event.description || ''}`.toLowerCase();

  // Query keyword matching
  const queryWords = queryLower.split(/\s+/).filter((word) => word.length > 2);
  const matchingWords = queryWords.filter((word) => eventText.includes(word));
  score += (matchingWords.length / queryWords.length) * 0.4;

  // Location matching
  if (event.location) {
    const locationMatch = event.location
      .toLowerCase()
      .includes(location.toLowerCase());
    if (locationMatch) score += 0.3;
  }

  // Event type matching
  if (eventType && event.eventType) {
    if (event.eventType === eventType) score += 0.2;
  }

  // Content quality bonus
  if (event.description && event.description.length > 50) score += 0.1;
  if (event.imageUrl) score += 0.05;
  if (event.dateTime) score += 0.05;

  return Math.min(score, 1.0);
}

/**
 * Calculate student-friendliness score
 */
function calculateStudentFriendlinessScore(event: any): number {
  let score = 0;
  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();

  // Student-specific indicators
  if (text.includes('student')) score += 0.3;
  if (text.includes('study abroad')) score += 0.3;
  if (text.includes('international')) score += 0.2;
  if (text.includes('university') || text.includes('college')) score += 0.2;
  if (text.includes('campus')) score += 0.2;

  // Age-appropriate indicators
  if (text.includes('18+') || text.includes('21+')) score += 0.1;
  if (text.includes('all ages') || text.includes('family')) score += 0.1;

  // Budget-friendly indicators
  if (text.includes('free') || text.includes('no cost')) score += 0.2;
  if (text.includes('cheap') || text.includes('affordable')) score += 0.1;
  if (text.includes('budget')) score += 0.1;

  // Social indicators
  if (text.includes('meet') || text.includes('social')) score += 0.1;
  if (text.includes('networking')) score += 0.1;
  if (text.includes('party') || text.includes('celebration')) score += 0.1;

  return Math.min(score, 1.0);
}

/**
 * Categorize event based on keywords
 */
function categorizeEventByKeywords(event: any): string {
  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();

  if (
    text.includes('party') ||
    text.includes('meetup') ||
    text.includes('social')
  ) {
    return 'social';
  }
  if (
    text.includes('workshop') ||
    text.includes('seminar') ||
    text.includes('lecture')
  ) {
    return 'academic';
  }
  if (
    text.includes('museum') ||
    text.includes('art') ||
    text.includes('culture')
  ) {
    return 'cultural';
  }
  if (
    text.includes('sport') ||
    text.includes('fitness') ||
    text.includes('outdoor')
  ) {
    return 'sports';
  }
  if (
    text.includes('bar') ||
    text.includes('club') ||
    text.includes('nightlife')
  ) {
    return 'nightlife';
  }
  if (
    text.includes('food') ||
    text.includes('restaurant') ||
    text.includes('dining')
  ) {
    return 'food';
  }
  if (
    text.includes('concert') ||
    text.includes('show') ||
    text.includes('performance')
  ) {
    return 'entertainment';
  }
  if (
    text.includes('hiking') ||
    text.includes('park') ||
    text.includes('nature')
  ) {
    return 'outdoor';
  }
  if (
    text.includes('skill') ||
    text.includes('diy') ||
    text.includes('hands-on')
  ) {
    return 'workshop';
  }
  if (
    text.includes('networking') ||
    text.includes('professional') ||
    text.includes('business')
  ) {
    return 'networking';
  }

  return 'general';
}

/**
 * Extract keywords from event
 */
function extractKeywordsFromEvent(event: any): string[] {
  const keywords: string[] = [];
  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();

  // Event types
  if (text.includes('party')) keywords.push('party');
  if (text.includes('concert')) keywords.push('concert');
  if (text.includes('workshop')) keywords.push('workshop');
  if (text.includes('meetup')) keywords.push('meetup');
  if (text.includes('bar')) keywords.push('bar');
  if (text.includes('club')) keywords.push('club');
  if (text.includes('restaurant')) keywords.push('restaurant');

  // Activities
  if (text.includes('dance')) keywords.push('dancing');
  if (text.includes('drink')) keywords.push('drinking');
  if (text.includes('eat')) keywords.push('food');
  if (text.includes('sightsee')) keywords.push('sightseeing');
  if (text.includes('tour')) keywords.push('tour');

  // Time
  if (text.includes('tonight')) keywords.push('tonight');
  if (text.includes('weekend')) keywords.push('weekend');
  if (text.includes('this week')) keywords.push('this week');

  // Student-specific
  if (text.includes('student')) keywords.push('student');
  if (text.includes('study abroad')) keywords.push('study abroad');
  if (text.includes('international')) keywords.push('international');

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * GET endpoint for checking service status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Event discovery service is running',
      supportedFeatures: [
        'query analysis',
        'multi-platform scraping',
        'AI-powered filtering',
        'student-friendliness scoring',
        'duplicate removal',
        'relevance ranking',
      ],
      supportedPlatforms: [
        'instagram',
        'twitter',
        'tiktok',
        'facebook',
        'linkedin',
      ],
      exampleQueries: [
        'best bars for students studying abroad in london',
        'student meetups in paris',
        'cultural events for international students in berlin',
        'nightlife recommendations for study abroad students in tokyo',
      ],
    });
  } catch (error) {
    console.error('Event discovery status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get service status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
