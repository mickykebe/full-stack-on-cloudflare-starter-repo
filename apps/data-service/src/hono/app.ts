import { getDestinationForCountry, getRoutingDestinations } from "@/helpers/route-ops";
import { getLink } from "@repo/data-ops/queries/links";
import { cloudflareInfoSchema } from "@repo/data-ops/zod-schema/links";
import { LinkClickMessageType } from "@repo/data-ops/zod-schema/queue";
import { Hono } from "hono";

export const App = new Hono<{ Bindings: Env }>();

/* App.get("/do/:name", async (c) => {
  const name = c.req.param("name");
  const doId = c.env.EVALUATION_SCHEDULER.idFromName(name);
  const stub = c.env.EVALUATION_SCHEDULER.get(doId);
  await stub.increment();
  const count = await stub.getCount();
  return c.json({
    count,
  });
}); */

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
  const queueMessage: LinkClickMessageType = {
    type: "LINK_CLICK",
    data: {
      id: linkId,
      country: headers.country,
      destination: destination,
      accountId: linkInfo.accountId,
      latitude: headers.latitude,
      longitude: headers.longitude,
      timestamp: new Date().toISOString(),
    }
  }
  c.executionCtx.waitUntil(c.env.QUEUE.send(queueMessage));
  return c.redirect(destination);
})