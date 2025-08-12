import { tool } from 'ai';
import { z } from 'zod';
import { analyzeUserQuery, generateEventResponse, analyzeScrapedEvents } from '../eventPipeline';
import { getMockScrapingResults } from '../../services/mockData';

export const eventDiscoveryTool = tool({
  description: 'Discover local events and activities for students studying abroad. Use this when users ask about places to go, things to do, events, bars, restaurants, or activities in specific locations.',
  inputSchema: z.object({
    query: z.string().describe('The user\'s query about events or activities'),
    location: z.string().optional().describe('The location mentioned in the query'),
  }),
  execute: async ({ query, location }) => {
    try {
      console.log(`🔍 Event discovery tool called with query: "${query}", location: "${location}"`);
      
      const queryAnalysis = await analyzeUserQuery(query);
      
      if (!queryAnalysis.isEventSearch) {
        return {
          success: false,
          message: 'This query doesn\'t appear to be asking for events or activities.',
        };
      }

      const searchLocation = location || queryAnalysis.location || 'unknown';
      
      const scrapingResults = getMockScrapingResults(query, searchLocation);
      
      if (scrapingResults.length === 0) {
        return {
          success: false,
          message: 'No relevant events found for this query.',
        };
      }

      const allEvents = scrapingResults.flatMap(result => result.events);
      
      const enhancedEvents = await analyzeScrapedEvents(allEvents, query, queryAnalysis);
      
      const response = await generateEventResponse(query, queryAnalysis, enhancedEvents);
      
      return {
        success: true,
        response,
        eventsFound: enhancedEvents.length,
        location: searchLocation,
        events: enhancedEvents.slice(0, 5).map(event => ({
          title: event.title,
          description: event.description,
          location: event.location,
          platform: event.platform,
          sourceUrl: event.sourceUrl,
        })),
      };
    } catch (error) {
      console.error('Event discovery tool error:', error);
      return {
        success: false,
        message: 'Sorry, I encountered an error while searching for events. Please try again.',
      };
    }
  },
});
