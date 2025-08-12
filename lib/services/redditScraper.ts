import { z } from 'zod';
import { ApifyClient } from 'apify-client';
import { RawEvent, ScrapingResult, ApifyConfig } from './apify';

const REDDIT_SCRAPER_LITE_ACTOR_ID = 'trudax/reddit-scraper-lite';

export interface RedditScrapingConfig extends ApifyConfig {
  maxItems?: number;
  maxPostCount?: number;
  maxComments?: number;
  includeNSFW?: boolean;
}

export class RedditScraperService {
  private config: RedditScrapingConfig;
  private apifyClient: ApifyClient;

  constructor(config: RedditScrapingConfig) {
    this.config = config;
    this.apifyClient = new ApifyClient({ token: config.apiToken });
  }

  /**
   * Scrape Reddit for student-relevant events and recommendations
   */
  async scrapeRedditEvents(
    query: string,
    location: string,
    keywords: string[] = []
  ): Promise<ScrapingResult> {
    try {
      console.log(`🔍 Reddit scraping for: "${query}" in ${location}`);
      
      const searchTerms = this.buildRedditSearchTerms(query, location, keywords);
      
      const runInput = {
        searches: searchTerms,
        type: 'posts', // Focus on posts which contain both questions and answers
        sort: 'top', // Get most upvoted/trusted content first
        time: 'month', // Recent but established content
        
        maxItems: this.config.maxItems || 20,
        maxPostCount: this.config.maxPostCount || 15,
        maxComments: this.config.maxComments || 10,
        
        includeNSFW: this.config.includeNSFW || false,
        
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL']
        },
        
        scrollTimeout: 40
      };

      console.log('📋 Reddit scraper input:', JSON.stringify(runInput, null, 2));

      const events = await this.runRedditActor(runInput);
      
      console.log(`✅ Reddit scraping completed: ${events.length} events found`);
      
      return {
        success: true,
        events: events,
        platform: 'reddit',
        query,
        location,
        scrapedAt: new Date(),
      };
      
    } catch (error) {
      console.error('❌ Reddit scraping failed:', error);
      return {
        success: false,
        events: [],
        error: error instanceof Error ? error.message : 'Unknown Reddit scraping error',
        platform: 'reddit',
        query,
        location,
        scrapedAt: new Date(),
      };
    }
  }

  /**
   * Build Reddit-specific search terms optimized for student content
   */
  private buildRedditSearchTerms(query: string, location: string, keywords: string[]): string[] {
    const searchTerms: string[] = [];
    
    if (location && location !== 'unknown') {
      searchTerms.push(`${query} ${location}`);
      searchTerms.push(`${location} ${query}`);
    }
    
    const studentVariations = [
      'student',
      'students', 
      'study abroad',
      'international student',
      'university',
      'college'
    ];
    
    const relevantSubreddits = [
      'r/studyabroad',
      'r/solotravel', 
      'r/travel',
      'r/college',
      'r/university'
    ];
    
    studentVariations.forEach(variation => {
      if (location && location !== 'unknown') {
        searchTerms.push(`${variation} ${query} ${location}`);
        searchTerms.push(`${query} ${location} ${variation}`);
      } else {
        searchTerms.push(`${variation} ${query}`);
      }
    });
    
    if (location && location !== 'unknown') {
      const locationLower = location.toLowerCase();
      searchTerms.push(`${query} site:reddit.com/r/${locationLower}`);
      searchTerms.push(`${query} site:reddit.com/r/${locationLower}travel`);
    }
    
    keywords.forEach(keyword => {
      if (location && location !== 'unknown') {
        searchTerms.push(`${keyword} ${location}`);
      }
      searchTerms.push(keyword);
    });
    
    const uniqueTerms = [...new Set(searchTerms)];
    console.log(`🔍 Generated ${uniqueTerms.length} Reddit search terms:`, uniqueTerms.slice(0, 5));
    
    return uniqueTerms.slice(0, 10); // Increase limit for more comprehensive search
  }

  /**
   * Run Reddit Scraper Lite actor and process results
   */
  private async runRedditActor(runInput: any): Promise<RawEvent[]> {
    try {
      console.log(`🚀 Starting Reddit scraper with actor ID: ${REDDIT_SCRAPER_LITE_ACTOR_ID}`);
      
      const run = await this.apifyClient
        .actor(REDDIT_SCRAPER_LITE_ACTOR_ID)
        .start(runInput);

      console.log(`🚀 Reddit scraper started with run ID: ${run.id}`);

      // Wait for the run to complete and get results
      const events = await this.waitForRedditRunCompletion(run.id);

      return events;
    } catch (error) {
      console.error(`Error running Reddit scraper:`, error);
      throw error;
    }
  }

  /**
   * Wait for Reddit scraper run to complete and fetch results
   */
  private async waitForRedditRunCompletion(runId: string): Promise<RawEvent[]> {
    const maxWaitTime = this.config.timeout;
    const startTime = Date.now();
    const checkInterval = 10000; // Check every 10 seconds for Reddit scraping

    console.log(`⏳ Waiting for Reddit scraper to complete (max ${maxWaitTime/1000}s)...`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const run = await this.apifyClient.run(runId).get();
        
        if (!run) {
          throw new Error('Failed to get run information from Apify');
        }
        
        const status = run.status;

        console.log(`📊 Reddit scraper status: ${status}`);

        if (status === 'SUCCEEDED') {
          console.log(`✅ Reddit scraper completed successfully, fetching results...`);
          
          const { items } = await this.apifyClient.run(runId).dataset().listItems();
          console.log(`📥 Retrieved ${items.length} raw Reddit results`);
          
          return this.processRedditResults(items);
        }

        if (status === 'FAILED') {
          const errorMessage = run.statusMessage || 'Unknown error';
          throw new Error(`Reddit scraper run failed: ${errorMessage}`);
        }

        if (status === 'ABORTED') {
          throw new Error('Reddit scraper run was aborted');
        }

        // Wait before checking again for running/ready states
        await this.delay(checkInterval);
      } catch (error) {
        console.error(`❌ Error checking Reddit run status:`, error);
        throw error;
      }
    }

    throw new Error('Reddit scraper run timed out');
  }

  /**
   * Process raw Reddit results into structured events
   */
  private processRedditResults(rawResults: any[]): RawEvent[] {
    console.log(`🔄 Processing ${rawResults.length} Reddit results...`);
    
    const events: RawEvent[] = [];
    
    for (const result of rawResults) {
      try {
        if (result.dataType === 'post') {
          const event = this.transformRedditPostToEvent(result);
          if (event) events.push(event);
        } else if (result.dataType === 'comment') {
          const event = this.transformRedditCommentToEvent(result);
          if (event) events.push(event);
        }
      } catch (error) {
        console.warn(`Failed to process Reddit result:`, error);
        continue;
      }
    }
    
    console.log(`✅ Processed ${events.length} Reddit events`);
    return events;
  }

  /**
   * Transform Reddit post to RawEvent format
   */
  private transformRedditPostToEvent(post: any): RawEvent | null {
    if (!post.title || !post.body) {
      return null;
    }

    const description = `${post.title}\n\n${post.body}`;
    
    return {
      id: post.id || post.parsedId || `reddit_post_${Date.now()}`,
      title: post.title,
      description: description,
      location: this.extractLocationFromRedditContent(description),
      dateTime: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
      platform: 'reddit',
      sourceUrl: post.url || `https://reddit.com${post.parsedId ? `/comments/${post.parsedId}` : ''}`,
      rawData: post,
      organizer: post.username,
      tags: [post.communityName, post.parsedCommunityName].filter(Boolean),
    };
  }

  /**
   * Transform Reddit comment to RawEvent format (for recommendations)
   */
  private transformRedditCommentToEvent(comment: any): RawEvent | null {
    if (!comment.body || comment.body.length < 20) {
      return null; // Skip very short comments
    }

    return {
      id: comment.id || comment.parsedId || `reddit_comment_${Date.now()}`,
      title: `Recommendation: ${comment.body.substring(0, 100)}...`,
      description: comment.body,
      location: this.extractLocationFromRedditContent(comment.body),
      dateTime: comment.createdAt ? new Date(comment.createdAt).toISOString() : undefined,
      platform: 'reddit',
      sourceUrl: comment.url || `https://reddit.com${comment.parsedId ? `/comments/${comment.parentId}/${comment.parsedId}` : ''}`,
      rawData: comment,
      organizer: comment.username,
      tags: [comment.communityName, comment.category].filter(Boolean),
    };
  }

  /**
   * Extract location information from Reddit content
   */
  private extractLocationFromRedditContent(content: string): string | undefined {
    const locationPatterns = [
      /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/, // "New York", "Los Angeles"
      /\b([A-Z][a-z]+)\b/, // Single city names
      /\bin ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, // "in London", "in New York"
      /\bat ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, // "at Barcelona", "at Paris"
    ];

    for (const pattern of locationPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return undefined;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if Reddit scraper is available
   */
  isAvailable(): boolean {
    return !!this.config.apiToken && this.config.apiToken !== 'mock-apify-token';
  }
}

export function createRedditScraperService(config: RedditScrapingConfig): RedditScraperService {
  return new RedditScraperService(config);
}
