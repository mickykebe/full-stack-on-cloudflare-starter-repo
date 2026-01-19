import { getLink } from "@repo/data-ops/queries/links";
import { linkSchema, LinkSchemaType } from "@repo/data-ops/zod-schema/links";
import { LinkClickMessageType } from "@repo/data-ops/zod-schema/queue";

export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string) {
  if(countryCode && linkInfo.destinations[countryCode]) {
    return linkInfo.destinations[countryCode];
  }
  return linkInfo.destinations.default;
}

export async function getLinkInfoFromKV(env: Env, id: string) {
  const linkInfo = await env.CACHE.get(id);
  if(!linkInfo) return null;
  try {
    const parsedLinkInfo = JSON.parse(linkInfo);
    return linkSchema.parse(parsedLinkInfo);
  } catch(error) {
    return null;
  }
}

const TTL_TIME = 60 * 60 * 24; // 1 day;

async function saveLinkInfoToKV(env: Env, id: string, linkInfo: LinkSchemaType) {
  try {
    await env.CACHE.put(id, JSON.stringify(linkInfo), {
      expirationTtl: TTL_TIME,
    });
  } catch(error) {
    console.error("Error saving link to KV:", error);
  }
}

export async function getRoutingDestinations(env: Env, id: string) {
  let linkInfo = await getLinkInfoFromKV(env, id);
  if(linkInfo) return linkInfo;
  linkInfo = await getLink(id);
  if(!linkInfo) return null;
  await saveLinkInfoToKV(env, id, linkInfo);
  return linkInfo;
}

export async function scheduleEvalWorkflow(env: Env, event: LinkClickMessageType) {
  const doId = env.EVALUATION_SCHEDULER.idFromName(`${event.data.id}:${event.data.destination}`);
  const stub = env.EVALUATION_SCHEDULER.get(doId);
  await stub.collectLinkClick(event.data.accountId, event.data.id, event.data.destination, event.data.country || "UNKNOWN")
}