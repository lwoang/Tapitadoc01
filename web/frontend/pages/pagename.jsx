import { Card, Page, Layout, BlockStack, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";

export default function PageName() {
  const { t } = useTranslation();
  return (
    <Page>
      <TitleBar title={t("PageName.title")}>
        <button variant="primary" onClick={() => console.log("Primary action")}>
          {t("PageName.primaryAction")}
        </button>
        <button onClick={() => console.log("Secondary action")}>
          {t("PageName.secondaryAction")}
        </button>
      </TitleBar>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Text variant="headingMd" as="h2">
              {t("PageName.heading")}
            </Text>
            <BlockStack>
              <p>{t("PageName.body")}</p>
            </BlockStack>
          </Card>
          <Card sectioned>
            <Text variant="headingMd" as="h2">
              {t("PageName.heading")}
            </Text>
            <BlockStack>
              <p>{t("PageName.body")}</p>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section secondary>
          <Card sectioned>
            <Text variant="headingMd" as="h2">
              {t("PageName.heading")}
            </Text>
            <BlockStack>
              <p>{t("PageName.body")}</p>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
