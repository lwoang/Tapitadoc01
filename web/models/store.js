import mongoose from "mongoose";

const storeSchema = new mongoose.Schema({
  id: {
    type: String, // Shopify ID (dạng số cuối của gid)
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: String,
  shop: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
  scope: String,
  country: String,
  customer_email: String,
  myshopify_domain: {
    type: String,
    required: true,
  },
  plan_name: String,
  plan_display_name: String,
  shop_owner: String,
  iana_timezone: String,
  currency: String,
  address1: String,
  address2: String,
  phone: String,
  created_at: {
    type: Date,
  },
  updated_at: {
    type: Date,
  },
  access_token: {
    type: String,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("Store", storeSchema);
