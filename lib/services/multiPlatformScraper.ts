import { ApifyService, RawEvent, ScrapingResult } from './apify';

export interface ScrapingPlatform {
  name: string;
  scrapeEvents(query: string, location: string, keywords: string[]): Promise<ScrapingResult>;
  isAvailable(): boolean;
}

export class BrightDataService implements ScrapingPlatform {
  name = 'BrightData';
  private config: { apiToken: string; timeout: number };

  constructor(config: { apiToken: string; timeout: number }) {
    this.config = config;
  }

  async scrapeEvents(query: string, location: string, keywords: string[]): Promise<ScrapingResult> {
    console.log(`🔍 BrightData scraping for: ${query} in ${location}`);
    
    return {
      success: false,
      events: [],
      error: 'BrightData integration not yet implemented',
      platform: this.name,
      query,
      location,
      scrapedAt: new Date(),
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiToken && this.config.apiToken !== 'mock-bright-data-token';
  }
}

export class ScrapFlyService implements ScrapingPlatform {
  name = 'ScrapFly';
  private config: { apiToken: string; timeout: number };

  constructor(config: { apiToken: string; timeout: number }) {
    this.config = config;
  }

  async scrapeEvents(query: string, location: string, keywords: string[]): Promise<ScrapingResult> {
    console.log(`🔍 ScrapFly scraping for: ${query} in ${location}`);
    
    return {
      success: false,
      events: [],
      error: 'ScrapFly integration not yet implemented',
      platform: this.name,
      query,
      location,
      scrapedAt: new Date(),
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiToken && this.config.apiToken !== 'mock-scrapfly-token';
  }
}

export class ScraperAPIService implements ScrapingPlatform {
  name = 'ScraperAPI';
  private config: { apiToken: string; timeout: number };

  constructor(config: { apiToken: string; timeout: number }) {
    this.config = config;
  }

  async scrapeEvents(query: string, location: string, keywords: string[]): Promise<ScrapingResult> {
    console.log(`🔍 ScraperAPI scraping for: ${query} in ${location}`);
    
    return {
      success: false,
      events: [],
      error: 'ScraperAPI integration not yet implemented',
      platform: this.name,
      query,
      location,
      scrapedAt: new Date(),
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiToken && this.config.apiToken !== 'mock-scraperapi-token';
  }
}

export class MultiPlatformScraper {
  private platforms: ScrapingPlatform[] = [];

  constructor() {
    if (process.env.APIFY_API_TOKEN) {
      const apifyService = new ApifyService({
        apiToken: process.env.APIFY_API_TOKEN,
        timeout: parseInt(process.env.APIFY_TIMEOUT || '300000'),
        rateLimitDelay: 1000,
      });
      
      this.platforms.push({
        name: 'Apify',
        scrapeEvents: (query: string, location: string, keywords: string[]) => 
          apifyService.scrapeInstagramEvents(query, location),
        isAvailable: () => !!process.env.APIFY_API_TOKEN && process.env.APIFY_API_TOKEN !== 'mock-apify-token',
      });
    }

    if (process.env.BRIGHT_DATA_API_TOKEN) {
      this.platforms.push(new BrightDataService({
        apiToken: process.env.BRIGHT_DATA_API_TOKEN,
        timeout: 300000,
      }));
    }

    if (process.env.SCRAPFLY_API_TOKEN) {
      this.platforms.push(new ScrapFlyService({
        apiToken: process.env.SCRAPFLY_API_TOKEN,
        timeout: 300000,
      }));
    }

    if (process.env.SCRAPERAPI_API_TOKEN) {
      this.platforms.push(new ScraperAPIService({
        apiToken: process.env.SCRAPERAPI_API_TOKEN,
        timeout: 300000,
      }));
    }
  }

  async scrapeFromAllPlatforms(
    query: string,
    location: string,
    keywords: string[],
    maxResultsPerPlatform: number = 10
  ): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];

    const scrapingPromises = this.platforms.map(async (platform) => {
      try {
        console.log(`🔍 Scraping from ${platform.name}...`);
        const result = await platform.scrapeEvents(query, location, keywords);
        
        if (result.events.length > maxResultsPerPlatform) {
          result.events = result.events.slice(0, maxResultsPerPlatform);
        }
        
        return result;
      } catch (error) {
        console.error(`❌ ${platform.name} scraping failed:`, error);
        return {
          success: false,
          events: [],
          error: error instanceof Error ? error.message : 'Unknown error',
          platform: platform.name,
          query,
          location,
          scrapedAt: new Date(),
        };
      }
    });

    const platformResults = await Promise.allSettled(scrapingPromises);
    
    platformResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    return results;
  }

  getAvailablePlatforms(): string[] {
    return this.platforms.filter(p => p.isAvailable()).map(p => p.name);
  }
}
