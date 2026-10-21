import { joinRoom } from "@/lib/rooms";
type Context = { params: Promise<{ code: string }> };
export async function POST(req: Request, ctx: Context) {
  return joinRoom(req, (await ctx.params).code.toUpperCase());
}
