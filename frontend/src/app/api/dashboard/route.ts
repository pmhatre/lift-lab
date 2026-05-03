import { dashboard } from "@/lib/data/analytics";
import { ok } from "@/lib/api-helpers";

export async function GET() {
  const data = await dashboard();
  return ok(data);
}
