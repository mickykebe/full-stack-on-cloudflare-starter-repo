import { getDestinationForCountry, getRoutingDestinations } from "@/helpers/route-ops";
import { getLink } from "@repo/data-ops/queries/links";
import { cloudflareInfoSchema } from "@repo/data-ops/zod-schema/links";
import { Hono } from "hono";

export const App = new Hono<{ Bindings: Env }>();

App.get("/:id", async (c) => {
  const linkId = c.req.param("id");
  const linkInfo = await getRoutingDestinations(c.env, linkId);
  if(!linkInfo) {
    return c.text("Resource not found", 404);
  }
  const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf);
  if(!cfHeader.success) {
    return c.text("Invalid cloudflare headers", 400);
  }
  const headers = cfHeader.data;
  const destination = getDestinationForCountry(linkInfo, headers.country);
  return c.redirect(destination);
})