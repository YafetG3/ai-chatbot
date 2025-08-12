import { z } from 'zod';

export interface EventQueryAnalysis {
  isEventQuery: boolean;
  location: string | null;
  eventType: EventCategory | null;
  keywords: string[];
  confidence: number;
  suggestedPlatforms: string[];
}

export type EventCategory =
  | 'social'
  | 'academic'
  | 'cultural'
  | 'sports'
  | 'nightlife'
  | 'food'
  | 'entertainment'
  | 'outdoor'
  | 'workshop'
  | 'networking';

export interface LocationInfo {
  city: string;
  country: string;
  region?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Detect if a user query is asking for events/activities
 */
export async function isEventQuery(message: string): Promise<boolean> {
  // Use keyword-based detection for now to avoid AI SDK issues
  return fallbackEventDetection(message);
}

/**
 * Extract location information from a user query
 */
export async function extractLocationFromQuery(
  message: string,
): Promise<string | null> {
  // Use keyword-based extraction for now
  return fallbackLocationExtraction(message);
}

/**
 * Categorize the type of event being requested
 */
export async function categorizeEventQuery(
  message: string,
): Promise<EventCategory | null> {
  // Use keyword-based categorization for now
  return fallbackEventCategorization(message);
}

/**
 * Extract relevant keywords for event discovery
 */
export async function extractEventKeywords(message: string): Promise<string[]> {
  // Use keyword-based extraction for now
  return fallbackKeywordExtraction(message);
}

/**
 * Suggest which social media platforms would be best for scraping
 */
export async function suggestScrapingPlatforms(
  eventType: EventCategory,
  location: string,
): Promise<string[]> {
  const platformSuggestions: Record<EventCategory, string[]> = {
    social: ['instagram', 'tiktok', 'twitter'],
    academic: ['twitter', 'linkedin', 'facebook'],
    cultural: ['instagram', 'facebook', 'twitter'],
    sports: ['instagram', 'tiktok', 'twitter'],
    nightlife: ['instagram', 'tiktok', 'twitter'],
    food: ['instagram', 'tiktok', 'facebook'],
    entertainment: ['instagram', 'tiktok', 'twitter'],
    outdoor: ['instagram', 'tiktok', 'facebook'],
    workshop: ['twitter', 'linkedin', 'facebook'],
    networking: ['twitter', 'linkedin', 'facebook'],
  };

  return platformSuggestions[eventType] || ['instagram', 'twitter', 'tiktok'];
}

/**
 * Comprehensive event query analysis
 */
export async function analyzeEventQuery(
  message: string,
): Promise<EventQueryAnalysis> {
  try {
    const [isEvent, location, eventType, keywords] = await Promise.all([
      isEventQuery(message),
      extractLocationFromQuery(message),
      categorizeEventQuery(message),
      extractEventKeywords(message),
    ]);

    const suggestedPlatforms = eventType
      ? await suggestScrapingPlatforms(eventType, location || 'unknown')
      : ['instagram', 'twitter', 'tiktok'];

    // Calculate confidence based on extracted information
    let confidence = 0;
    if (isEvent) confidence += 0.4;
    if (location) confidence += 0.3;
    if (eventType) confidence += 0.2;
    if (keywords.length > 0) confidence += 0.1;

    return {
      isEventQuery: isEvent,
      location,
      eventType,
      keywords,
      confidence,
      suggestedPlatforms,
    };
  } catch (error) {
    console.error('Error analyzing event query:', error);
    return {
      isEventQuery: false,
      location: null,
      eventType: null,
      keywords: [],
      confidence: 0,
      suggestedPlatforms: ['instagram', 'twitter', 'tiktok'],
    };
  }
}

// Fallback methods for when AI fails
function fallbackEventDetection(message: string): boolean {
  const eventKeywords = [
    'event',
    'party',
    'meetup',
    'activity',
    'thing to do',
    'go to',
    'bar',
    'club',
    'restaurant',
    'concert',
    'show',
    'workshop',
    'tour',
    'visit',
    'see',
    'experience',
    'enjoy',
    'fun',
  ];

  const lowerMessage = message.toLowerCase();
  return eventKeywords.some((keyword) => lowerMessage.includes(keyword));
}

function fallbackLocationExtraction(message: string): string | null {
  const locationPatterns = [
    /\b(in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /\b(London|Paris|Tokyo|New York|Berlin|Amsterdam|Rome|Barcelona|Madrid|Prague|Vienna|Budapest|Copenhagen|Stockholm|Oslo|Helsinki|Dublin|Edinburgh|Glasgow|Manchester|Liverpool|Birmingham|Leeds|Sheffield|Newcastle|Cardiff|Belfast|Bristol|Oxford|Cambridge|Brighton|Bath|York|Canterbury|Stratford|Liverpool|Manchester|Birmingham|Leeds|Sheffield|Newcastle|Cardiff|Belfast|Bristol|Oxford|Cambridge|Brighton|Bath|York|Canterbury|Stratford)\b/gi,
  ];

  for (const pattern of locationPatterns) {
    const match = pattern.exec(message);
    if (match) {
      return match[2] || match[1];
    }
  }

  return null;
}

function fallbackEventCategorization(message: string): EventCategory | null {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('party') ||
    lowerMessage.includes('meetup') ||
    lowerMessage.includes('social')
  ) {
    return 'social';
  }
  if (
    lowerMessage.includes('workshop') ||
    lowerMessage.includes('seminar') ||
    lowerMessage.includes('lecture')
  ) {
    return 'academic';
  }
  if (
    lowerMessage.includes('museum') ||
    lowerMessage.includes('art') ||
    lowerMessage.includes('culture')
  ) {
    return 'cultural';
  }
  if (
    lowerMessage.includes('sport') ||
    lowerMessage.includes('fitness') ||
    lowerMessage.includes('outdoor')
  ) {
    return 'sports';
  }
  if (
    lowerMessage.includes('bar') ||
    lowerMessage.includes('club') ||
    lowerMessage.includes('nightlife')
  ) {
    return 'nightlife';
  }
  if (
    lowerMessage.includes('food') ||
    lowerMessage.includes('restaurant') ||
    lowerMessage.includes('dining')
  ) {
    return 'food';
  }
  if (
    lowerMessage.includes('concert') ||
    lowerMessage.includes('show') ||
    lowerMessage.includes('performance')
  ) {
    return 'entertainment';
  }
  if (
    lowerMessage.includes('hiking') ||
    lowerMessage.includes('park') ||
    lowerMessage.includes('nature')
  ) {
    return 'outdoor';
  }
  if (
    lowerMessage.includes('skill') ||
    lowerMessage.includes('diy') ||
    lowerMessage.includes('hands-on')
  ) {
    return 'workshop';
  }
  if (
    lowerMessage.includes('networking') ||
    lowerMessage.includes('professional') ||
    lowerMessage.includes('business')
  ) {
    return 'networking';
  }

  return null;
}

function fallbackKeywordExtraction(message: string): string[] {
  const keywords: string[] = [];
  const lowerMessage = message.toLowerCase();

  // Event types
  if (lowerMessage.includes('party')) keywords.push('party');
  if (lowerMessage.includes('concert')) keywords.push('concert');
  if (lowerMessage.includes('workshop')) keywords.push('workshop');
  if (lowerMessage.includes('meetup')) keywords.push('meetup');
  if (lowerMessage.includes('bar')) keywords.push('bar');
  if (lowerMessage.includes('club')) keywords.push('club');
  if (lowerMessage.includes('restaurant')) keywords.push('restaurant');

  // Activities
  if (lowerMessage.includes('dance')) keywords.push('dancing');
  if (lowerMessage.includes('drink')) keywords.push('drinking');
  if (lowerMessage.includes('eat')) keywords.push('food');
  if (lowerMessage.includes('sightsee')) keywords.push('sightseeing');
  if (lowerMessage.includes('tour')) keywords.push('tour');

  // Time
  if (lowerMessage.includes('tonight')) keywords.push('tonight');
  if (lowerMessage.includes('weekend')) keywords.push('weekend');
  if (lowerMessage.includes('this week')) keywords.push('this week');

  return keywords;
}
