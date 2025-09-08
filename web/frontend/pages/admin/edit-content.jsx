import React, { useState, useEffect } from "react";
import {
  Edit,
  Save,
  X,
  Sparkles,
  Loader2,
  Package,
  FileText,
  Users,
} from "lucide-react";

const ResourceManagementApp = () => {
  const [activeTab, setActiveTab] = useState("products");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch data for active tab
  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/edit/${activeTab}`);
      const data = await res.json();

      if (data.success) {
        setItems(data.items || []);
        if (data.items.length === 0) {
          console.log(`Không có ${activeTab}`);
        }
      } else {
        throw new Error(data.error || `Không thể tải ${activeTab}`);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ title: item.title, description: item.description });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (
      !editingItem ||
      !formData.title.trim() ||
      !formData.description.trim()
    ) {
      alert("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/edit/${activeTab}/${encodeURIComponent(editingItem.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (!response.ok) throw new Error("Failed to save");

      const result = await response.json();
      const updatedItem = result.item;
      setItems(
        items.map((item) => (item.id === editingItem.id ? updatedItem : item))
      );

      setShowModal(false);
      setEditingItem(null);
      setFormData({ title: "", description: "" });
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const getAISuggestion = async () => {
    if (!formData.title.trim()) {
      alert("Please enter a title first");
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch(`/api/edit/ai/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: activeTab.slice(0, -1), // Remove 's' from plural
        }),
      });

      if (!response.ok) throw new Error("Failed to get suggestion");

      const data = await response.json();
      setFormData({ ...formData, description: data.suggestion });
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      alert("Failed to get AI suggestion");
    } finally {
      setAiLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ title: "", description: "" });
  };

  const tabs = [
    { key: "products", label: "Products", icon: Package },
    { key: "pages", label: "Pages", icon: FileText },
    { key: "articles", label: "Articles", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Management System
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Resource List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {activeTab}
            </h2>
          </div>

          {loading && !showModal ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading {activeTab}...</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEdit(item)}
                      className="ml-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}

              {items.length === 0 && !loading && (
                <div className="px-6 py-12 text-center">
                  <div className="text-gray-400 mb-2">
                    <Package className="w-12 h-12 mx-auto" />
                  </div>
                  <p className="text-gray-500">No {activeTab} found</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {showModal && (
          <>
            {/* Overlay nền mờ */}
            <div
              className="fixed inset-0 z-40 bg-white opacity-100 "
              onClick={closeModal}
            />

            {/* Modal chính */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto transform transition-transform duration-300 scale-100">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Edit{" "}
                    {activeTab.slice(0, -1).charAt(0).toUpperCase() +
                      activeTab.slice(1, -1)}
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-4 space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter title..."
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <button
                        onClick={getAISuggestion}
                        disabled={aiLoading || !formData.title.trim()}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-purple-600 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        {aiLoading ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-1" />
                        )}
                        Get AI Suggestion
                      </button>
                    </div>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Enter description or use AI suggestion..."
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={
                      loading ||
                      !formData.title.trim() ||
                      !formData.description.trim()
                    }
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResourceManagementApp;
