import { useEffect, useState } from "react";
import {
  Page,
  Card,
  DataTable,
  Thumbnail,
  Badge,
  Button,
  Spinner,
  Toast,
  Frame,
  Banner,
  Text,
  Tooltip,
  BlockStack,
  PageActions,
} from "@shopify/polaris";
import Compressor from "compressorjs";

export default function ManageShopifyImages() {
  const [shopifyImages, setShopifyImages] = useState([]);
  const [loadingShopify, setLoadingShopify] = useState(false);
  const [optimizing, setOptimizing] = useState({});
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  useEffect(() => {
    fetchShopifyImages();
  }, []);

  const fetchShopifyImages = async () => {
    setLoadingShopify(true);
    try {
      const res = await fetch("/api/images/shopify");
      const data = await res.json();
      if (data.success) {
        setShopifyImages(data.images || []);
        if (!data.images || data.images.length === 0) {
          showToast("All images have been optimized!", false);
        }
      } else {
        throw new Error(data.error || "Unable to load images");
      }
    } catch (err) {
      console.error("Fetch images error:", err);
      showToast(`Error loading images: ${err.message}`, true);
      setShopifyImages([]);
    }
    setLoadingShopify(false);
  };

  const showToast = (message, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToastActive(true);
  };

  // ----- Optimize -----
  const handleOptimize = async (imageData) => {
    const { src, productId, imageId, productTitle, altText } = imageData;
    const optimizeKey = `${productId}-${imageId}`;

    setOptimizing((prev) => ({ ...prev, [optimizeKey]: true }));

    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`Unable to load image: ${response.status}`);
      const blob = await response.blob();

      const compressedFile = await new Promise((resolve, reject) => {
        new Compressor(blob, {
          quality: 0.8,
          convertSize: 500000,
          maxWidth: 1200,
          maxHeight: 1200,
          mimeType: "image/jpeg",
          success: resolve,
          error: reject,
        });
      });

      const formData = new FormData();
      formData.append("file", compressedFile, "optimized.jpg");
      formData.append("productId", productId);
      formData.append("imageId", imageId);
      formData.append("originalUrl", src);
      formData.append("productTitle", productTitle || "");
      formData.append("altText", altText || "");
      formData.append("originalSize", blob.size);

      const res = await fetch("/api/images/optimize", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.newUrl) {
        setShopifyImages((prev) =>
          prev.map((img) =>
            img.productId === productId && img.imageId === imageId
              ? {
                  ...img,
                  status: "optimized",
                  optimizedUrl: data.newUrl,
                  compressionRatio: data.compressionRatio,
                  optimizedSize: data.optimizedSize,
                  mediaId: data.mediaId,
                  filename: data.filename,
                }
              : img
          )
        );

        showToast(`Optimized successfully!`, false);
      } else {
        throw new Error(data.error || "Unable to optimize image");
      }
    } catch (err) {
      console.error("Optimize error:", err);
      setShopifyImages((prev) =>
        prev.map((img) =>
          img.productId === imageData.productId && img.imageId === imageData.imageId
            ? { ...img, status: "failed", error: err.message }
            : img
        )
      );
      showToast(`Optimization error: ${err.message}`, true);
    } finally {
      setOptimizing((prev) => {
        const newState = { ...prev };
        delete newState[optimizeKey];
        return newState;
      });
    }
  };

  // ----- Restore -----
  const handleRestore = async (imageData) => {
    const { productId, imageId, mediaId } = imageData;
    try {
      const res = await fetch("/api/images/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, imageId, mediaId }),
      });
      const data = await res.json();
      if (data.success) {
        setShopifyImages((prev) =>
          prev.map((img) =>
            img.productId === productId && img.imageId === imageId
              ? { ...img, status: "unoptimized", optimizedUrl: null, mediaId: null }
              : img
          )
        );
        showToast("Image restored successfully!", false);
      } else {
        throw new Error(data.error || "Restore failed");
      }
    } catch (err) {
      console.error("Restore error:", err);
      showToast(`Restore error: ${err.message}`, true);
    }
  };
  const truncateText = (text, maxLength = 28) => {
    if (!text) return "—";
    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  };
  // ----- Table Rows 
  const rows = shopifyImages.map((item) => [
    <Thumbnail source={item.src} alt={item.productTitle || item.altText} size="small" />,
    <Tooltip content={item.productTitle || "No product name"}>
      <Text as="span" truncate>{truncateText(item.productTitle)}</Text>
    </Tooltip>,
    <Tooltip content={item.altText || "No altText"}>
      <Text as="span" truncate>{truncateText(item.altText)}</Text>
    </Tooltip>,
    item.originalSizeKb || "—",
    item.optimizedSizeKb || "—",
    <Badge tone={
      item.status === "failed" ? "critical" :
      item.status === "optimized" ? "success" :
      "subdued"
    }>
      {item.status === "failed" ? "Error" : item.status === "optimized" ? "Optimized" : "Not optimized"}
    </Badge>,
    <div style={{ display: "flex", gap: "4px" }}>
      <Button size="slim" primary onClick={() => handleOptimize(item)} disabled={item.status === "optimized"}>
        {item.status === "failed" ? "Retry" : "Optimize"}
      </Button>
      <Button size="slim" destructive onClick={() => handleRestore(item)} disabled={item.status !== "optimized"}>
        Restore
      </Button>
    </div>,
  ]);

  const toast = toastActive ? (
    <Toast content={toastMessage} onDismiss={() => setToastActive(false)} error={toastError} />
  ) : null;

  return (
    <Frame>
      <Page title="Optimize Images">
        <BlockStack gap="400">
          {shopifyImages.length === 0 && !loadingShopify && (
            <Banner tone="success">
              <p>All images have been optimized! No action required.</p>
            </Banner>
          )}

          <Card>
            {loadingShopify ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spinner size="large" />
                <p style={{ marginTop: "16px" }}>Loading images…</p>
              </div>
            ) : shopifyImages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <p>No images to optimize!</p>
              </div>
            ) : (
              <DataTable
                columnContentTypes={["text","text","text","numeric","numeric","text","text"]}
                headings={["Image","Product Name","Alt Text","Original Size","Optimized Size","Status","Action"]}
                rows={rows}
              />
            )}
          </Card>

          <PageActions
            primaryAction={{ content: "Refresh", onAction: fetchShopifyImages, loading: loadingShopify }}
          />
        </BlockStack>
      </Page>
      {toast}
    </Frame>
  );
}
