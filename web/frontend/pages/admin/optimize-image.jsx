import { Page, Layout, Card, Button } from "@shopify/polaris";

export default function OptimizeImage() {
  return (
    <Page title="Tối ưu hình ảnh">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <p>Chức năng tối ưu ảnh sẽ ở đây (resize, nén, đổi định dạng,...)</p>
            <Button primary onClick={() => alert("Optimize ảnh!")}>
              Chạy Optimize
            </Button>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}