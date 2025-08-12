import { NextRequest, NextResponse } from 'next/server';
import type { NextRequest as NextRequestType } from 'next/server';
import { createApifyService } from '@/lib/services/apify';
import { analyzeEventQuery } from '@/lib/ai/eventDetection';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, location, platforms } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Analyze the query to determine if it's event-related
    const analysis = await analyzeEventQuery(query);

    if (!analysis.isEventQuery) {
      return NextResponse.json(
        {
          error: 'Query does not appear to be event-related',
          analysis,
        },
        { status: 400 },
      );
    }

    // Use provided location or extracted location
    const targetLocation = location || analysis.location || 'unknown';

    // Use provided platforms or suggested platforms
    const targetPlatforms = platforms || analysis.suggestedPlatforms;

    // Initialize Apify service
    const apifyService = createApifyService({
      apiToken: process.env.APIFY_API_TOKEN || '',
      timeout: Number.parseInt(process.env.APIFY_TIMEOUT || '300000', 10),
      rateLimitDelay: 2000, // 2 seconds between platforms
    });

    // Scrape events from multiple platforms
    const scrapingResults =
      await apifyService.scrapeEventsFromMultiplePlatforms(
        query,
        targetLocation,
        targetPlatforms,
      );

    // Process and format results
    const allEvents = scrapingResults
      .filter((result) => result.success)
      .flatMap((result) => result.events);

    // Remove duplicates based on title similarity
    const uniqueEvents = removeDuplicateEvents(allEvents);

    // Sort by relevance (you can enhance this with AI scoring later)
    const sortedEvents = uniqueEvents.sort((a, b) => {
      // Prioritize events with more complete information
      const aScore = calculateEventScore(a);
      const bScore = calculateEventScore(b);
      return bScore - aScore;
    });

    return NextResponse.json({
      success: true,
      events: sortedEvents.slice(0, 20), // Limit to top 20 events
      analysis,
      scrapingResults: scrapingResults.map((result) => ({
        platform: result.platform,
        success: result.success,
        eventCount: result.events.length,
        error: result.error,
      })),
      totalEventsFound: uniqueEvents.length,
      query,
      location: targetLocation,
      platforms: targetPlatforms,
    });
  } catch (error) {
    console.error('Event scraping error:', error);
    return NextResponse.json(
      {
        error: 'Failed to scrape events',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Remove duplicate events based on title similarity
 */
function removeDuplicateEvents(events: any[]): any[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    // Create a normalized key based on title and location
    const key = `${event.title?.toLowerCase().replace(/[^a-z]/g, '')}_${event.location?.toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Calculate a simple score for event relevance
 */
function calculateEventScore(event: any): number {
  let score = 0;

  // Basic scoring based on available information
  if (event.title) score += 10;
  if (event.description) score += 5;
  if (event.location) score += 8;
  if (event.dateTime) score += 7;
  if (event.imageUrl) score += 3;
  if (event.organizer) score += 2;
  if (event.price) score += 1;
  if (event.tags && event.tags.length > 0) score += 2;

  // Bonus for student-friendly indicators
  if (event.description?.toLowerCase().includes('student')) score += 5;
  if (event.description?.toLowerCase().includes('study abroad')) score += 5;
  if (event.description?.toLowerCase().includes('international')) score += 3;

  return score;
}

/**
 * GET endpoint for checking scraping status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const location = searchParams.get('location');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 },
      );
    }

    // Analyze the query
    const analysis = await analyzeEventQuery(query);

    return NextResponse.json({
      success: true,
      analysis,
      isEventQuery: analysis.isEventQuery,
      suggestedPlatforms: analysis.suggestedPlatforms,
      confidence: analysis.confidence,
    });
  } catch (error) {
    console.error('Event query analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
