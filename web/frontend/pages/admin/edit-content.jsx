import React, { useState, useEffect, useCallback } from "react";
import {
  Page,
  Card,
  DataTable,
  Tabs,
  Text,
  Button,
  Spinner,
  Modal,
  TextField,
  Tooltip,
} from "@shopify/polaris";
import { MagicIcon, EditIcon } from "@shopify/polaris-icons";

const ResourceManagementApp = () => {
  const tabs = [
    { id: "products", content: "Products" },
    { id: "pages", content: "Pages" },
    { id: "articles", content: "Articles" },
  ];

  // Polaris Tabs cần index
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [aiLoading, setAiLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/edit/${tabs[activeTab].id}`);
      const data = await res.json();
      setItems(data.success ? data.items || [] : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ title: item.title, description: item.description });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/edit/${tabs[activeTab].id}/${encodeURIComponent(editingItem.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      if (data.item) {
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? data.item : i))
        );
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ title: "", description: "" });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getAISuggestion = async () => {
    if (!formData.title.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/edit/ai/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: tabs[activeTab].id.slice(0, -1),
        }),
      });
      const data = await res.json();
      setFormData((prev) => ({ ...prev, description: data.suggestion }));
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const truncate = (text, max) =>
    text.length > max ? text.slice(0, max) + "..." : text;

  const rows = items.map((item) => [
    <Tooltip content={item.title}>
      <div
        style={{
          maxWidth: "200px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {truncate(item.title, 40)}
      </div>
    </Tooltip>,
    <Tooltip content={item.description}>
      <div
        style={{
          maxWidth: "500px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {truncate(item.description, 80)}
      </div>
    </Tooltip>,
    <Button
      key={item.id}
      icon={EditIcon}
      plain
      onClick={() => handleEdit(item)}
    >
      Edit
    </Button>,
  ]);

  return (
    <Page title="Management System">
      <Card>
        <Tabs tabs={tabs} selected={activeTab} onSelect={setActiveTab} />
      </Card>

      <Card>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center" }}>
            <Spinner accessibilityLabel="Loading items" size="large" />
          </div>
        ) : (
          <DataTable
            columnContentTypes={["text", "text", "text"]}
            headings={["Title", "Description", "Actions"]}
            rows={rows}
          />
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`Edit ${tabs[activeTab].content}`}
        primaryAction={{
          content: "Save",
          onAction: handleSave,
          loading,
          disabled: !formData.title.trim() || !formData.description.trim(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextField
            label="Title"
            value={formData.title}
            onChange={(value) => setFormData({ ...formData, title: value })}
            autoComplete="off"
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(value) =>
              setFormData({ ...formData, description: value })
            }
            multiline={4}
          />
          <div style={{ marginTop: 8 }}>
            <Button
              onClick={getAISuggestion}
              loading={aiLoading}
              icon={MagicIcon}
              disabled={!formData.title.trim()}
            >
              Get AI Suggestion
            </Button>
          </div>
        </Modal.Section>
      </Modal>
    </Page>
  );
};

export default ResourceManagementApp;
