import { getDb } from "@/db/database";
import { linkClicks, links } from "@/drizzle-out/schema";
import { CreateLinkSchemaType, destinationsSchema, DestinationsSchemaType, linkSchema } from "@/zod/links";
import { LinkClickMessageType } from "@/zod/queue";
import { and, desc, eq, gt } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function createLink(data: CreateLinkSchemaType & { accountId: string}) {
  const db = getDb();
  const id = nanoid(10);
  await db.insert(links).values({
    linkId: id,
    accountId: data.accountId,
    name: data.name,
    destinations: JSON.stringify(data.destinations),
  });
  return id;
}


export async function getLinks(accountId: string, createdBefore?: string) {
  const db = getDb();
  const conditions = [eq(links.accountId, accountId)];
  if(createdBefore) {
    conditions.push(gt(links.created, createdBefore))
  }
  const results = await db.select({
    linkId: links.linkId,
    destinations: links.destinations,
    created: links.created,
    name: links.name,
  }).from(links)
  .where(and(...conditions))
  .orderBy(desc(links.created))
  .limit(25);
  return results.map((link) => {
    return {
      ...link,
      lastSixHours: Array.from({ length: 6 }, () => {
        return Math.floor(Math.random() * 100);
      }),
      linkClicks: 6,
      destinations: Object.keys(JSON.parse(link.destinations)).length,
    }
  })
}

export async function updateLinkName(linkId: string, name: string) {
  const db = getDb();
  await db.update(links).set({
    name,
    updated: new Date().toISOString(),
  }).where(eq(links.linkId, linkId));
}

export async function getLink(linkId: string) {
  const db = getDb();
  const results = await db.select().from(links).where(eq(links.linkId, linkId)).limit(1);
  if(!results.length) {
    return null;
  }
  const link = results[0];
  const parsedLink = linkSchema.safeParse(link);
  if(parsedLink.error) {
    console.log(parsedLink.error);
    throw new Error("BAD_REQUEST Error Parsing Link");
  }
  return parsedLink.data;
}

export async function updateLinkDestinations(linkId: string, destinations: DestinationsSchemaType) {
  const parsedDestination = destinationsSchema.parse(destinations);
  const db = getDb();
  await db.update(links).set({
    destinations: JSON.stringify(parsedDestination),
    updated: new Date().toISOString(),
  }).where(eq(links.linkId, linkId));
}

export async function addLinkClick(info: LinkClickMessageType["data"]) {
  const db = getDb();
  await db.insert(linkClicks).values({
    id: info.id,
    accountId: info.accountId,
    country: info.country,
    destination: info.destination,
    clickedTime: info.timestamp,
    latitude: info.latitude,
    longitude: info.longitude,
  });
}