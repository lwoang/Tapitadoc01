import shopify from "../config/shopify.js";

/**
 * Hàm để tạo một số sản phẩm giả.
 * (Đã di chuyển logic từ product-creator.js vào đây)
 * @param {object} session - Phiên Shopify.
 */
const createProductsHelper = async (session) => {
  const client = new shopify.api.clients.Graphql({ session });
  const product = {
    title: "Burton Custom Freestyle 151",
    variants: [{ price: "100.00" }],
  };

  const createProduct = await client.request(`
    mutation {
      productCreate(input: {
        title: "${product.title}",
        variants: [{ price: "${product.variants[0].price}" }]
      }) {
        product {
          id
          title
        }
      }
    }
  `);

  console.log("Created product:", createProduct.data.productCreate.product);
};

/**
 * Lấy số lượng sản phẩm từ Shopify.
 * @param {object} _req - Đối tượng request (không sử dụng).
 * @param {object} res - Đối tượng response.
 */
export const getProductCount = async (_req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const countData = await client.request(`
      query shopifyProductCount {
        productsCount {
          count
        }
      }
    `);

    const count = countData.data.productsCount.count;
    res.status(200).send({ count });
  } catch (e) {
    console.error(`Failed to fetch product count: ${e.message}`);
    res.status(500).send({ error: "Failed to fetch product count" });
  }
};

/**
 * Tạo một số sản phẩm giả.
 * @param {object} _req - Đối tượng request (không sử dụng).
 * @param {object} res - Đối tượng response.
 */
export const createProducts = async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await createProductsHelper(res.locals.shopify.session);
  } catch (e) {
    console.error(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
};