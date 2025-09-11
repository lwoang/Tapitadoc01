document.addEventListener("DOMContentLoaded", () => {
  console.log(":white_check_mark: optimized.js loaded");
  let metafieldEl = document.getElementById("optimized-images-data");
  if (!metafieldEl) {
    console.warn(":warning: Không tìm thấy thẻ #optimized-images-data");
    return;
  }
  let mapping = {};
  try {
    mapping = JSON.parse(metafieldEl.textContent.trim());
  } catch (err) {
    console.warn(":warning: Không parse được optimized_images metafield:", err);
    return;
  }
  function normalizeUrl(url) {
    try {
      let u = new URL(url);
      let base = u.pathname.split("/").pop(); // ví dụ: IMG_2474.jpg
      let v = u.searchParams.get("v");
      return v ? `${base}?v=${v}` : base;
    } catch (e) {
      return url;
    }
  }
  // Chuẩn hóa mapping từ metafield
  const normalizedMap = {};
  Object.keys(mapping).forEach((key) => {
    const normKey = normalizeUrl(key);
    normalizedMap[normKey] = mapping[key];
  });
  console.log(":world_map: Normalized mapping keys:", Object.keys(normalizedMap));
  // Check tất cả ảnh trong trang
  const images = document.querySelectorAll("img");
  images.forEach((img) => {
    const norm = normalizeUrl(img.src);
    console.log(":mag: Checking normalized:", norm);
    if (normalizedMap[norm]) {
      console.log(":white_check_mark: Found match:", norm, "→", normalizedMap[norm]);
      // Update src
      img.src = normalizedMap[norm];
      // Nếu có srcset thì rebuild lại với link optimized
      if (img.hasAttribute("srcset")) {
        const srcset = img.getAttribute("srcset");
        const parts = srcset.split(",").map(s => s.trim());
        const newSrcset = parts.map(part => {
          // Tách "url widthDescriptor"
          const [url, size] = part.split(/\s+/);
          try {
            const u = new URL(url, window.location.origin);
            // Lấy tham số width nếu có
            const width = u.searchParams.get("width");
            // Build lại srcset entry từ link optimized
            if (width) {
              return `${normalizedMap[norm]}&width=${width} ${size}`;
            } else {
              return `${normalizedMap[norm]} ${size}`;
            }
          } catch (e) {
            // fallback nếu lỗi
            return `${normalizedMap[norm]} ${size || ""}`;
          }
        });
        img.setAttribute("srcset", newSrcset.join(", "));
      }
    }
  });
});