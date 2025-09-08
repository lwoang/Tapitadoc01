import express from "express";
import serveStatic from "serve-static";
import { join } from "path";
import { readFileSync } from "fs";
import cookieParser from "cookie-parser";
import imageRoutes from "./routes/api/imageRoutes.js";

import shopify from "./config/shopify.js";
import { connectMongoDB } from "./utils/mongodb.js";
import routes from "./routes/index.js"; 
import PrivacyWebhookHandlers from "./webhooks/privacy.js";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

connectMongoDB();

const app = express();
app.use(express.json());
app.use(cookieParser());


app.use("/api/images", imageRoutes);


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

app.use("/api", routes);

app.use("/api/shopify/*", shopify.validateAuthenticatedSession());

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
