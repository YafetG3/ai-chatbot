import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

export interface FilteredEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  dateTime?: string;
  platform: string;
  sourceUrl: string;
  relevanceScore: number;
  isStudentFriendly: boolean;
  studentFriendlinessScore: number;
  eventType: string;
  keywords: string[];
  imageUrl?: string;
  organizer?: string;
  price?: string;
  ageRestriction?: string;
  tags?: string[];
  rawData: any;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { events, originalQuery, location, eventType } = await request.json();

    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events array is required' },
        { status: 400 },
      );
    }

    if (!originalQuery) {
      return NextResponse.json(
        { error: 'Original query is required' },
        { status: 400 },
      );
    }

    // Filter and rank events using AI-powered analysis
    const filteredEvents = await filterAndRankEvents(
      events,
      originalQuery,
      location,
      eventType,
    );

    return NextResponse.json({
      success: true,
      filteredEvents,
      totalEvents: events.length,
      filteredCount: filteredEvents.length,
      originalQuery,
      location,
      eventType,
    });
  } catch (error) {
    console.error('Event filtering error:', error);
    return NextResponse.json(
      {
        error: 'Failed to filter events',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Filter and rank events using AI-powered analysis
 */
async function filterAndRankEvents(
  events: any[],
  originalQuery: string,
  location?: string,
  eventType?: string,
): Promise<FilteredEvent[]> {
  // For now, use rule-based filtering and scoring
  // This can be enhanced with AI later
  const filteredEvents: FilteredEvent[] = [];

  for (const event of events) {
    try {
      const relevanceScore = calculateRelevanceScore(
        event,
        originalQuery,
        location,
        eventType,
      );
      const studentFriendlinessScore = calculateStudentFriendlinessScore(event);

      // Only include events with reasonable relevance
      if (relevanceScore > 0.3) {
        filteredEvents.push({
          ...event,
          relevanceScore,
          isStudentFriendly: studentFriendlinessScore > 0.6,
          studentFriendlinessScore,
          eventType: eventType || categorizeEventByKeywords(event),
          keywords: extractKeywordsFromEvent(event),
        });
      }
    } catch (error) {
      console.warn('Error processing event:', error);
      continue;
    }
  }

  // Sort by relevance score (highest first)
  return filteredEvents.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Calculate relevance score for an event based on the original query
 */
function calculateRelevanceScore(
  event: any,
  originalQuery: string,
  location?: string,
  eventType?: string,
): number {
  let score = 0;
  const query = originalQuery.toLowerCase();
  const eventText =
    `${event.title || ''} ${event.description || ''}`.toLowerCase();

  // Query keyword matching
  const queryWords = query.split(/\s+/).filter((word) => word.length > 2);
  const matchingWords = queryWords.filter((word) => eventText.includes(word));
  score += (matchingWords.length / queryWords.length) * 0.4;

  // Location matching
  if (location && event.location) {
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
 * Calculate how student-friendly an event is
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
 * Extract relevant keywords from an event
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
 * GET endpoint for checking filtering status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Event filtering service is running',
      supportedFeatures: [
        'relevance scoring',
        'student-friendliness analysis',
        'event categorization',
        'keyword extraction',
        'duplicate removal',
      ],
    });
  } catch (error) {
    console.error('Event filtering status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get filtering status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
