import { Adapter } from "./adapters/Adapter.js";
import { DemoPredictAdapter } from "./adapters/demoPredict.js";
import { LocalSimAdapter } from "./adapters/localSim.js";

export const adapters: Adapter[] = [
  new DemoPredictAdapter(),
  new LocalSimAdapter(),
];

export function getAdapterByVenue(venue: string) {
  return adapters.find(a => a.venue === venue);
}

export function parseGlobalId(global: string) {
  const [venue, venueMarketId] = global.split("|");
  return { venue, venueMarketId };
}
