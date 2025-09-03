import express from "express";
import serveStatic from "serve-static";
import { join } from "path";
import { readFileSync } from "fs";

import shopify from "./config/shopify.js";
import { connectMongoDB } from "./utils/mongodb.js";
import routes from "./routes/index.js"; // /api/login, /api/stores
import PrivacyWebhookHandlers from "./webhooks/privacy.js";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

connectMongoDB();

const app = express();
app.use(express.json());

// ---------------- Shopify auth & webhooks ----------------
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// ---------------- API routes ----------------
// 👉 Custom API (login, stores) - không cần session Shopify
app.use("/api", routes);

// 👉 Nếu bạn cần API nào chạy trong Shopify app thì cho vào /api/shopify/*
app.use("/api/shopify/*", shopify.validateAuthenticatedSession());

// ---------------- Static frontend ----------------
// 👉 Bỏ ensureInstalledOnShop() để chạy được ngoài Shopify
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", async (_req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace(
          "%VITE_SHOPIFY_API_KEY%",
          process.env.SHOPIFY_API_KEY || ""
        )
    );
});

app.listen(PORT, () => console.log(`App running on http://localhost:${PORT}`));
