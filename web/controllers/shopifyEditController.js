import { shopifyRequest } from "../services/shopifyService.js";
import { genAI } from "../services/genAIService.js";
import { PRODUCT_QUERIES, PAGE_QUERIES, ARTICLE_QUERIES, PRODUCT_MUTATIONS, PAGE_MUTATIONS, ARTICLE_MUTATIONS } 
from "../queries/editQueries.js";

// GET all items
export async function getAllItems(req, res) {
  try {
    const { type } = req.params;
    const session = res.locals.shopify.session;

    let query;
    if (type === "products") query = PRODUCT_QUERIES.GET_ALL;
    else if (type === "pages") query = PAGE_QUERIES.GET_ALL;
    else if (type === "articles") query = ARTICLE_QUERIES.GET_ALL;
    else return res.status(400).json({ success: false, error: "Invalid type" });

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
    res.status(500).json({ success: false, error: "Failed to fetch data from Shopify" });
  }
}

// GET single item
export async function getSingleItem(req, res) {
  try {
    const { type, id } = req.params;
    const session = res.locals.shopify.session;

    let query;
    if (type === "products") query = PRODUCT_QUERIES.GET_SINGLE;
    else if (type === "pages") query = PAGE_QUERIES.GET_SINGLE;
    else if (type === "articles") query = ARTICLE_QUERIES.GET_SINGLE;
    else return res.status(400).json({ success: false, error: "Invalid type" });

    const result = await shopifyRequest(session, query, { id });

    let item = null;
    if (type === "products" && result.product) {
      item = { id: result.product.id, title: result.product.title, description: result.product.description };
    } else if (type === "pages" && result.page) {
      item = { id: result.page.id, title: result.page.title, description: result.page.body };
    } else if (type === "articles" && result.article) {
      item = { id: result.article.id, title: result.article.title, description: result.article.body };
    }

    if (!item) return res.status(404).json({ success: false, error: "Item not found" });
    res.json({ success: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch item from Shopify" });
  }
}

// UPDATE item
export async function updateItem(req, res) {
  try {
    const { type } = req.params;
    const id = decodeURIComponent(req.params.id);
    const { title, description } = req.body;
    const session = res.locals.shopify.session;

    let mutation, variables;
    if (type === "products") {
      mutation = PRODUCT_MUTATIONS.UPDATE;
      variables = { input: { id, title, descriptionHtml: description } };
    } else if (type === "pages") {
      mutation = PAGE_MUTATIONS.UPDATE;
      variables = { id, page: { title, body: description } };
    } else if (type === "articles") {
      mutation = ARTICLE_MUTATIONS.UPDATE;
      variables = { id, article: { title, body: description } };
    } else return res.status(400).json({ success: false, error: "Invalid type" });

    const result = await shopifyRequest(session, mutation, variables);

    let updatedItem = null;
    if (type === "products" && result.productUpdate?.product) updatedItem = { id: result.productUpdate.product.id, title: result.productUpdate.product.title, description: result.productUpdate.product.descriptionHtml };
    else if (type === "pages" && result.pageUpdate?.page) updatedItem = { id: result.pageUpdate.page.id, title: result.pageUpdate.page.title, description: result.pageUpdate.page.body };
    else if (type === "articles" && result.articleUpdate?.article) updatedItem = { id: result.articleUpdate.article.id, title: result.articleUpdate.article.title, description: result.articleUpdate.article.body };

    if (!updatedItem) {
      return res.status(400).json({
        success: false,
        error: "Update failed",
        userErrors: result.productUpdate?.userErrors || result.pageUpdate?.userErrors || result.articleUpdate?.userErrors || [],
      });
    }

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to update Shopify data" });
  }
}

// AI Suggestion
export async function generateAISuggestion(req, res) {
  try {
    const { title, type } = req.body;
    if (!title || !type) return res.status(400).json({ success: false, error: "Missing title or type" });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Write a single short description (1-2 sentences), engaging for the ${type} titled: "${title}". Do not explain, output only one paragraph.`;
    const result = await model.generateContent(prompt);
    const suggestion = result.response.text();

    res.json({ success: true, suggestion });
  } catch (error) {
    console.error("Error generating suggestion:", error);
    res.status(500).json({ success: false, error: "Failed to generate suggestion" });
  }
}
