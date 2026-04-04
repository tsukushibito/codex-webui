import { getApprovalStream } from "../../../../../src/handlers";

export async function GET(request: Request) {
  return getApprovalStream(request);
}
