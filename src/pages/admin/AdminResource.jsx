import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { Package, AlertTriangle, ShoppingCart, ChevronLeft, ChevronDown, ChevronRight, Download, Search, Star, Plus, Minus, X, CheckCircle, Upload, History, FileText, RefreshCcw } from 'lucide-react';

import { BACKEND_URL } from '../../config';
import { toast } from 'sonner';

export default function AdminResource() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState('All Data Mode');

  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const isPending = searchQuery !== deferredQuery;

  const [viewLevel, setViewLevel] = useState('category');
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const [editStates, setEditStates] = useState({});
  const [saveStatus, setSaveStatus] = useState({});

  const [purchaseOrder, setPurchaseOrder] = useState({});
  const [lowStockThreshold, setLowStockThreshold] = useState(20);

  const [restockView, setRestockView] = useState('tiers');
  const [selectedTier, setSelectedTier] = useState(null);
  const [restockCat, setRestockCat] = useState(null);
  const [restockSubcat, setRestockSubcat] = useState(null);
  const [restockBrand, setRestockBrand] = useState(null);

  // Audit & Ingestion State
  const [auditLogs, setAuditLogs] = useState([]);
  const [receiptData, setReceiptData] = useState([]);
  const [isIngesting, setIsIngesting] = useState(false);

  // --- NEW: Accordion State for Audit Logs ---
  const [expandedBatches, setExpandedBatches] = useState({});

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/products`);
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/restock_logs`);
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchAuditLogs();
  }, []);

  const handleEditChange = (pid, field, value) => {
    setEditStates(prev => ({ ...prev, [pid]: { ...prev[pid], [field]: value } }));
    if (saveStatus[pid]) {
      setSaveStatus(prev => { const next = { ...prev }; delete next[pid]; return next; });
    }
  };

  const handleSaveToDB = async (pid, originalRow) => {
    const edits = editStates[pid];
    if (!edits) return;

    setSaveStatus(prev => ({ ...prev, [pid]: 'saving' }));

    const payload = {
      product: edits.product !== undefined ? edits.product : originalRow.product,
      categories: edits.categories !== undefined ? edits.categories : originalRow.categories,
      sub_category: edits.sub_category !== undefined ? edits.sub_category : originalRow.sub_category,
      description: edits.description !== undefined ? edits.description : originalRow.description,
      sale_price: parseFloat(edits.sale_price !== undefined ? edits.sale_price : originalRow.sale_price) || 0,
      Cost_Price: parseFloat(edits.Cost_Price !== undefined ? edits.Cost_Price : originalRow.Cost_Price) || 0,
      Stock: parseInt(edits.Stock !== undefined ? edits.Stock : originalRow.Stock) || 0,
      Capacity: parseInt(edits.Capacity !== undefined ? edits.Capacity : originalRow.Capacity) || 0,
    };

    try {
      await axios.put(`${BACKEND_URL}/api/products/${pid}`, payload);
      setSaveStatus(prev => ({ ...prev, [pid]: 'success' }));
      setProducts(prev => prev.map(p => p.ProductID === pid ? { ...p, ...payload } : p));
      setTimeout(() => setSaveStatus(prev => { const next = { ...prev }; delete next[pid]; return next; }), 3000);
    } catch (err) {
      toast.error("Failed to save", { description: err.response?.data?.detail || err.message });
      setSaveStatus(prev => { const next = { ...prev }; delete next[pid]; return next; });
    }
  };

  const renderStars = (rating) => {
    const num = parseFloat(rating);
    if (isNaN(num) || num <= 0) return <div className="text-gray-500 text-xs font-medium h-4 flex items-center">No Rating</div>;
    const fullStars = Math.floor(num);
    const hasHalfStar = num % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1.5 h-4">
        <div className="flex items-center">
          {[...Array(fullStars)].map((_, i) => <Star key={`f-${i}`} size={12} className="fill-yellow-400 text-yellow-400" />)}
          {hasHalfStar && (
            <div className="relative">
              <Star size={12} className="text-gray-600" />
              <div className="absolute inset-0 overflow-hidden w-1/2"><Star size={12} className="fill-yellow-400 text-yellow-400" /></div>
            </div>
          )}
          {[...Array(emptyStars)].map((_, i) => <Star key={`e-${i}`} size={12} className="text-gray-600" />)}
        </div>
        <span className="text-[10px] font-bold text-gray-300">{num.toFixed(1)}</span>
      </div>
    );
  };

  const renderProductCards = (items) => {
    if (items.length === 0) return <div className="p-8 text-center text-gray-500 bg-gray-800/30 rounded-xl border border-gray-700 border-dashed">No products to display.</div>;
    const visibleItems = deferredQuery ? items.slice(0, 50) : items;

    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {visibleItems.map(row => {
          const pid = row.ProductID;
          const currentEdits = editStates[pid] || {};
          const status = saveStatus[pid];
          const hasEdits = Object.keys(currentEdits).length > 0;

          return (
            <div key={pid} className={`bg-gray-800 border rounded-xl p-4 flex flex-col relative shadow-md transition-colors ${hasEdits ? 'border-blue-500/50' : 'border-gray-700'}`}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Product Name</label>
              <input type="text" value={currentEdits.product !== undefined ? currentEdits.product : (row.product || '')} onChange={e => handleEditChange(pid, 'product', e.target.value)} className="bg-gray-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded p-2 text-sm font-bold text-white mb-1 outline-none transition-all" />
              <div className="text-[9px] text-gray-500 mb-3 font-mono truncate px-1">ID: {pid}</div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Category</label>
                  <input type="text" value={currentEdits.categories !== undefined ? currentEdits.categories : (row.categories || '')} onChange={e => handleEditChange(pid, 'categories', e.target.value)} className="w-full bg-gray-900/80 border border-gray-600 focus:border-blue-500 rounded p-2 text-xs text-white outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Sub-Category</label>
                  <input type="text" value={currentEdits.sub_category !== undefined ? currentEdits.sub_category : (row.sub_category || '')} onChange={e => handleEditChange(pid, 'sub_category', e.target.value)} className="w-full bg-gray-900/80 border border-gray-600 focus:border-blue-500 rounded p-2 text-xs text-white outline-none" />
                </div>
              </div>

              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Description</label>
              <textarea value={currentEdits.description !== undefined ? currentEdits.description : (row.description || '')} onChange={e => handleEditChange(pid, 'description', e.target.value)} className="w-full bg-gray-900/80 border border-gray-600 focus:border-blue-500 rounded p-2 text-xs text-gray-300 mb-3 h-16 resize-none outline-none leading-relaxed" />

              <div className="mb-4 bg-gray-900/50 p-2 rounded border border-gray-700/50">{renderStars(row.rating)}</div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Sale Price</label>
                  <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span><input type="number" value={currentEdits.sale_price !== undefined ? currentEdits.sale_price : (row.sale_price || 0)} onChange={e => handleEditChange(pid, 'sale_price', e.target.value)} className="w-full bg-gray-900/80 border border-gray-600 focus:border-blue-500 rounded p-2 pl-5 text-xs text-blue-400 font-black outline-none" /></div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Cost Price</label>
                  <div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span><input type="number" value={currentEdits.Cost_Price !== undefined ? currentEdits.Cost_Price : (row.Cost_Price || 0)} onChange={e => handleEditChange(pid, 'Cost_Price', e.target.value)} className="w-full bg-gray-900/80 border border-gray-600 focus:border-emerald-500 rounded p-2 pl-5 text-xs text-emerald-400 font-bold outline-none" /></div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Stock</label>
                  <input type="number" value={currentEdits.Stock !== undefined ? currentEdits.Stock : (row.Stock || 0)} onChange={e => handleEditChange(pid, 'Stock', e.target.value)} className={`w-full bg-gray-900/80 border focus:border-blue-500 rounded p-2 text-xs font-bold outline-none ${Number(currentEdits.Stock !== undefined ? currentEdits.Stock : row.Stock) < lowStockThreshold ? 'text-red-400 border-red-900/50' : 'text-white border-gray-600'}`} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Capacity</label>
                  <input type="number" value={currentEdits.Capacity !== undefined ? currentEdits.Capacity : (row.Capacity || 0)} onChange={e => handleEditChange(pid, 'Capacity', e.target.value)} className="w-full bg-gray-900/80 border border-gray-600 focus:border-blue-500 rounded p-2 text-xs text-gray-400 outline-none" />
                </div>
              </div>

              <div className="mt-auto pt-2 border-t border-gray-700/50">
                <button disabled={!hasEdits || status === 'saving'} onClick={() => handleSaveToDB(pid, row)} className={`w-full py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-all ${status === 'success' ? 'bg-emerald-600 text-white' : hasEdits ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                  {status === 'saving' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : status === 'success' ? <><CheckCircle size={16} /> Saved!</> : '💾 Commit Changes'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredSearchProducts = useMemo(() => {
    if (!deferredQuery) return [];
    const q = deferredQuery.toLowerCase();
    return products.filter(p => p.product?.toLowerCase().includes(q) || p.ProductID?.toLowerCase().includes(q) || p.categories?.toLowerCase().includes(q));
  }, [products, deferredQuery]);

  const tiers = useMemo(() => {
    const lowStock = products.filter(p => (parseFloat(p.Stock) || 0) < lowStockThreshold);
    return {
      "⭐⭐⭐⭐⭐ Priority (4.5+)": lowStock.filter(p => (parseFloat(p.rating) || 0) >= 4.5),
      "⭐⭐⭐⭐ High (4.0 - 4.4)": lowStock.filter(p => { const r = parseFloat(p.rating) || 0; return r >= 4.0 && r < 4.5; }),
      "⭐⭐⭐ Medium (3.0 - 3.9)": lowStock.filter(p => { const r = parseFloat(p.rating) || 0; return r >= 3.0 && r < 4.0; }),
      "⭐⭐ Low (< 3.0)": lowStock.filter(p => (parseFloat(p.rating) || 0) < 3.0)
    };
  }, [products, lowStockThreshold]);

  const addVisibleToPO = (items) => {
    setPurchaseOrder(prev => {
      const newPO = { ...prev };
      items.forEach(row => {
        const cap = parseFloat(row.Capacity) || 100;
        const stock = parseFloat(row.Stock) || 0;
        const qty = Math.max(1, cap - stock);
        if (row.ProductID) {
          newPO[row.ProductID] = {
            name: row.product || 'Unknown',
            category: row.categories || 'General',
            sub_category: row.sub_category || 'Uncategorized',
            brand: row.brand || 'General',
            qty: (newPO[row.ProductID]?.qty || 0) + qty
          };
        }
      });
      return newPO;
    });
  };

  const handleAutoFillPO = () => { addVisibleToPO(products.filter(p => (parseFloat(p.Stock) || 0) < lowStockThreshold)); };
  const adjustPOQty = (pid, amount) => { setPurchaseOrder(prev => { const next = (prev[pid]?.qty || 0) + amount; if (next <= 0) { const newPO = { ...prev }; delete newPO[pid]; return newPO; } return { ...prev, [pid]: { ...prev[pid], qty: next } }; }); };
  const removeFromPO = (pid) => { setPurchaseOrder(prev => { const newPO = { ...prev }; delete newPO[pid]; return newPO; }); };

  const downloadPO = () => {
    if (Object.keys(purchaseOrder).length === 0) return;
    const data = Object.entries(purchaseOrder).map(([pid, info]) => ({
      ProductID: pid,
      'Product Name': info.name,
      'Category': info.category,
      'Sub-Category': info.sub_category,
      'Brand': info.brand,
      'Qty to Order': info.qty
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Purchase_Order_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const df = results.data;
        if (df.length === 0) return;

        const cols = Object.keys(df[0]);
        const pidCol = cols.find(c => c.toLowerCase().includes('id'));
        const qtyCol = cols.find(c => c.toLowerCase().includes('received') || c.toLowerCase().includes('shipped')) || cols.find(c => c.toLowerCase().includes('order')) || cols.find(c => c.toLowerCase().includes('qty'));

        if (!pidCol || !qtyCol) {
          toast.error("Invalid CSV format", { description: "Could not identify 'ProductID' or 'Quantity' columns in your receipt CSV." });
          return;
        }

        const validItems = df.map(row => ({
          ProductID: row[pidCol],
          Product_Name: row['Product Name'] || 'Unknown',
          Qty_Received: parseInt(row[qtyCol]) || 0
        })).filter(item => item.ProductID && item.Qty_Received > 0);

        setReceiptData(validItems);
      }
    });
  };

  const processReceipt = async () => {
    if (receiptData.length === 0) return;
    setIsIngesting(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/restock`, { items: receiptData });
      toast.success(res.data.message);
      setReceiptData([]);
      fetchInventory();
      fetchAuditLogs();
    } catch (err) {
      toast.error("Receipt Ingestion Failed", { description: err.response?.data?.detail || err.message });
    } finally {
      setIsIngesting(false);
    }
  };

  // --- NEW: Group Audit Logs by Batch ---
  const groupedAuditLogs = useMemo(() => {
    const groups = {};
    auditLogs.forEach(log => {
      if (!groups[log.Batch_ID]) {
        groups[log.Batch_ID] = {
          batchId: log.Batch_ID,
          timestamp: log.Timestamp,
          totalQty: 0,
          items: []
        };
      }
      groups[log.Batch_ID].items.push(log);
      groups[log.Batch_ID].totalQty += log.Qty_Added;
    });
    // Return sorted by timestamp descending
    return Object.values(groups).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [auditLogs]);

  const toggleBatch = (batchId) => {
    setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-blue-400 gap-4">
      <div className="w-10 h-10 border-4 border-blue-900 border-t-blue-500 rounded-full animate-spin"></div>
      <span className="font-bold tracking-widest uppercase text-sm">Loading Database...</span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><Package className="text-blue-400" /> Resource Management</h2>
          <p className="text-gray-400 text-sm mt-1">Edit database records directly or generate automated restock orders.</p>
        </div>
        <div className="flex bg-gray-900 rounded-xl p-1.5 border border-gray-700 shadow-inner overflow-x-auto">
          {['All Data Mode', 'Flagged Mode', 'Stocks & Restocking Mode', 'Receipts & Audit'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setSearchQuery(''); }}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${mode === m ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'All Data Mode' && (
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Instant global search by Name, ID, or Category..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-medium" />
            {isPending && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>}
          </div>
          {searchQuery ? renderProductCards(filteredSearchProducts) : (
            <>
              {viewLevel === 'category' && <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">{[...new Set(products.map(p => p.categories).filter(Boolean))].map(cat => <button key={cat} onClick={() => { setSelectedCat(cat); setViewLevel('sub_category'); }} className="bg-gray-800 hover:bg-blue-900 hover:border-blue-700 border border-gray-700 p-6 rounded-xl font-bold text-lg transition-all shadow-sm">{cat}</button>)}</div>}
              {viewLevel === 'sub_category' && <div className="animate-in fade-in slide-in-from-right-4"><button onClick={() => setViewLevel('category')} className="mb-6 text-gray-400 hover:text-white flex items-center font-bold bg-gray-800 px-4 py-2 rounded-lg w-fit"><ChevronLeft size={18} className="mr-1" /> Back</button><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...new Set(products.filter(p => p.categories === selectedCat).map(p => p.sub_category).filter(Boolean))].map(sub => <button key={sub} onClick={() => { setSelectedSubcat(sub); const temp = products.filter(p => p.categories === selectedCat && p.sub_category === sub); if (temp.filter(p => !p.brand).length / temp.length <= 0.85) setViewLevel('brand'); else { setSelectedBrand(null); setViewLevel('products'); } }} className="bg-gray-800 hover:bg-indigo-900 hover:border-indigo-700 border border-gray-700 p-5 rounded-xl font-bold transition-all shadow-sm">{sub}</button>)}</div></div>}
              {viewLevel === 'brand' && <div className="animate-in fade-in slide-in-from-right-4"><button onClick={() => setViewLevel('sub_category')} className="mb-6 text-gray-400 hover:text-white flex items-center font-bold bg-gray-800 px-4 py-2 rounded-lg w-fit"><ChevronLeft size={18} className="mr-1" /> Back</button><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...new Set(products.filter(p => p.categories === selectedCat && p.sub_category === selectedSubcat).map(p => p.brand || 'General'))].map(br => <button key={br} onClick={() => { setSelectedBrand(br); setViewLevel('products'); }} className="bg-gray-800 hover:bg-purple-900 hover:border-purple-700 border border-gray-700 p-5 rounded-xl font-bold transition-all shadow-sm">{br}</button>)}</div></div>}
              {viewLevel === 'products' && <div className="animate-in fade-in slide-in-from-right-4"><button onClick={() => setViewLevel(selectedBrand ? 'brand' : 'sub_category')} className="mb-6 text-gray-400 hover:text-white flex items-center font-bold bg-gray-800 px-4 py-2 rounded-lg w-fit"><ChevronLeft size={18} className="mr-1" /> Back to Folders</button>{renderProductCards(products.filter(p => p.categories === selectedCat && p.sub_category === selectedSubcat && (!selectedBrand || (p.brand || 'General') === selectedBrand)))}</div>}
            </>
          )}
        </div>
      )}

      {mode === 'Flagged Mode' && (
        <div className="bg-gray-900 border-2 border-red-900/50 p-6 rounded-2xl shadow-xl animate-in fade-in">
          <div className="flex items-center gap-3 mb-2"><div className="p-3 bg-red-900/30 rounded-xl text-red-400"><AlertTriangle size={24} /></div><h3 className="text-2xl font-black text-white">Flagged Database Records</h3></div>
          <p className="text-gray-400 mb-8 ml-14">The system detected missing names, unassigned pricing, or undefined stock levels in these rows.</p>
          {renderProductCards(products.filter(p => !p.sale_price || parseFloat(p.sale_price) === 0 || !p.product || !p.product.trim() || p.Stock === null || p.Stock === undefined))}
        </div>
      )}

      {mode === 'Stocks & Restocking Mode' && (
        <div className="flex flex-col xl:flex-row gap-6 animate-in fade-in">
          <div className="flex-[2] space-y-6">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="flex-1 w-full"><label className="block text-gray-400 font-bold mb-2 text-sm uppercase tracking-wider">📉 Global Low Stock Threshold</label><div className="flex items-center gap-3"><input type="number" value={lowStockThreshold} onChange={e => setLowStockThreshold(Number(e.target.value))} className="bg-gray-800 border border-gray-700 p-3 rounded-xl text-white font-black text-xl w-32 focus:ring-2 focus:ring-blue-500 outline-none" /><span className="text-gray-500 font-medium">Units</span></div></div>
              <button onClick={handleAutoFillPO} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-6 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"><Package size={20} /> Auto-Fill entire P.O.</button>
            </div>

            <div className="relative bg-gray-900 rounded-2xl border border-gray-800 shadow-sm p-2">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Search database to manually add items to PO..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow font-medium" />
            </div>

            {searchQuery ? (
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg">
                <h3 className="font-bold text-gray-300 mb-4 border-b border-gray-800 pb-2">Manual Search Results</h3>
                <div className="overflow-hidden border border-gray-800 rounded-xl"><table className="w-full text-left text-sm"><thead className="bg-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px]"><tr><th className="p-4">Product Name</th><th className="p-4 w-24">Current Stock</th><th className="p-4 w-24">Action</th></tr></thead><tbody className="divide-y divide-gray-800 bg-gray-900/50">{filteredSearchProducts.slice(0, 30).map(p => (<tr key={p.ProductID} className="hover:bg-gray-800/50 transition-colors"><td className="p-4 font-medium text-gray-200 max-w-[200px] truncate">{p.product}</td><td className={`p-4 font-black ${p.Stock < lowStockThreshold ? 'text-red-400' : 'text-emerald-400'}`}>{p.Stock}</td><td className="p-3"><button onClick={() => addVisibleToPO([p])} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition-colors flex justify-center w-full"><Plus size={18} /></button></td></tr>))}</tbody></table></div>
              </div>
            ) : (
              <>
                {restockView === 'tiers' && <div className="space-y-4">{Object.entries(tiers).map(([tName, tItems]) => (<div key={tName} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md transition-all hover:border-gray-700"><div><div className="font-black text-lg text-white mb-1">{tName}</div><div className="text-sm font-medium text-red-400 bg-red-950/30 px-3 py-1 rounded-full w-fit">Critically Low: {tItems.length} items</div></div><div className="flex gap-3"><button onClick={() => addVisibleToPO(tItems)} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border border-blue-500/30"><Plus size={16} /> Add Tier to P.O.</button><button onClick={() => { setSelectedTier(tName); setRestockView('category'); }} className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold border border-gray-700 transition-all">Drill Down</button></div></div>))}</div>}
                {restockView === 'category' && <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg"><button onClick={() => setRestockView('tiers')} className="mb-6 text-gray-400 hover:text-white flex items-center font-bold bg-gray-800 px-4 py-2 rounded-lg w-fit"><ChevronLeft size={18} className="mr-1" /> Back to Priority Tiers</button><h3 className="font-black text-2xl mb-6 text-white border-b border-gray-800 pb-4">{selectedTier}</h3><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Object.entries(tiers[selectedTier].reduce((acc, p) => { acc[p.categories] = (acc[p.categories] || 0) + 1; return acc; }, {})).map(([c, count]) => (<div key={c} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex flex-col gap-3 hover:border-gray-600 transition-all shadow-sm"><button onClick={() => { setRestockCat(c); setRestockView('sub_category'); }} className="text-left font-bold text-gray-200 hover:text-blue-400 transition-colors flex justify-between items-start"><span className="leading-tight pr-2">{c}</span><span className="bg-red-950/50 text-red-400 px-2 py-0.5 rounded text-xs shrink-0">{count}</span></button><button onClick={(e) => { e.stopPropagation(); addVisibleToPO(tiers[selectedTier].filter(p => p.categories === c)); }} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors w-full flex items-center justify-center gap-1"><Plus size={14} /> Quick Add</button></div>))}</div></div>}
                {restockView === 'sub_category' && <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg"><button onClick={() => setRestockView('category')} className="mb-6 text-gray-400 hover:text-white flex items-center font-bold bg-gray-800 px-4 py-2 rounded-lg w-fit"><ChevronLeft size={18} className="mr-1" /> Back</button><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Object.entries(tiers[selectedTier].filter(p => p.categories === restockCat).reduce((acc, p) => { acc[p.sub_category] = (acc[p.sub_category] || 0) + 1; return acc; }, {})).map(([sc, count]) => (<div key={sc} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex flex-col gap-3 hover:border-gray-600 transition-all shadow-sm"><button onClick={() => { setRestockSubcat(sc); const temp = tiers[selectedTier].filter(p => p.categories === restockCat && p.sub_category === sc); if (temp.filter(p => !p.brand).length / temp.length <= 0.85) setRestockView('brand'); else setRestockView('items'); }} className="text-left font-bold text-gray-200 hover:text-blue-400 transition-colors flex justify-between items-start"><span className="leading-tight pr-2">{sc}</span><span className="bg-red-950/50 text-red-400 px-2 py-0.5 rounded text-xs shrink-0">{count}</span></button><button onClick={(e) => { e.stopPropagation(); addVisibleToPO(tiers[selectedTier].filter(p => p.categories === restockCat && p.sub_category === sc)); }} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors w-full flex items-center justify-center gap-1"><Plus size={14} /> Quick Add</button></div>))}</div></div>}
                {restockView === 'brand' && <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg"><button onClick={() => setRestockView('sub_category')} className="mb-6 text-gray-400 hover:text-white flex items-center font-bold bg-gray-800 px-4 py-2 rounded-lg w-fit"><ChevronLeft size={18} className="mr-1" /> Back</button><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Object.entries(tiers[selectedTier].filter(p => p.categories === restockCat && p.sub_category === restockSubcat).reduce((acc, p) => { acc[p.brand || 'General'] = (acc[p.brand || 'General'] || 0) + 1; return acc; }, {})).map(([br, count]) => (<div key={br} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex flex-col gap-3 hover:border-gray-600 transition-all shadow-sm"><button onClick={() => { setRestockBrand(br); setRestockView('items'); }} className="text-left font-bold text-gray-200 hover:text-blue-400 transition-colors flex justify-between items-start"><span className="leading-tight pr-2">{br}</span><span className="bg-red-950/50 text-red-400 px-2 py-0.5 rounded text-xs shrink-0">{count}</span></button><button onClick={(e) => { e.stopPropagation(); addVisibleToPO(tiers[selectedTier].filter(p => p.categories === restockCat && p.sub_category === restockSubcat && (p.brand || 'General') === br)); }} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors w-full flex items-center justify-center gap-1"><Plus size={14} /> Quick Add</button></div>))}</div></div>}
                {restockView === 'items' && <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-lg"><button onClick={() => setRestockView('brand')} className="mb-6 text-gray-400 hover:text-white flex items-center font-bold bg-gray-800 px-4 py-2 rounded-lg w-fit"><ChevronLeft size={18} className="mr-1" /> Back</button><div className="overflow-hidden border border-gray-800 rounded-xl mb-6"><table className="w-full text-left text-sm"><thead className="bg-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px]"><tr><th className="p-4">Product Name</th><th className="p-4 w-24">Current Stock</th><th className="p-4 w-24">Shelf Cap</th><th className="p-4 w-20 text-center">Action</th></tr></thead><tbody className="divide-y divide-gray-800 bg-gray-900/50">{tiers[selectedTier].filter(p => p.categories === restockCat && p.sub_category === restockSubcat && (!restockBrand || (p.brand || 'General') === restockBrand)).map(p => (<tr key={p.ProductID} className="hover:bg-gray-800/50 transition-colors"><td className="p-4 font-medium text-gray-200">{p.product}</td><td className="p-4 text-red-400 font-black">{p.Stock}</td><td className="p-4 text-blue-400 font-bold">{p.Capacity || 100}</td><td className="p-3"><button onClick={() => addVisibleToPO([p])} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition-colors flex justify-center w-full"><Plus size={18} /></button></td></tr>))}</tbody></table></div><button onClick={() => addVisibleToPO(tiers[selectedTier].filter(p => p.categories === restockCat && p.sub_category === restockSubcat && (!restockBrand || (p.brand || 'General') === restockBrand)))} className="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 py-4 rounded-xl font-black shadow-lg transition-all flex justify-center items-center gap-2"><Plus size={20} /> Add All Visible Items to P.O.</button></div>}
              </>
            )}
          </div>

          <div className="flex-1 xl:max-w-md">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl sticky top-6 flex flex-col max-h-[calc(100vh-2rem)]">
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4"><h3 className="text-xl font-black flex items-center gap-2 text-white"><ShoppingCart className="text-indigo-400" /> Purchase Order</h3><span className="bg-indigo-600 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">{Object.keys(purchaseOrder).length} SKUs</span></div>
              {Object.keys(purchaseOrder).length === 0 ? <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500 text-center"><div className="bg-gray-800/50 p-6 rounded-full mb-4 border border-gray-700/50"><Package size={32} className="opacity-40" /></div><p className="font-medium text-sm">Purchase order is empty.</p><p className="text-xs text-gray-600 mt-2">Use Auto-Fill or drill down to add items.</p></div> : <><div className="flex-1 overflow-y-auto mb-6 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-700">{Object.entries(purchaseOrder).map(([pid, info]) => (<div key={pid} className="bg-gray-800 border border-gray-700 p-3 rounded-xl flex flex-col gap-2 relative group"><button onClick={() => removeFromPO(pid)} className="absolute -top-2 -right-2 bg-gray-700 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md"><X size={12} /></button><span className="text-sm font-bold text-gray-200 leading-tight pr-4">{info.name}</span><div className="flex justify-between items-center mt-1"><span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Order Qty</span><div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg p-0.5"><button onClick={() => adjustPOQty(pid, -1)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-md"><Minus size={14} /></button><span className="w-10 text-center font-black text-blue-400 text-sm">{info.qty}</span><button onClick={() => adjustPOQty(pid, 1)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-md"><Plus size={14} /></button></div></div></div>))}</div><div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-800"><button onClick={() => setPurchaseOrder({})} className="col-span-1 bg-gray-800 hover:bg-red-900/80 text-gray-300 hover:text-red-300 py-3 rounded-xl text-sm font-bold border border-gray-700 hover:border-red-800 transition-colors">Clear All</button><button onClick={downloadPO} className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-black flex justify-center items-center gap-2 shadow-lg shadow-indigo-900/20 transition-all"><Download size={18} /> Export CSV</button></div></>}
            </div>
          </div>
        </div>
      )}

      {mode === 'Receipts & Audit' && (
        <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in">
          <div className="flex-1 space-y-6">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
              <h3 className="text-xl font-black text-white flex items-center gap-2 mb-2"><Upload className="text-emerald-400" /> Ingest Supplier Receipt</h3>
              <p className="text-gray-400 text-sm mb-6">Upload the CSV returned by your supplier. The system will auto-detect Product IDs and incoming quantities.</p>

              <div className="relative mb-6">
                <input type="file" accept=".csv" onChange={handleReceiptUpload} className="w-full text-gray-400 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-emerald-600/20 file:text-emerald-400 hover:file:bg-emerald-600 hover:file:text-white transition-all cursor-pointer bg-gray-800 border border-gray-700 rounded-xl" />
              </div>

              {receiptData.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preview ({receiptData.length} items)</span>
                  </div>
                  <div className="overflow-y-auto max-h-64 border border-gray-800 rounded-xl mb-4 scrollbar-thin">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                        <tr><th className="p-3">Product Name</th><th className="p-3 w-32 text-right">Qty Received</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                        {receiptData.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-3 font-medium text-gray-300 max-w-[200px] truncate">{item.Product_Name}</td>
                            <td className="p-3 text-emerald-400 font-black text-right">+{item.Qty_Received}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={processReceipt}
                    disabled={isIngesting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-900/20 transition-all flex justify-center items-center gap-2"
                  >
                    {isIngesting ? <RefreshCcw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                    {isIngesting ? 'Updating Database...' : 'Confirm Restock & Update Shelves'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 xl:flex-[1.5]">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg h-full">
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h3 className="text-xl font-black text-white flex items-center gap-2"><History className="text-blue-400" /> Restock Audit Trail</h3>
                <button onClick={fetchAuditLogs} className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-colors border border-gray-700">
                  <RefreshCcw size={16} />
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <FileText size={48} className="opacity-20 mb-4" />
                  <p className="font-medium text-sm">No restock logs found.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[600px] pr-2 scrollbar-thin scrollbar-thumb-gray-700 space-y-4">
                  {groupedAuditLogs.map((group) => {
                    const isExpanded = expandedBatches[group.batchId];
                    return (
                      <div key={group.batchId} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-sm transition-all">
                        {/* Accordion Header */}
                        <button
                          onClick={() => toggleBatch(group.batchId)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </div>
                            <div>
                              <div className="font-bold text-gray-200 flex items-center gap-2">
                                Receipt Batch
                                <span className="font-mono bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700 text-[10px] text-blue-400">{group.batchId}</span>
                              </div>
                              <div className="text-xs text-gray-500 font-medium mt-0.5">{group.timestamp} • {group.items.length} unique items</div>
                            </div>
                          </div>
                          <div className="bg-emerald-900/30 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-800/50 font-black text-sm">
                            +{group.totalQty} Units
                          </div>
                        </button>

                        {/* Expanded Inner Table */}
                        {isExpanded && (
                          <div className="border-t border-gray-700 bg-gray-900/50 p-4 animate-in slide-in-from-top-2">
                            <table className="w-full text-left text-sm">
                              <thead className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                  <th className="pb-3 pl-2">Product Name</th>
                                  <th className="pb-3 pr-2 text-right">Qty Added</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800">
                                {group.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="py-2.5 pl-2 text-gray-300 font-medium">{item.Product_Name}</td>
                                    <td className="py-2.5 pr-2 text-emerald-400 font-bold text-right">+{item.Qty_Added}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}