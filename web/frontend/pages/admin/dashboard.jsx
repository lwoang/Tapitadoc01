import { useEffect, useState } from "react";

export default function Dashboard() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stores")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStores(data);
        } else if (data.shop) {
          setStores([data.shop]);
        } else {
          setStores([]);
        }
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/admin/login";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Danh sách Store đã cài app</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          Đăng xuất
        </button>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : stores.length === 0 ? (
        <p>Chưa có store nào cài app.</p>
      ) : (
        <table className="w-full bg-white shadow rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-3 text-left">Shop</th>
              <th className="p-3 text-left">Owner</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Domain</th>
              <th className="p-3 text-left">Country</th>
              <th className="p-3 text-left">Plan</th>
              <th className="p-3 text-left">Scope</th>
              <th className="p-3 text-left">Created At</th>
              <th className="p-3 text-left">Updated At</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s._id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-semibold">{s.name}</td>
                <td className="p-3">{s.shop_owner || "-"}</td>
                <td className="p-3">{s.email || s.customer_email || "-"}</td>
                <td className="p-3">{s.domain || s.myshopify_domain}</td>
                <td className="p-3">{s.country || "-"}</td>
                <td className="p-3">{s.plan_display_name || s.plan_name || "-"}</td>
                <td className="p-3">{s.scope || "-"}</td>
                <td className="p-3">
                  {s.created_at ? new Date(s.created_at).toLocaleString() : "-"}
                </td>
                <td className="p-3">
                  {s.updated_at ? new Date(s.updated_at).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
