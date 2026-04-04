import { listApprovals } from "../../../../src/handlers";

export async function GET(request: Request) {
  return listApprovals(request);
}
