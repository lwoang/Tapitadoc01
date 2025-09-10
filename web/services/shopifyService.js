import shopify from "../config/shopify.js";

export async function shopifyRequest(session, query, variables = {}) {
  const client = new shopify.api.clients.Graphql({ session });
  const result = await client.query({ data: { query, variables } });
  return result.body.data;
}
