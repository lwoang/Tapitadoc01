import shopify from "../config/shopify.js";
import store from "../models/store.js";

export const getShopInfo = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) {
      return res.status(401).send({ error: "No Shopify session" });
    }

    const client = new shopify.api.clients.Graphql({ session });
    const query = `
      query shopInfo {
        shop {
          id
          name
          email
          myshopifyDomain
          contactEmail
          plan {
            displayName
          }
          billingAddress {
            address1
            address2
            city
            country
            zip
            phone
          }
        }
      }
    `;
    
    const response = await client.request(query);
    const shopData = response.data.shop;

    if (!shopData) {
      throw new Error("Shop data not returned from Shopify");
    }

    const storeData = {
      id: shopData.id.split('/').pop(),
      name: shopData.name,
      email: shopData.email,
      shop: shopData.myshopifyDomain,
      domain: shopData.myshopifyDomain,
      scope: session.scope,
      country: shopData.billingAddress.country,
      customer_email: shopData.contactEmail,
      myshopify_domain: shopData.myshopifyDomain,
      plan_name: shopData.plan.displayName, 
      plan_display_name: shopData.plan.displayName,
      shop_owner: shopData.name,
      iana_timezone: shopData.ianaTimezone,
      currency: shopData.currencyCode,
      address1: shopData.billingAddress.address1,
      address2: shopData.billingAddress.address2,
      phone: shopData.billingAddress.phone,
      created_at: shopData.createdAt,
    };

    const filter = { id: storeData.id };
    const update = storeData;
    const options = { new: true, upsert: true };

    const result = await store.findOneAndUpdate(filter, update, options);
    console.log("Saved/Updated store in DB:", result);

    res.status(200).json({ shop: shopData });
  } catch (error) {
    console.error("Failed to fetch shop info:", error);
    res.status(500).send({ error: error.message });
  }
};