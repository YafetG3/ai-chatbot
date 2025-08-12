import { getWeather } from './get-weather'
import { createDocument } from './create-document'
import { updateDocument } from './update-document'
import { requestSuggestions } from './request-suggestions'
import { eventDiscoveryTool } from './event-discovery'

export const tools = {
  getWeather,
  createDocument,
  updateDocument,
  requestSuggestions,
  eventDiscovery: eventDiscoveryTool
}
