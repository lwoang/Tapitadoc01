import FormData from "form-data";
import fetch from "node-fetch";
import {
  CREATE_STAGED_UPLOAD_MUTATION,
  CREATE_PRODUCT_MEDIA_MUTATION,
} from "../queries/imageQueries.js";

export async function uploadToShopifyStaged(
  client,
  fileBuffer,
  filename,
  productId
) {
  try {
    const stagedResult = await client.query({
      data: {
        query: CREATE_STAGED_UPLOAD_MUTATION,
        variables: {
          input: [
            {
              resource: "IMAGE",
              filename,
              mimeType: "image/jpeg",
              httpMethod: "POST",
            },
          ],
        },
      },
    });

    if (stagedResult.body.errors)
      throw new Error(JSON.stringify(stagedResult.body.errors));
    const userErrors =
      stagedResult.body.data?.stagedUploadsCreate?.userErrors || [];
    if (userErrors.length > 0) throw new Error(JSON.stringify(userErrors));

    const stagedTarget =
      stagedResult.body.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!stagedTarget || !stagedTarget.url || !stagedTarget.resourceUrl)
      throw new Error("No valid staged target returned");

    const formData = new FormData();
    stagedTarget.parameters.forEach((p) => formData.append(p.name, p.value));
    formData.append("file", fileBuffer, filename);

    const uploadResponse = await fetch(stagedTarget.url, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });
    if (!uploadResponse.ok)
      throw new Error(`Upload failed: ${uploadResponse.status}`);

    const mediaResult = await client.query({
      data: {
        query: CREATE_PRODUCT_MEDIA_MUTATION,
        variables: {
          productId,
          media: [
            {
              originalSource: stagedTarget.resourceUrl,
              mediaContentType: "IMAGE",
              alt: `Optimized - ${filename}`,
            },
          ],
        },
      },
    });

    const createdMedia = mediaResult.body.data?.productCreateMedia?.media?.[0];
    return {
      resourceUrl: stagedTarget.resourceUrl,
      mediaUrl: createdMedia?.image?.url || null,
      mediaId: createdMedia?.id || null,
    };
  } catch (err) {
    console.error("Upload to Shopify error:", err.message);
    throw err;
  }
}
