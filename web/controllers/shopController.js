import shopify from "../config/shopify.js";
import Store from "../models/store.js";

export const getShopInfo = async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    if (!session) {
      return res.status(401).json({ error: "No Shopify session" });
    }

    const shopDomain = session.shop;

    // 1. Kiểm tra shop đã tồn tại trong DB chưa
    let existingStore = await Store.findOne({ shop: shopDomain });
    if (existingStore) {
      console.log("Shop đã tồn tại trong DB:", existingStore.shop);
      return res.status(200).json({ shop: existingStore });
    }

    // 2. Nếu chưa có thì gọi Shopify API để lấy dữ liệu
    const client = new shopify.api.clients.Graphql({ session });
    const query = `
      query shopInfo {
        shop {
          id
          name
          email
          myshopifyDomain
          contactEmail
          createdAt
          updatedAt
          ianaTimezone
          currencyCode
          plan { displayName }
          billingAddress {
            address1 address2 city country zip phone
          }
        }
      }
    `;
    
    const response = await client.request(query);
    const shopData = response.data.shop;
    if (!shopData) throw new Error("Shop data not returned from Shopify");

    const storeData = {
      shop: shopData.myshopifyDomain,
      id: shopData.id.split("/").pop(),
      name: shopData.name,
      email: shopData.email,
      domain: shopData.myshopifyDomain,
      myshopify_domain: shopData.myshopifyDomain,
      scope: session.scope,
      country: shopData.billingAddress?.country || "",
      customer_email: shopData.contactEmail,
      plan_name: shopData.plan.displayName,
      plan_display_name: shopData.plan.displayName,
      shop_owner: shopData.name,
      iana_timezone: shopData.ianaTimezone,
      currency: shopData.currencyCode,
      address1: shopData.billingAddress?.address1 || "",
      address2: shopData.billingAddress?.address2 || "",
      phone: shopData.billingAddress?.phone || "",
      created_at: shopData.createdAt,
      updated_at: shopData.updatedAt,
      access_token: session.accessToken,
    };

    // 4. Lưu DB
    const newStore = await Store.create(storeData);
    console.log("Shop mới được lưu:", newStore.shop);

    res.status(200).json({ shop: newStore });
  } catch (error) {
    console.error("Failed to fetch shop info:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllStores = async (req, res) => {
  try {
    const stores = await Store.find({});
    console.log("Fetched stores:", stores);
    res.status(200).json(stores);
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    res.status(500).json({ error: error.message });
  }
};
