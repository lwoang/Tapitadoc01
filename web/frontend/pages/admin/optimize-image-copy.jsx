import { useEffect, useState } from "react";
import {
  Page,
  Card,
  Spinner,
  Banner,
  Button,
  DataTable,
  Thumbnail,
  Tooltip,
  Text,
} from "@shopify/polaris";

export default function ManageShopifyImages() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingIds, setProcessingIds] = useState([]);

  function truncate(text, maxLength = 40) {
    if (!text) return "";
    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  }

  // Fetch images từ backend
  const fetchShopifyImages = async () => {
    try {
      const response = await fetch("/api/images/shopify");
      if (!response.ok) throw new Error("Failed to fetch images");
      const data = await response.json();
      const imagesWithStatus = data.images.map((img) => ({
        ...img,
        status: "Unoptimized",
        optimizedUrl: null,
      }));
      setImages(imagesWithStatus);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopifyImages();
  }, []);

  // Optimize 1 ảnh
  const handleOptimize = async (imageId, productId) => {
    try {
      setProcessingIds((prev) => [...prev, imageId]);
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, status: "Optimizing" } : img
        )
      );

      const response = await fetch("/api/images/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, productId }),
      });

      if (!response.ok) throw new Error("Optimize failed");
      const data = await response.json();

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, optimizedUrl: data.optimized, status: "Optimized" }
            : img
        )
      );
    } catch (err) {
      console.error(err);
      alert("Optimize thất bại: " + err.message);
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, status: "Failed" } : img
        )
      );
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== imageId));
    }
  };

  // Restore 1 ảnh
  const handleRestore = async (imageId, productId) => {
    try {
      setProcessingIds((prev) => [...prev, imageId]);
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, status: "Restoring" } : img
        )
      );

      const response = await fetch("/api/images/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, productId }),
      });

      if (!response.ok) throw new Error("Restore failed");
      const data = await response.json();

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, optimizedUrl: null, status: "Restored" }
            : img
        )
      );
    } catch (err) {
      console.error(err);
      alert("Restore thất bại: " + err.message);
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, status: "Failed" } : img
        )
      );
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== imageId));
    }
  };

  if (loading)
    return <Spinner accessibilityLabel="Loading images" size="large" />;

  if (error)
    return (
      <Banner status="critical">
        <p>Lỗi khi lấy ảnh: {error}</p>
      </Banner>
    );

  // Bảng 1: Ảnh gốc
  const originalRows = images.map(
    ({ id, url, altText, productTitle, status, productId }) => {
      const isProcessing = processingIds.includes(id);
      return [
        <Thumbnail source={url} alt={altText || "Product image"} size="small" />,
        <Tooltip content={productTitle}>
          <Text>{truncate(productTitle, 20)}</Text>
        </Tooltip>,
        altText ? (
          <Tooltip content={altText}>
            <Text>{truncate(altText, 40)}</Text>
          </Tooltip>
        ) : (
          "-"
        ),
        <Text>{status}</Text>,
        <div style={{ display: "flex", gap: "6px" }}>
          <Button
            variant="primary"
            onClick={() => handleOptimize(id, productId)}
            loading={isProcessing && status === "Optimizing"}
          >
            Optimize
          </Button>
          <Button
            onClick={() => handleRestore(id, productId)}
            loading={isProcessing && status === "Restoring"}
          >
            Restore
          </Button>
        </div>,
      ];
    }
  );

  // Bảng 2: Ảnh đã optimize (tự động live update)
  const optimizedRows = images
    .filter((img) => img.optimizedUrl)
    .map(({ id, optimizedUrl, altText, productTitle, status }) => [
      <Thumbnail
        source={optimizedUrl}
        alt={altText || "Optimized image"}
        size="small"
      />,
      <Tooltip content={productTitle}>
        <Text>{truncate(productTitle, 20)}</Text>
      </Tooltip>,
      altText ? (
        <Tooltip content={altText}>
          <Text>{truncate(altText, 40)}</Text>
        </Tooltip>
      ) : (
        "-"
      ),
      <Text>{status}</Text>,
    ]);

  return (
    <Page title="Manage Shopify Images">
      <Card title="Original Images" sectioned>
        <DataTable
          columnContentTypes={["text", "text", "text", "text", "text"]}
          headings={["Image", "Product", "Alt Text", "Status", "Actions"]}
          rows={originalRows}
        />
      </Card>

      <Card title="Optimized Images" sectioned style={{ marginTop: "20px" }}>
        <DataTable
          columnContentTypes={["text", "text", "text", "text"]}
          headings={["Optimized Image", "Product", "Alt Text", "Status"]}
          rows={optimizedRows}
        />
      </Card>
    </Page>
  );
}
