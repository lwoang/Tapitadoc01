import { Card, TextContainer, Text, Stack, Badge } from "@shopify/polaris";
import { useQuery } from "react-query";
import { useMemo } from "react";

export function ShopInfoCard() {
  // Lấy shop domain từ URL
  const shop = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("shop");
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["shopInfo", shop],
    queryFn: async () => {
      const url = shop
        ? `/api/shop/info?shop=${encodeURIComponent(shop)}`
        : "/api/shop/info";
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Để gửi cookies session
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    refetchOnWindowFocus: false,
  });

  return (
    <Card title="Shop Information" sectioned>
      <TextContainer spacing="loose">
        {isLoading && <p>Loading shop info...</p>}

        {error && (
          <p>
            Error fetching shop info{error.message ? `: ${error.message}` : ""}
          </p>
        )}

        {data && data.shop && (
          <>
            <Stack alignment="center">
              <Text as="h4" variant="headingMd">
                {data.shop.name || "N/A"}
              </Text>
              {data.shop.plan?.displayName && (
                <Badge status="info">{data.shop.plan.displayName}</Badge>
              )}
            </Stack>

            <p>
              <strong>ID:</strong> {data.shop.id || "N/A"}
            </p>
            <p>
              <strong>Email:</strong> {data.shop.email || "N/A"}
            </p>
            <p>
              <strong>Domain:</strong> {data.shop.myshopifyDomain || "N/A"}
            </p>
            <p>
              <strong>Contact Email:</strong> {data.shop.contactEmail || "N/A"}
            </p>

            {data.shop.billingAddress && Object.keys(data.shop.billingAddress).length > 0 && (
              <Stack vertical spacing="extraTight" style={{ marginTop: "10px" }}>
                <Text as="h5" variant="headingSm">
                  Billing Address
                </Text>
                {Object.entries(data.shop.billingAddress).map(([key, value]) =>
                  value ? (
                    <p key={key}>
                      <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>{" "}
                      {value}
                    </p>
                  ) : null
                )}
              </Stack>
            )}
          </>
        )}
      </TextContainer>
    </Card>
  );
}
