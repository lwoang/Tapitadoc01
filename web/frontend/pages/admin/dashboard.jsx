import { useEffect, useState } from "react";

export default function Dashboard() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/admin/login";
      return;
    }

    fetch("/api/stores", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("token");
          window.location.href = "/admin/login";
        }
        return res.json();
      })
      .then((data) => {
        setStores(data);
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
              <th className="p-3 text-left">Installed At</th>
              <th className="p-3 text-left">Updated At</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s._id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-semibold">{s.shop}</td>
                <td className="p-3">{s.shop_owner || "-"}</td>
                <td className="p-3">{s.email || s.customer_email || "-"}</td>
                <td className="p-3">{s.domain || s.myshopify_domain}</td>
                <td className="p-3">{s.country || "-"}</td>
                <td className="p-3">{s.plan_display_name || s.plan_name || "-"}</td>
                <td className="p-3">{s.scope || "-"}</td>
                <td className="p-3">
                  {s.installedAt ? new Date(s.installedAt).toLocaleString() : "-"}
                </td>
                <td className="p-3">
                  {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
