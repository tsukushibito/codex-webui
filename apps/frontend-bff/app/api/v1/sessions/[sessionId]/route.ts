import { retiredLegacyRouteResponse } from "../../../../../src/retired-routes";

export function GET() {
  return retiredLegacyRouteResponse("sessions");
}
