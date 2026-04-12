import { getNotificationsStream } from "../../../../../src/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getNotificationsStream(request);
}
