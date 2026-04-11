import { getNotificationsStream } from "../../../../../src/handlers";

export async function GET(request: Request) {
  return getNotificationsStream(request);
}
