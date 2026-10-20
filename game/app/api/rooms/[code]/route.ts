import { getRoom, actRoom } from "@/lib/rooms";
type Context = { params: Promise<{ code: string }> };
export async function GET(req: Request, ctx: Context) {
  return getRoom(req, (await ctx.params).code.toUpperCase());
}
export async function POST(req: Request, ctx: Context) {
  return actRoom(req, (await ctx.params).code.toUpperCase());
}
