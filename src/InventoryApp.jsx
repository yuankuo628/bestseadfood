import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function InventoryApp() {
  const [page, setPage] = useState("inventory");

  // 庫存
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [editId, setEditId] = useState(null);

  // 進貨
  const [purchaseList, setPurchaseList] = useState([{ name: "", qty: "", price: "", cost: "", supplier: "" }]);
  const [purchases, setPurchases] = useState([]);

  // 提示訊息
  const [message, setMessage] = useState("");

  // ✅ 初次載入時讀取暫存的進貨資料
useEffect(() => {
  const savedList = localStorage.getItem("purchaseListDraft");
  if (savedList) setPurchaseList(JSON.parse(savedList));
}, []);

useEffect(() => {
  localStorage.setItem("purchaseListDraft", JSON.stringify(purchaseList));
}, [purchaseList]);

  // 匯出庫存 Excel
  const exportToExcel = () => {
    const exportData = items.map(i => ({
      編號: `'${i.id}`,
      品名: i.name,
      數量: i.qty,
      售價: i.price,
      成本: i.cost,
      進貨商: i.supplier,
      庫存成本金額: Number(i.qty || 0) * Number(i.cost || 0)
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "庫存清單");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "庫存清單.xlsx");
  };

  // 庫存管理
  const addItem = () => {
    if (!name || !qty) return;
    if (editId !== null) {
      setItems(prev =>
        prev.map(i =>
          i.id === editId
            ? { ...i, name, qty: Number(qty), price: Number(price || 0), cost: Number(cost || 0), supplier }
            : i
        )
      );
      setEditId(null);
    } else {
      const newItem = {
        id: Date.now(),
        name,
        qty: Number(qty),
        price: Number(price || 0),
        cost: Number(cost || 0),
        supplier
      };
      setItems(prev => [...prev, newItem]);
    }
    setName(""); setQty(""); setPrice(""); setCost(""); setSupplier("");
  };
  const deleteItem = id => setItems(prev => prev.filter(i => i.id !== id));
  const editItem = item => {
    setEditId(item.id);
    setName(item.name);
    setQty(item.qty);
    setPrice(item.price);
    setCost(item.cost);
    setSupplier(item.supplier);
  };
  // 進貨管理
  const addPurchaseRow = () => {
    setPurchaseList(prev => [...prev, { name: "", qty: "", price: "", cost: "", supplier: "" }]);
  };

  const updatePurchaseRow = (idx, field, val) => {
    setPurchaseList(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  };

  const addPurchase = () => {
    const now = new Date().toLocaleString();
    setItems(prev => {
      const updated = [...prev];
      purchaseList.forEach(p => {
        if (!p.name || !p.qty) return;
        const exist = updated.find(i => i.name === p.name);
        if (exist) {
          exist.qty += Number(p.qty);
          if (p.price !== "") exist.price = Number(p.price);
          if (p.cost !== "") exist.cost = Number(p.cost);
          if (p.supplier !== "") exist.supplier = p.supplier;
        } else {
          updated.push({
            id: Date.now() + Math.random(),
            name: p.name,
            qty: Number(p.qty),
            price: Number(p.price || 0),
            cost: Number(p.cost || 0),
            supplier: p.supplier || ""
          });
        }
      });
      return updated;
    });

    setPurchases(prev => [...prev, { id: Date.now(), date: now, items: purchaseList }]);

    // ✅ 清除暫存
    localStorage.removeItem("purchaseListDraft");

    // ✅ 顯示提示訊息
    setMessage("✅ 已送出");
    setTimeout(() => setMessage(""), 3000);

    setPurchaseList([{ name: "", qty: "", price: "", cost: "", supplier: "" }]);
  };

  const deletePurchase = id => {
    setPurchases(prev => prev.filter(p => p.id !== id));
  };
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-center">極海鮮八號鋪</h1>
      <div className="flex gap-4 justify-center">
        <button onClick={() => setPage("inventory")} className={`p-2 rounded ${page === "inventory" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>庫存管理</button>
        <button onClick={() => setPage("orders")} className={`p-2 rounded ${page === "orders" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>訂單管理</button>
        <button onClick={() => setPage("purchase")} className={`p-2 rounded ${page === "purchase" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>進貨管理</button>
      </div>

      {/* 進貨管理 */}
      {page === "purchase" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">進貨管理</h2>
          <table className="w-full border border-gray-300 border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">品名</th>
                <th className="border p-2">數量</th>
                <th className="border p-2">售價</th>
                <th className="border p-2">成本</th>
                <th className="border p-2">進貨商</th>
                <th className="border p-2">進貨額</th>
              </tr>
            </thead>
            <tbody>
              {purchaseList.map((p, idx) => (
                <tr key={idx}>
                  <td className="border p-2"><input className="w-full border p-1" value={p.name} onChange={e => updatePurchaseRow(idx, "name", e.target.value)} /></td>
                  <td className="border p-2"><input className="w-full border p-1" type="number" value={p.qty} onChange={e => updatePurchaseRow(idx, "qty", e.target.value)} /></td>
                  <td className="border p-2"><input className="w-full border p-1" type="number" value={p.price} onChange={e => updatePurchaseRow(idx, "price", e.target.value)} /></td>
                  <td className="border p-2"><input className="w-full border p-1" type="number" value={p.cost} onChange={e => updatePurchaseRow(idx, "cost", e.target.value)} /></td>
                  <td className="border p-2"><input className="w-full border p-1" value={p.supplier} onChange={e => updatePurchaseRow(idx, "supplier", e.target.value)} /></td>
                  <td className="border p-2">{Number(p.qty || 0) * Number(p.cost || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-2 mt-2">
            <button className="bg-blue          <div className="flex gap-2 mt-2">
            <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={addPurchaseRow}>新增商品列</button>
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={addPurchase}>完成進貨</button>
            {message && <div className="text-green-600 font-bold mt-2">{message}</div>}
          </div>

          <h2 className="text-xl font-bold mt-4">進貨紀錄</h2>
          <div className="space-y-2">
            {purchases.map(p => {
              const totalPurchase = p.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.cost || 0), 0);
              return (
                <div key={p.id} className="border p-2 rounded">
                  <div className="font-bold">日期：{p.date} | 總進貨額：${totalPurchase}</div>
                  <table className="w-full border border-gray-300 border-collapse text-sm mt-2">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 p-2">品名</th>
                        <th className="border border-gray-300 p-2">數量</th>
                        <th className="border border-gray-300 p-2">售價</th>
                        <th className="border border-gray-300 p-2">成本</th>
                        <th className="border border-gray-300 p-2">進貨商</th>
                        <th className="border border-gray-300 p-2">進貨額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items.map((i, idx) => (
                        <tr key={idx}>
                          <td className="border border-gray-300 p-2">{i.name}</td>
                          <td className="border border-gray-300 p-2">{i.qty}</td>
                          <td className="border border-gray-300 p-2">{i.price}</td>
                          <td className="border border-gray-300 p-2">{i.cost}</td>
                          <td className="border border-gray-300 p-2">{i.supplier}</td>
                          <td className="border border-gray-300 p-2">{Number(i.qty || 0) * Number(i.cost || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="text-red-600 mt-2" onClick={() => deletePurchase(p.id)}>刪除進貨紀錄</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
