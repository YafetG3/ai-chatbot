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
import { MultiPlatformScraper } from '@/lib/services/multiPlatformScraper';

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

    // Step 1: Use enhanced AI analysis for query processing
    const queryAnalysis = await analyzeUserQuery(query);
    
    if (!queryAnalysis.isEventSearch) {
      return NextResponse.json({
        success: false,
        message: 'This query doesn\'t appear to be asking for events or activities.',
        suggestion: 'Try asking about places to go, things to do, or activities in a specific location.',
      });
    }

    console.log('🔍 Query analysis completed:', queryAnalysis);

    // Step 2: Use multi-platform scraping with AI-extracted keywords
    const multiScraper = new MultiPlatformScraper();
    
    let scrapingResults;
    const availablePlatforms = multiScraper.getAvailablePlatforms();
    
    if (availablePlatforms.length > 0) {
      scrapingResults = await multiScraper.scrapeFromAllPlatforms(
        query,
        queryAnalysis.location || location || 'unknown',
        queryAnalysis.searchKeywords,
        10
      );
    } else {
      scrapingResults = getMockScrapingResults(
        query,
        queryAnalysis.location || location || 'unknown',
      );
    }

    // Combine all events from all platforms
    const allEvents = scrapingResults.flatMap(result => 
      result.success ? result.events : []
    );

    console.log(`📊 Scraped ${allEvents.length} total events from ${scrapingResults.length} platforms`);

    // Step 3: Enhanced AI analysis and filtering
    const enhancedEvents = await analyzeScrapedEvents(allEvents, query, queryAnalysis);

    // Step 4: Generate response with proper fallback
    let aiResponse: string;
    
    if (enhancedEvents.length === 0) {
      aiResponse = await generateEventResponse(query, queryAnalysis, []);
      
      return NextResponse.json({
        success: true,
        message: "I couldn't find specific events on social media that match your query, but I can still help with recommendations.",
        response: aiResponse,
        eventsFound: 0,
        platformsSearched: availablePlatforms.length > 0 ? availablePlatforms : ['MockData'],
        fallbackUsed: true,
      });
    } else {
      aiResponse = await generateEventResponse(query, queryAnalysis, enhancedEvents);
      
      return NextResponse.json({
        success: true,
        response: aiResponse,
        eventsFound: enhancedEvents.length,
        platformsSearched: availablePlatforms.length > 0 ? availablePlatforms : ['MockData'],
        events: enhancedEvents.slice(0, 5).map(event => ({
          title: event.title,
          description: event.description,
          location: event.location,
          platform: event.platform,
          sourceUrl: event.sourceUrl,
          relevance: event.relevance,
        })),
        fallbackUsed: false,
      });
    }
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
        'reddit',
        'instagram',
        'bright-data',
        'scrapfly',
        'scraperapi',
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
