import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  searchMockPosts,
  getMockScrapingResults,
  getAllMockPosts,
} from '@/lib/services/mockData';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const location = searchParams.get('location');

  if (!query) {
    return NextResponse.json({
      success: false,
      error: 'Query parameter is required',
      example: '/api/events/mock?query=party&location=barcelona',
    });
  }

  try {
    // Search for relevant posts
    const relevantPosts = searchMockPosts(query, location || undefined);

    // Get mock scraping results
    const mockResults = getMockScrapingResults(query, location || undefined);

    // Get all posts for comparison
    const allPosts = getAllMockPosts();

    return NextResponse.json({
      success: true,
      query,
      location: location || 'any',
      results: {
        totalPosts: allPosts.length,
        relevantPosts: relevantPosts.length,
        posts: relevantPosts,
        mockScrapingResults: mockResults,
      },
      searchInfo: {
        query: query.toLowerCase(),
        location: location?.toLowerCase(),
        platforms: mockResults.map((r) => r.platform),
        totalEvents: mockResults.reduce((sum, r) => sum + r.events.length, 0),
      },
    });
  } catch (error) {
    console.error('Error in mock events API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, location } = await request.json();

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required in request body',
        },
        { status: 400 },
      );
    }

    // Search for relevant posts
    const relevantPosts = searchMockPosts(query, location);

    // Get mock scraping results
    const mockResults = getMockScrapingResults(query, location);

    return NextResponse.json({
      success: true,
      query,
      location: location || 'any',
      relevantPosts: relevantPosts.length,
      events: mockResults.reduce(
        (all, result) => all.concat(result.events),
        [],
      ),
      platforms: mockResults.map((r) => ({
        platform: r.platform,
        eventCount: r.events.length,
        success: r.success,
      })),
    });
  } catch (error) {
    console.error('Error in mock events POST API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
