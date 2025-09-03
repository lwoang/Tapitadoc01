// src/pages/EditContent.jsx
import { Page, Layout, Card, TextField, Button } from "@shopify/polaris";
import { useState } from "react";

export default function EditContent() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <Page title="Sửa nội dung">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <TextField
              label="Page/Product Title"
              value={title}
              onChange={setTitle}
              autoComplete="off"
            />
            <TextField
              label="Description"
              value={desc}
              onChange={setDesc}
              multiline={4}
            />
            <Button primary onClick={() => alert("Saved!")}>
              Lưu
            </Button>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
