import { getHome } from "../../../../src/handlers";

export async function GET(request: Request) {
  return getHome(request);
}
