import { z } from 'zod';
import { ApifyClient } from 'apify-client';

// Types for Apify integration
export interface RawEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  dateTime?: string;
  platform: string;
  sourceUrl: string;
  rawData: any;
  imageUrl?: string;
  organizer?: string;
  price?: string;
  ageRestriction?: string;
  tags?: string[];
}

export interface ScrapingResult {
  success: boolean;
  events: RawEvent[];
  error?: string;
  platform: string;
  query: string;
  location: string;
  scrapedAt: Date;
}

export interface ApifyConfig {
  apiToken: string;
  timeout: number;
  rateLimitDelay: number;
}

// Instagram scraper actor configuration
const INSTAGRAM_ACTOR_ID = 'reGe1ST3OBgYZSsZJ'; // Your Instagram Hashtag Scraper
const TWITTER_ACTOR_ID = 'apify/twitter-scraper';
const TIKTOK_ACTOR_ID = 'apify/tiktok-scraper';

export class ApifyService {
  private config: ApifyConfig;
  private apifyClient: ApifyClient;

  constructor(config: ApifyConfig) {
    this.config = config;
    this.apifyClient = new ApifyClient({ token: config.apiToken });
  }

  /**
   * Scrape events from multiple social media platforms
   */
  async scrapeEventsFromMultiplePlatforms(
  query: string,
  location: string,
    platforms: string[] = ['instagram', 'twitter', 'tiktok'],
  ): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];

    for (const platform of platforms) {
      try {
        console.log(
          `Scraping ${platform} for query: "${query}" in ${location}`,
        );

        let result: ScrapingResult;

        switch (platform) {
          case 'instagram':
            result = await this.scrapeInstagramEvents(query, location);
            break;
          case 'twitter':
            result = await this.scrapeTwitterEvents(query, location);
            break;
          case 'tiktok':
            result = await this.scrapeTikTokEvents(query, location);
            break;
          default:
            console.warn(`Unsupported platform: ${platform}`);
            continue;
        }

        results.push(result);

        // Rate limiting between platforms
        if (platforms.indexOf(platform) < platforms.length - 1) {
          await this.delay(this.config.rateLimitDelay);
        }
      } catch (error) {
        console.error(`Error scraping ${platform}:`, error);
        results.push({
          success: false,
          events: [],
          error: error instanceof Error ? error.message : 'Unknown error',
          platform,
          query,
          location,
          scrapedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Scrape Instagram for events
   */
  async scrapeInstagramEvents(
    query: string,
    location: string,
  ): Promise<ScrapingResult> {
    // Generate hashtags from query and location
    const hashtags = this.generateHashtags(query, location);

    const runInput = {
      hashtags: hashtags,
      resultsLimit: 50,
      addParentData: false,
    };

    return await this.runApifyActor(INSTAGRAM_ACTOR_ID, runInput, 'instagram');
  }

  /**
   * Scrape Twitter for events
   */
  async scrapeTwitterEvents(
  query: string,
  location: string,
  ): Promise<ScrapingResult> {
    const searchQuery = this.buildSearchQuery(query, location);

    const runInput = {
      searchTerms: [searchQuery],
      searchMode: 'live',
      maxTweets: 50,
      addUserInfo: true,
      searchType: 'recent',
      language: 'en',
      location: location,
    };

    return await this.runApifyActor(TWITTER_ACTOR_ID, runInput, 'twitter');
  }

  /**
   * Scrape TikTok for events
   */
  async scrapeTikTokEvents(
  query: string,
  location: string,
  ): Promise<ScrapingResult> {
    const searchQuery = this.buildSearchQuery(query, location);

    const runInput = {
      searchTerms: [searchQuery],
      resultsLimit: 50,
      searchType: 'video',
      language: 'en',
      location: location,
    };

    return await this.runApifyActor(TIKTOK_ACTOR_ID, runInput, 'tiktok');
  }

  /**
   * Run an Apify actor and process results
   */
  private async runApifyActor(
    actorId: string,
    runInput: any,
    platform: string,
  ): Promise<ScrapingResult> {
    try {
      console.log(`🚀 Starting actor ${actorId} for platform ${platform}`);
      
      const run = await this.apifyClient
        .actor(actorId)
        .start(runInput);

      console.log(`Started actor ${actorId} with run ID: ${run.id}`);

      // Wait for the run to complete
      const events = await this.waitForRunCompletion(run.id, platform);

      return {
        success: true,
        events,
        platform,
        query: runInput.searchQuery || runInput.searchTerms?.[0] || 'unknown',
        location: runInput.location || 'unknown',
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error(`Error running Apify actor ${actorId}:`, error);
      throw error;
    }
  }

  /**
   * Wait for Apify run to complete and fetch results
   */
  private async waitForRunCompletion(
    runId: string,
    platform: string,
  ): Promise<RawEvent[]> {
    const maxWaitTime = this.config.timeout;
    const startTime = Date.now();
    const checkInterval = 5000; // Check every 5 seconds

    console.log(`⏳ Waiting for ${platform} run ${runId} to complete...`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const run = await this.apifyClient.run(runId).get();
        
        if (!run) {
          throw new Error('Failed to get run information from Apify');
        }

        console.log(`📊 ${platform} run status: ${run.status}`);

        if (run.status === 'SUCCEEDED') {
          console.log(`✅ ${platform} run completed successfully, fetching results...`);
          
          const { items } = await this.apifyClient.run(runId).dataset().listItems();
          console.log(`📥 Retrieved ${items.length} raw ${platform} results`);
          
          return this.processRawResults(items, platform);
        }

        if (run.status === 'FAILED') {
          const errorMessage = run.statusMessage || 'Unknown error';
          throw new Error(`${platform} run failed: ${errorMessage}`);
        }

        if (run.status === 'ABORTED') {
          throw new Error(`${platform} run was aborted`);
        }

        // Wait before checking again
        await this.delay(checkInterval);
      } catch (error) {
        console.error(`❌ Error checking ${platform} run status:`, error);
        throw error;
      }
    }

    throw new Error(`${platform} run timed out`);
  }

  /**
   * Process raw scraping results into structured events
   */
  private processRawResults(rawResults: any[], platform: string): RawEvent[] {
    return rawResults
      .filter((result) => this.isEventRelevant(result, platform))
      .map((result) => this.transformToRawEvent(result, platform));
  }

  /**
   * Check if a scraped result is relevant for event discovery
   */
  private isEventRelevant(result: any, platform: string): boolean {
    // Basic relevance filtering - can be enhanced with AI later
    const text = this.extractText(result, platform).toLowerCase();

    const eventKeywords = [
      'event',
      'party',
      'meetup',
      'concert',
      'festival',
      'workshop',
      'class',
      'tour',
      'exhibition',
      'show',
      'performance',
      'seminar',
      'conference',
      'networking',
      'social',
      'gathering',
      'celebration',
      'launch',
      'opening',
    ];

    const locationKeywords = [
      'london',
      'paris',
      'new york',
      'tokyo',
      'berlin',
      'amsterdam',
      'venue',
      'location',
      'address',
      'place',
      'area',
      'district',
    ];

    const hasEventKeyword = eventKeywords.some((keyword) =>
      text.includes(keyword),
    );
    const hasLocationKeyword = locationKeywords.some((keyword) =>
      text.includes(keyword),
    );
    const hasDate = this.extractDate(result, platform);

    return hasEventKeyword && (hasLocationKeyword || Boolean(hasDate));
  }

  /**
   * Transform scraped result to RawEvent format
   */
  private transformToRawEvent(result: any, platform: string): RawEvent {
    const text = this.extractText(result, platform);
    const date = this.extractDate(result, platform);
    const location = this.extractLocation(result, platform);
    const imageUrl = this.extractImageUrl(result, platform);

    return {
      id: result.id || result.url || `temp_${Date.now()}_${Math.random()}`,
      title: this.extractTitle(text, platform),
      description: text,
      location,
      dateTime: date,
      platform,
      sourceUrl: result.url || result.link || result.permalink || '',
      rawData: result,
      imageUrl,
      organizer: this.extractOrganizer(result, platform),
      price: this.extractPrice(result, platform),
      ageRestriction: this.extractAgeRestriction(result, platform),
      tags: this.extractTags(result, platform),
    };
  }

  /**
   * Extract text content from different platform formats
   */
  private extractText(result: any, platform: string): string {
    switch (platform) {
      case 'instagram':
        return result.caption || result.text || result.description || '';
      case 'twitter':
        return result.text || result.full_text || result.description || '';
      case 'tiktok':
        return result.desc || result.text || result.description || '';
      default:
        return result.text || result.description || result.content || '';
    }
  }

  /**
   * Extract title from text content
   */
  private extractTitle(text: string, platform: string): string {
    // Take first line or first 100 characters as title
    const lines = text.split('\n').filter((line) => line.trim());
    const firstLine = lines[0] || text;
    return firstLine.length > 100
      ? `${firstLine.substring(0, 100)}...`
      : firstLine;
  }

  /**
   * Extract date from different platform formats
   */
  private extractDate(result: any, platform: string): string | undefined {
    const dateFields = [
      'date',
      'created_at',
      'timestamp',
      'time',
      'published_at',
    ];

    for (const field of dateFields) {
      if (result[field]) {
        return new Date(result[field]).toISOString();
      }
    }

    return undefined;
  }

  /**
   * Extract location from different platform formats
   */
  private extractLocation(result: any, platform: string): string | undefined {
    const locationFields = [
      'location',
      'place',
      'venue',
      'address',
      'city',
      'country',
    ];

    for (const field of locationFields) {
      if (result[field]) {
        return result[field];
      }
    }

    return undefined;
  }

  /**
   * Extract image URL from different platform formats
   */
  private extractImageUrl(result: any, platform: string): string | undefined {
    const imageFields = [
      'image',
      'image_url',
      'media_url',
      'thumbnail',
      'preview',
    ];

    for (const field of imageFields) {
      if (result[field]) {
        return result[field];
      }
    }

    return undefined;
  }

  /**
   * Extract organizer information
   */
  private extractOrganizer(result: any, platform: string): string | undefined {
    const organizerFields = [
      'author',
      'username',
      'user',
      'creator',
      'host',
      'organizer',
    ];

    for (const field of organizerFields) {
      if (result[field]) {
        const user = result[field];
        return typeof user === 'string'
          ? user
          : user.name || user.username || user.display_name;
      }
    }

    return undefined;
  }

  /**
   * Extract price information
   */
  private extractPrice(result: any, platform: string): string | undefined {
    const priceFields = ['price', 'cost', 'fee', 'ticket_price', 'admission'];

    for (const field of priceFields) {
      if (result[field]) {
        return result[field];
    }
  }

  return undefined;
}

  /**
   * Extract age restriction information
   */
  private extractAgeRestriction(
    result: any,
    platform: string,
  ): string | undefined {
    const ageFields = [
      'age_restriction',
      'age_limit',
      'min_age',
      'age_requirement',
    ];

    for (const field of ageFields) {
      if (result[field]) {
        return String(result[field]);
      }
    }

    return undefined;
  }

  /**
   * Extract tags from different platform formats
   */
  private extractTags(result: any, platform: string): string[] {
    const tagFields = ['hashtags', 'tags', 'keywords', 'categories'];

    for (const field of tagFields) {
      if (result[field] && Array.isArray(result[field])) {
        return result[field];
      }
    }

    return [];
  }

  /**
   * Build search query combining event terms with location
   */
  private buildSearchQuery(query: string, location: string): string {
    const eventTerms = ['event', 'party', 'meetup', 'activity', 'thing to do'];
    const combinedTerms = eventTerms.map((term) => `${term} ${location}`);
    return `${query} ${location} ${combinedTerms.join(' OR ')}`;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate hashtags from query and location for Instagram scraping
   */
  private generateHashtags(query: string, location: string): string[] {
    const hashtags: string[] = [];

    // Convert query to hashtag-friendly format
    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .split(/\s+/)
      .filter((word) => word.length > 2); // Remove short words

    // Single word hashtags
    queryWords.forEach((word) => {
      hashtags.push(word);
    });

    // Combined hashtags
    if (queryWords.length >= 2) {
      hashtags.push(queryWords.join(''));
      hashtags.push(queryWords.slice(0, 2).join(''));
    }

    // Location-based hashtags
    if (location) {
      const locationWords = location
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/);
      locationWords.forEach((word) => {
        if (word.length > 2) {
          hashtags.push(word);
          hashtags.push(`${word}events`);
          hashtags.push(`${word}nightlife`);
        }
      });
    }

    // Student-related hashtags
    hashtags.push(
      'studyabroad',
      'students',
      'university',
      'college',
      'international',
    );

    // Remove duplicates and limit to 10 hashtags
    return [...new Set(hashtags)].slice(0, 10);
  }
}

// Factory function to create Apify service
export function createApifyService(config: ApifyConfig): ApifyService {
  return new ApifyService(config);
}
