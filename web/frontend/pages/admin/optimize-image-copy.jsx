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

  function formatFileSize(bytes) {
    if (!bytes) return "-";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
  }

  const fetchShopifyImages = async () => {
    try {
      const response = await fetch("/api/images/shopify");
      if (!response.ok) throw new Error("Failed to fetch images");
      const data = await response.json();

      const imagesWithStatus = data.images.map((img) => ({
        ...img,
        status: img.optimized ? "Optimized" : "Unoptimized",
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
      // backend nên trả về { optimizedUrl, optimizedFileSize }

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                optimizedUrl: data.optimizedUrl,
                optimizedFileSize: data.optimizedFileSize,
                status: "Optimized",
              }
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

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                optimizedUrl: null,
                optimizedFileSize: null,
                status: "Restored",
              }
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

  const originalRows = images.map(
    ({
      id,
      url,
      altText,
      productTitle,
      status,
      productId,
      fileSize, // dung lượng gốc
      optimizedFileSize, // dung lượng ảnh đã optimize
      optimizedUrl,
    }) => {
      const isProcessing = processingIds.includes(id);
      return [
        <Thumbnail source={url} alt={altText || "Product image"} size="small" />,
        optimizedUrl ? (
          <Thumbnail source={optimizedUrl} alt="Optimized" size="small" />
        ) : (
          "-"
        ),
        <Tooltip content={productTitle}>
          <Text>{truncate(productTitle, 20)}</Text>
        </Tooltip>,
        altText ? (
          <Tooltip content={altText}>
            <Text>{truncate(altText, 30)}</Text>
          </Tooltip>
        ) : (
          "-"
        ),
        <Text>{formatFileSize(fileSize)}</Text>,
        <Text>
          {optimizedUrl ? formatFileSize(optimizedFileSize) : "-"}
        </Text>,
        <Text>{status}</Text>,
        <div style={{ display: "flex", gap: "6px" }}>
          <Button
            variant="primary"
            onClick={() => handleOptimize(id, productId)}
            loading={isProcessing && status === "Optimizing"}
            disabled={status === "Optimized"}
          >
            Optimize
          </Button>
          <Button
            onClick={() => handleRestore(id, productId)}
            loading={isProcessing && status === "Restoring"}
            disabled={status !== "Optimized"}
          >
            Restore
          </Button>
        </div>,
      ];
    }
  );

  return (
    <Page title="Manage Shopify Images">
      <Card title="Images" sectioned>
        <DataTable
          columnContentTypes={[
            "text",
            "text",
            "text",
            "text",
            "text",
            "text",
            "text",
            "text",
          ]}
          headings={[
            "Original",
            "Optimized",
            "Product",
            "Alt Text",
            "Original",
            "Optimized Size",
            "Status",
            "Actions",
          ]}
          rows={originalRows}
        />
      </Card>
    </Page>
  );
}
