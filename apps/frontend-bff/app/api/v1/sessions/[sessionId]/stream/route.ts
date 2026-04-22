import { retiredLegacyRouteResponse } from "../../../../../../src/retired-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return retiredLegacyRouteResponse("sessions");
}
