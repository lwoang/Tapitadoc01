import express from "express";
import serveStatic from "serve-static";
import { join } from "path";
import { readFileSync } from "fs";

import shopify from "./config/shopify.js";
import { connectMongoDB } from "./utils/mongodb.js";
import routes from "./routes/index.js";
import PrivacyWebhookHandlers from "./webhooks/privacy.js";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);
const STATIC_PATH = process.env.NODE_ENV === "production" ? `${process.cwd()}/frontend/dist` : `${process.cwd()}/frontend/`;

connectMongoDB();

const app = express();

// Shopify auth & webhook setup
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(shopify.config.auth.callbackPath, shopify.auth.callback(), shopify.redirectToShopifyOrAppRoot());
app.post(shopify.config.webhooks.path, shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers }));

// Middlewares
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());

// Main API routes
app.use("/api", routes);

// CSP headers & static files
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html")).toString().replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT, () => console.log(`App running on port ${PORT}`));