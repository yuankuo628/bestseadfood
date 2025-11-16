import { useState } from "react";
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

  // 訂單
  const [orders, setOrders] = useState([]);
  const [customer, setCustomer] = useState("");
  const [shipDate, setShipDate] = useState("");
  const [orderInputs, setOrderInputs] = useState({});
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editOrderItems, setEditOrderItems] = useState([]);

  // 訂單區間匯出
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  // 搜尋與排序
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const filteredItems = items.filter(i => (i.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const getValue = item => {
      if (sortConfig.key === "totalCost") return Number(item.qty || 0) * Number(item.cost || 0);
      return item[sortConfig.key];
    };

    const valA = getValue(a);
    const valB = getValue(b);

    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const requestSort = key => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  // 匯出庫存 Excel（中文欄位 + 避免科學記號）
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

  // 匯出訂單 Excel（全量）
  const exportOrdersToExcel = () => {
    const rows = orders.flatMap(order =>
      order.items.map(item => ({
        訂單ID: `'${order.id}`,
        客戶: order.customer,
        出貨日期: order.shipDate,
        建立時間: order.date,
        品名: item.name,
        數量: item.qty,
        售價: item.price,
        銷售額: item.qty * item.price,
        成本: items.find(i => i.name === item.name)?.cost ?? 0,
        毛利: (item.price - (items.find(i => i.name === item.name)?.cost ?? 0)) * item.qty
      }))
    );
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "訂單紀錄");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "訂單紀錄.xlsx");
  };

  // 匯出訂單 Excel（日期區間）
