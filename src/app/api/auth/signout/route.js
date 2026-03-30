import { clearSessionResponse } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST() {
  return clearSessionResponse();
}
