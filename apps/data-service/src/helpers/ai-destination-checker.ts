import { generateObject } from "ai";
import { z } from "zod";
import { createWorkersAI } from 'workers-ai-provider';

const schema = z.object({
  pageStatus: z.object({
    status: z.enum(['AVAILABLE_PRODUCT', 'NOT_AVAILABLE_PRODUCT', 'UNKNOWN_STATUS'], {
      description: `
								Indicates the product's availability on the page:
								- AVAILABLE_PRODUCT: The product appears available for purchase.
								- NOT_AVAILABLE_PRODUCT: The product appears unavailable (sold out, discontinued, etc.).
								- UNKNOWN_STATUS: The status could not be determined from the text.
								`.trim(),
    }),
    statusReason: z.string().describe(`A concise explanation citing specific words, phrases, or patterns from the content that led to this status. If status is UNKNOWN_STATUS, explain what was missing or ambiguous.
							`.trim()),
  }).describe('Information about the product availability status determined from the webpage content.'),
}).describe('The result object returned by the assistant.');

export async function aiDestinationChecker(env: Env, bodyText: string) {
  const workersAI = createWorkersAI({ binding: env.AI });
  const result = await generateObject({
    model: workersAI("@cf/meta/llama-3-8b-instruct"),
    prompt: `You will analyze the provided webpage content and determine if it reflects a product that is currently available, not available, or if the status is unclear.

			Your goal is to:
			- Identify language that indicates product availability (e.g., "in stock", "available for purchase", "add to cart").
			- Identify language that indicates product unavailability (e.g., "out of stock", "sold out", "unavailable", "discontinued").
			- Return "UNKNOWN_STATUS" if you cannot confidently determine the status.

			Provide a clear reason supporting your determination based on the text.

			---
			Webpage Content:
			${bodyText}
			`,
    schema,
  });

  return {
    status: result.object.pageStatus.status,
    statusReason: result.object.pageStatus.statusReason
  };
}