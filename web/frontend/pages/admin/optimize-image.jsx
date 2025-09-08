import { useEffect, useState } from "react";
import {
  Page,
  LegacyCard,
  DataTable,
  Thumbnail,
  Badge,
  Button,
  Spinner,
  Toast,
  Frame,
  Banner,
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
        if (data.images.length === 0) {
          showToast("Tất cả ảnh đã được tối ưu hóa!", false);
        }
      } else {
        throw new Error(data.error || "Không thể tải danh sách ảnh");
      }
    } catch (err) {
      console.error("Fetch images error:", err);
      showToast(`Lỗi khi tải ảnh: ${err.message}`, true);
      setShopifyImages([]);
    }
    setLoadingShopify(false);
  };

  const showToast = (message, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToastActive(true);
  };

  const handleOptimize = async (imageData) => {
    const { src, productId, imageId } = imageData;
    const optimizeKey = `${productId}-${imageId}`;

    setOptimizing((prev) => ({ ...prev, [optimizeKey]: true }));

    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`Không thể tải ảnh: ${response.status}`);

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

      const res = await fetch("/api/images/optimize", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.newUrl) {
        setShopifyImages((prev) =>
          prev.filter(
            (img) => !(img.productId === productId && img.imageId === imageId)
          )
        );

        const compressionInfo = data.compressionRatio
          ? ` (${data.compressionRatio})`
          : "";

        showToast(`Tối ưu thành công!${compressionInfo}`, false);
      } else {
        throw new Error(data.error || "Không thể tối ưu ảnh");
      }
    } catch (err) {
      console.error("Optimize error:", err);

      setShopifyImages((prev) =>
        prev.map((img) =>
          img.productId === productId && img.imageId === imageId
            ? { ...img, status: "failed", error: err.message }
            : img
        )
      );

      showToast(`Lỗi tối ưu: ${err.message}`, true);
    } finally {
      setOptimizing((prev) => {
        const newState = { ...prev };
        delete newState[optimizeKey];
        return newState;
      });
    }
  };

  const getStatusBadge = (item) => {
    const optimizeKey = `${item.productId}-${item.imageId}`;

    if (item.status === "failed") return <Badge tone="critical">Lỗi</Badge>;
    if (optimizing[optimizeKey]) return <Badge tone="info">Đang xử lý...</Badge>;
    if (item.status === "optimized") return <Badge tone="success">Đã tối ưu</Badge>;
    return <Badge>Chưa tối ưu</Badge>;
  };

  const getActionButton = (item) => {
    const optimizeKey = `${item.productId}-${item.imageId}`;
    const isOptimizing = optimizing[optimizeKey];

    if (isOptimizing) return <Spinner size="small" />;

    return (
      <Button
        size="slim"
        tone="primary"
        onClick={() => handleOptimize(item)}
        disabled={item.status === "optimized"}
      >
        {item.status === "failed" ? "Thử lại" : "Tối ưu"}
      </Button>
    );
  };

  const rows = shopifyImages.map((item) => [
    <Thumbnail
      source={item.src}
      alt={item.productTitle || item.altText}
      size="small"
    />,
    item.productTitle || "Không có tên",
    item.productType || "Không xác định",
    item.altText || "Không có altText",
    getStatusBadge(item),
    getActionButton(item),
  ]);

  const toast = toastActive ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
      error={toastError}
    />
  ) : null;

  return (
    <Frame>
      <Page
        title="Quản lý ảnh chưa tối ưu"
        subtitle={`${shopifyImages.length} ảnh cần được tối ưu hóa`}
        primaryAction={{
          content: "Làm mới",
          onAction: fetchShopifyImages,
          loading: loadingShopify,
        }}
      >
        {shopifyImages.length === 0 && !loadingShopify && (
          <Banner tone="success">
            <p>🎉 Tất cả ảnh đã được tối ưu hóa! Không có ảnh nào cần xử lý.</p>
          </Banner>
        )}

        <LegacyCard>
          {loadingShopify ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Spinner size="large" />
              <p style={{ marginTop: "16px" }}>Đang tải danh sách ảnh...</p>
            </div>
          ) : shopifyImages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <p>Không có ảnh nào cần tối ưu hóa!</p>
            </div>
          ) : (
            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text", "text"]}
              headings={[
                "Ảnh",
                "Tên sản phẩm",
                "Loại sản phẩm",
                "Alt Text",
                "Trạng thái",
                "Thao tác",
              ]}
              rows={rows}
            />
          )}
        </LegacyCard>
      </Page>
      {toast}
    </Frame>
  );
}
