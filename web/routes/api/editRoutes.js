import express from "express";
import shopify from "../../config/shopify.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

async function shopifyRequest(session, query, variables = {}) {
  const client = new shopify.api.clients.Graphql({ session });
  const result = await client.query({
    data: { query, variables },
  });
  return result.body.data;
}

// GET all items
router.get(
  "/:type",
  shopify.validateAuthenticatedSession(),
  async (req, res) => {
    try {
      const { type } = req.params;
      const session = res.locals.shopify.session;

      let query;
      if (type === "products") {
        query = `
        {
          products(first: 10) {
            edges {
              node {
                id
                title
                description
              }
            }
          }
        }
      `;
      } else if (type === "pages") {
        query = `
        {
          pages(first: 10) {
            edges {
              node {
                id
                title
                body
              }
            }
          }
        }
      `;
      } else if (type === "articles") {
        query = `
        {
          articles(first: 10) {
            edges {
              node {
                id
                title
                body
              }
            }
          }
        }
      `;
      } else {
        return res.status(400).json({ success: false, error: "Invalid type" });
      }

      const result = await shopifyRequest(session, query);
      let items = [];

      if (type === "products") {
        items = result.products.edges.map((e) => ({
          id: e.node.id,
          title: e.node.title,
          description: e.node.description,
        }));
      } else if (type === "pages") {
        items = result.pages.edges.map((e) => ({
          id: e.node.id,
          title: e.node.title,
          description: e.node.body,
        }));
      } else if (type === "articles") {
        items = result.articles.edges.map((e) => ({
          id: e.node.id,
          title: e.node.title,
          description: e.node.body,
        }));
      }

      res.json({ success: true, items });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch data from Shopify" });
    }
  }
);

// GET single item
router.get(
  "/:type/:id",
  shopify.validateAuthenticatedSession(),
  async (req, res) => {
    try {
      const { type, id } = req.params;
      const session = res.locals.shopify.session;

      let query;
      if (type === "products") {
        query = `
        query($id: ID!) {
          product(id: $id) {
            id
            title
            description
          }
        }
      `;
      } else if (type === "pages") {
        query = `
        query($id: ID!) {
          page(id: $id) {
            id
            title
            body
          }
        }
      `;
      } else if (type === "articles") {
        query = `
        query($id: ID!) {
          article(id: $id) {
            id
            title
            body
          }
        }
      `;
      } else {
        return res.status(400).json({ success: false, error: "Invalid type" });
      }

      const result = await shopifyRequest(session, query, { id });

      let item = null;
      if (type === "products" && result.product) {
        item = {
          id: result.product.id,
          title: result.product.title,
          description: result.product.description,
        };
      } else if (type === "pages" && result.page) {
        item = {
          id: result.page.id,
          title: result.page.title,
          description: result.page.body,
        };
      } else if (type === "articles" && result.article) {
        item = {
          id: result.article.id,
          title: result.article.title,
          description: result.article.body,
        };
      }

      if (!item)
        return res
          .status(404)
          .json({ success: false, error: "Item not found" });
      res.json({ success: true, item });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch item from Shopify" });
    }
  }
);

// UPDATE item
router.put(
  "/:type/:id",
  shopify.validateAuthenticatedSession(),
  async (req, res) => {
    try {
      const { type } = req.params;
      const id = decodeURIComponent(req.params.id);
      const { title, description } = req.body;
      const session = res.locals.shopify.session;

      let mutation, variables;
      if (type === "products") {
        mutation = `
        mutation($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id title descriptionHtml }
            userErrors { field message }
          }
        }
      `;
        variables = {
          input: {
            id,
            title,
            descriptionHtml: description,
          },
        };
      } else if (type === "pages") {
        mutation = `
          mutation($id: ID!, $page: PageUpdateInput!) {
            pageUpdate(id: $id, page: $page) {
              page {
                id
                title
                body
              }
              userErrors {
                field
                message
              }
            }
          }
        `;
        variables = {
          id,
          page: {
            title,
            body: description,
          },
        };
      } else if (type === "articles") {
        mutation = `
          mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
            articleUpdate(id: $id, article: $article) {
          article {
            id
            title
            body
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
        variables = {
          id,
          article: {
            title,
            body: description,
          },
        };
      } else {
        return res.status(400).json({ success: false, error: "Invalid type" });
      }

      const result = await shopifyRequest(session, mutation, variables);

      let updatedItem = null;
      if (type === "products" && result.productUpdate?.product) {
        updatedItem = {
          id: result.productUpdate.product.id,
          title: result.productUpdate.product.title,
          description: result.productUpdate.product.descriptionHtml,
        };
      } else if (type === "pages" && result.pageUpdate?.page) {
        updatedItem = {
          id: result.pageUpdate.page.id,
          title: result.pageUpdate.page.title,
          description: result.pageUpdate.page.body,
        };
        console.log("Updated page item:", updatedItem);
      } else if (type === "articles" && result.articleUpdate?.article) {
        updatedItem = {
          id: result.articleUpdate.article.id,
          title: result.articleUpdate.article.title,
          description: result.articleUpdate.article.body,
        };
      }
      console.log("Final updated item:", updatedItem);

      if (!updatedItem) {
        return res.status(400).json({
          success: false,
          error: "Update failed",
          userErrors:
            result.productUpdate?.userErrors ||
            result.pageUpdate?.userErrors ||
            result.articleUpdate?.userErrors ||
            [],
        });
      }

      res.json({ success: true, item: updatedItem });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update Shopify data" });
    }
  }
);

const GEMINI_API_KEY = "AIzaSyAnWqvC6blLo1gzLoZWeL-YLdp8rTIBres";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

router.post("/ai/suggest", async (req, res) => {
  try {
    const { title, type } = req.body;

    if (!title || !type) {
      return res
        .status(400)
        .json({ success: false, error: "Missing title or type" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Hãy viết duy nhất một mô tả ngắn gọn (1-2 câu), hấp dẫn và giàu cảm xúc cho ${type} có tiêu đề: "${title}". 
Không đưa ra nhiều lựa chọn, không giải thích, chỉ xuất ra một đoạn văn hoàn chỉnh.`;

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text();

    res.json({ success: true, suggestion });
  } catch (error) {
    console.error("Error generating suggestion:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate suggestion" });
  }
});

export default router;