const exportOrdersToExcelByDate = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const filteredOrders = orders.filter(order => {
    const shipDate = new Date(order.shipDate);
    return shipDate >= start && shipDate <= end;
  });

  const rows = filteredOrders.flatMap(order =>
    order.items.map(item => ({
      訂單ID: `'${order.id}`,
      客戶: order.customer,
      出貨日期: order.shipDate,
      建立時間: order.date,
      品名: item.name,
      數量: item.qty,
      售價: item.price,
      銷售額: item.qty * item.price,
      成本: items.find(i => i.name === item.name)?.cost ?? 0,
      毛利: (item.price - (items.find(i => i.name === item.name)?.cost ?? 0)) * item.qty
    }))
  );

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "訂單紀錄");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, `訂單紀錄_${startDate}_至_${endDate}.xlsx`);
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

  // 訂單管理
  const handleOrderInput = (itemName, field, value) => {
    setOrderInputs(prev => ({ ...prev, [itemName]: { ...prev[itemName], [field]: value } }));
  };

  const addOrder = () => {
    if (!customer || !shipDate) return;
    const orderItems = Object.entries(orderInputs)
      .map(([n, d]) => {
        const item = items.find(it => it.name === n);
        const q = Number(d?.qty || 0);
        const p = d?.price !== undefined && d.price !== "" ? Number(d.price) : Number(item?.price || 0);
        return { name: n, qty: q, price: p };
      })
      .filter(o => o.qty > 0);

    if (orderItems.length === 0) return;

    const inventoryDelta = {};
    setItems(prev =>
      prev.map(item => {
        const ordered = orderItems.find(o => o.name === item.name);
        if (ordered) {
          inventoryDelta[item.name] = ordered.qty;
          return { ...item, qty: item.qty - ordered.qty };
        }
        return item;
      })
    );

    const totalAmount = orderItems.reduce((s, o) => s + o.qty * o.price, 0);
    const newOrder = {
      id: Date.now(),
      customer,
      shipDate,
      date: new Date().toLocaleString(),
      items: orderItems,
      totalAmount,
      inventoryDelta
    };

    setOrders(prev => [...prev, newOrder]);
    setCustomer(""); setShipDate(""); setOrderInputs({});
  };

  const deleteOrder = id => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const delta = order.inventoryDelta || {};
    setItems(prev => prev.map(item => ({ ...item, qty: item.qty + (delta[item.name] || 0) })));
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const startEditOrder = order => {
    setEditingOrderId(order.id);
    setEditOrderItems(order.items.map(i => ({ ...i })));
  };
  const updateEditOrderItem = (idx, field, value) => {
    setEditOrderItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: Number(value || 0) } : it)));
  };
  const saveEditOrder = () => {
    const order = orders.find(o => o.id === editingOrderId);
    if (!order) return;
    // 還原舊扣庫存
    setItems(prev => prev.map(item => ({ ...item, qty: item.qty + (order.inventoryDelta?.[item.name] || 0) })));
    // 套用新扣庫存
    const newDelta = {};
    setItems(prev =>
      prev.map(item => {
        const edited = editOrderItems.find(e => e.name === item.name);
        if (edited) {
          newDelta[item.name] = edited.qty;
          return { ...item, qty: item.qty - edited.qty };
        }
        return item;
      })
    );
    const newTotal = editOrderItems.reduce((s, i) => s + i.qty * i.price, 0);
    setOrders(prev =>
      prev.map(o => (o.id === editingOrderId ? { ...o, items: editOrderItems, totalAmount: newTotal, inventoryDelta: newDelta } : o))
    );
    setEditingOrderId(null);
    setEditOrderItems([]);
  };
  const cancelEditOrder = () => {
    setEditingOrderId(null);
    setEditOrderItems([]);
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
    setPurchaseList([{ name: "", qty: "", price: "", cost: "", supplier: "" }]);
  };
  const deletePurchase = id => {
    setPurchases(prev => prev.filter(p => p.id !== id));
  };

  // 庫存總計
  const totalValue = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0);
  const totalCostValue = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.cost || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-center">極海鮮八號鋪</h1>
      <div className="flex gap-4 justify-center">
        <button onClick={() => setPage("inventory")} className={`p-2 rounded ${page === "inventory" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>庫存管理</button>
        <button onClick={() => setPage("orders")} className={`p-2 rounded ${page === "orders" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>訂單管理</button>
        <button onClick={() => setPage("purchase")} className={`p-2 rounded ${page === "purchase" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>進貨管理</button>
      </div>

      {/* 庫存管理 */}
      {page === "inventory" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">庫存清單</h2>
          <div className="flex gap-2 items-center mb-2">
            <input className="border p-2 flex-1" placeholder="搜尋品名" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={exportToExcel}>匯出 Excel</button>
          </div>

          <div className="grid grid-cols-6 gap-2">
            <input className="border p-2" placeholder="品名" value={name} onChange={e => setName(e.target.value)} />
            <input className="border p-2" placeholder="數量" type="number" value={qty} onChange={e => setQty(e.target.value)} />
            <input className="border p-2" placeholder="售價" type="number" value={price} onChange={e => setPrice(e.target.value)} />
            <input className="border p-2" placeholder="成本" type="number" value={cost} onChange={e => setCost(e.target.value)} />
            <input className="border p-2" placeholder="進貨商" value={supplier} onChange={e => setSupplier(e.target.value)} />
            <button className="bg-blue-600 text-white rounded px-4" onClick={addItem}>{editId ? "儲存" : "新增"}</button>
          </div>

          <table className="w-full border border-gray-300 border-collapse text-sm mt-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => requestSort("name")}>品名</th>
                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => requestSort("qty")}>數量</th>
                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => requestSort("price")}>售價</th>
                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => requestSort("cost")}>成本</th>
                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => requestSort("supplier")}>進貨商</th>
                <th className="border border-gray-300 p-2 cursor-pointer" onClick={() => requestSort("totalCost")}>庫存成本金額</th>
                <th className="border border-gray-300 p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(i => (
                <tr key={i.id}>
                  <td className="border border-gray-300 p-2">{i.name}</td>
                  <td className="border border-gray-300 p-2">{i.qty}</td>
                  <td className="border border-gray-300 p-2">{i.price}</td>
                  <td className="border border-gray-300 p-2">{i.cost}</td>
                  <td className="border border-gray-300 p-2">{i.supplier}</td>
                  <td className="border border-gray-300 p-2">{Number(i.qty || 0) * Number(i.cost || 0)}</td>
                  <td className="border border-gray-300 p-2 space-x-2">
                    <button className="text-blue-600" onClick={() => editItem(i)}>編輯</button>
                    <button className="text-red-600" onClick={() => deleteItem(i.id)}>刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="font-bold mt-2">
            總庫存價值：${totalValue}｜總庫存成本金額：${totalCostValue}
          </div>
        </div>
      )}

      {/* 訂單管理 */}
      {page === "orders" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">訂單管理</h2>

          {/* 日期區間匯出 */}
          <div className="space-y-2">
            <div className="text-sm text-gray-600">📌 訂單匯出區間是依「出貨日期」篩選</div>
            <div className="flex gap-2 items-center">
              <input type="date" className="border p-2" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} />
              <input type="date" className="border p-2" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} />
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => exportOrdersToExcelByDate(exportStartDate, exportEndDate)}>匯出區間訂單</button>
             <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={exportOrdersToExcel}>匯出全部訂單</button>
            </div>
          </div>


          {/* 建立訂單 */}
          <div className="grid grid-cols-3 gap-2">
            <input className="border p-2" placeholder="客戶" value={customer} onChange={e => setCustomer(e.target.value)} />
            <input className="border p-2" type="date" value={shipDate} onChange={e => setShipDate(e.target.value)} />
            <button className="bg-green-600 text-white rounded px-4" onClick={addOrder}>建立訂單</button>
          </div>

          {/* 商品選擇表格 */}
          <table className="w-full border border-gray-300 border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2">品名</th>
                <th className="border border-gray-300 p-2">可用庫存</th>
                <th className="border border-gray-300 p-2">下單數量</th>
                <th className="border border-gray-300 p-2">售價</th>
                <th className="border border-gray-300 p-2">小計</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const oi = orderInputs[i.name] || {};
                const q = Number(oi.qty || 0);
                const p = oi.price !== undefined && oi.price !== "" ? Number(oi.price) : Number(i.price || 0);
                return (
                  <tr key={i.id}>
                    <td className="border border-gray-300 p-2">{i.name}</td>
                    <td className="border border-gray-300 p-2">{i.qty}</td>
                    <td className="border border-gray-300 p-2">
                      <input className="w-full border p-1" type="number" min="0" max={i.qty} value={oi.qty || ""} onChange={e => handleOrderInput(i.name, "qty", e.target.value)} />
                    </td>
                    <td className="border border-gray-300 p-2">
                      <input className="w-full border p-1" type="number" value={oi.price ?? i.price ?? 0} onChange={e => handleOrderInput(i.name, "price", e.target.value)} />
                    </td>
                    <td className="border border-gray-300 p-2">{q * p}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 訂單紀錄 */}
          <h2 className="text-xl font-bold">訂單紀錄</h2>
          <div className="space-y-2">
            {orders.map(order => {
              const isEditing = editingOrderId === order.id;
              const itemsToShow = isEditing ? editOrderItems : order.items;
              return (
                <div key={order.id} className="border p-2 rounded">
                  <div className="font-bold">
                    客戶：{order.customer} | 出貨日期：{order.shipDate} | 建立時間：{order.date} | 訂單總金額：${order.totalAmount}
                  </div>
                  <table className="w-full border border-gray-300 border-collapse text-sm mt-2">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 p-2">品名</th>
                        <th className="border border-gray-300 p-2">數量</th>
                        <th className="border border-gray-300 p-2">售價</th>
                        <th className="border border-gray-300 p-2">成本</th>
                        <th className="border border-gray-300 p-2">毛利</th>
                        <th className="border border-gray-300 p-2">毛利率</th>
                        <th className="border border-gray-300 p-2">銷售額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsToShow.map((oi, idx) => {
                        const item = items.find(it => it.name === oi.name);
                        const c = Number(item?.cost || 0);
                        const profit = (oi.price - c) * oi.qty;
                        const rate = oi.price > 0 ? (((oi.price - c) / oi.price) * 100).toFixed(2) + "%" : "0%";
                        return (
                          <tr key={idx}>
                            <td className="border border-gray-300 p-2">{oi.name}</td>
                            <td className="border border-gray-300 p-2">
                              {isEditing ? (
                                <input className="w-full border p-1" type="number" value={oi.qty} onChange={e => updateEditOrderItem(idx, "qty", e.target.value)} />
                              ) : oi.qty}
                            </td>
                            <td className="border border-gray-300 p-2">
                              {isEditing ? (
                                <input className="w-full border p-1" type="number" value={oi.price} onChange={e => updateEditOrderItem(idx, "price", e.target.value)} />
                              ) : oi.price}
                            </td>
                            <td className="border border-gray-300 p-2">{c}</td>
                            <td className="border border-gray-300 p-2">{profit}</td>
                            <td className="border border-gray-300 p-2">{rate}</td>
                            <td className="border border-gray-300 p-2">{oi.qty * oi.price}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex gap-3 mt-2">
                    {!isEditing && <button className="text-blue-600" onClick={() => startEditOrder(order)}>編輯</button>}
                    {isEditing && (
                      <>
                        <button className="text-green-600" onClick={saveEditOrder}>儲存</button>
                        <button className="text-gray-600" onClick={cancelEditOrder}>取消</button>
                      </>
                    )}
                    <button className="text-red-600 ml-auto" onClick={() => deleteOrder(order.id)}>刪除訂單</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 進貨管理 */}
      {page === "purchase" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">進貨管理</h2>

          <table className="w-full border border-gray-300 border-collapse text-sm">
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
              {purchaseList.map((p, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 p-2">
                    <input className="w-full border p-1" value={p.name} onChange={e => updatePurchaseRow(idx, "name", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input className="w-full border p-1" type="number" value={p.qty} onChange={e => updatePurchaseRow(idx, "qty", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input className="w-full border p-1" type="number" value={p.price} onChange={e => updatePurchaseRow(idx, "price", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input className="w-full border p-1" type="number" value={p.cost} onChange={e => updatePurchaseRow(idx, "cost", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 p-2">
                    <input className="w-full border p-1" value={p.supplier} onChange={e => updatePurchaseRow(idx, "supplier", e.target.value)} />
                  </td>
                  <td className="border border-gray-300 p-2">{Number(p.qty || 0) * Number(p.cost || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-2 mt-2">
            <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={addPurchaseRow}>新增商品列</button>
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={addPurchase}>完成進貨</button>
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
