import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { Upload, Settings, RefreshCcw, Database, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { BACKEND_URL } from '../../config';
import { toast } from 'sonner';

export default function ImportWizard() {
  const [mode, setMode] = useState('inventory');

  // -- INVENTORY STATE --
  const [step, setStep] = useState(1);
  const [rawDf, setRawDf] = useState([]);
  const [workingDf, setWorkingDf] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importMode, setImportMode] = useState('update');

  const [defaultCapacity, setDefaultCapacity] = useState(100);
  const [ratingMethod, setRatingMethod] = useState('median');
  const [customRating, setCustomRating] = useState(2.5);

  const mandatoryCols = ['ProductID', 'rating', 'Stock', 'Capacity', 'product', 'sale_price', 'categories', 'sub_category', 'Cost_Price'];
  const autoGenerateOptions = ['Capacity'];

  // -- SALES STATE --
  const [salesData, setSalesData] = useState([]);
  const [salesCols, setSalesCols] = useState([]);
  const [salesMapping, setSalesMapping] = useState({});
  const [salesUploading, setSalesUploading] = useState(false);
  const [salesImportMode, setSalesImportMode] = useState('append');
  
  // New: Chunk streaming metrics for user feedback
  const [uploadProgress, setUploadProgress] = useState(0);

  const baseMandatory = ['Transaction_ID', 'Timestamp', 'ProductID', 'Qty_Sold', 'Category', 'Sub_Category'];
  const financialCols = ['Sale_Price', 'Cost_Price', 'Profit'];

  // ----------- INVENTORY LOGIC -----------
  const handleInventoryUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const df = results.data;
        if (df.length === 0) return;

        const cols = Object.keys(df[0]);
        const validCols = cols.filter(col => df.some(row => row[col] !== '' && row[col] !== null && row[col] !== undefined));

        const cleanedDf = df.map(row => {
          let newRow = {};
          validCols.forEach(col => newRow[col] = row[col]);
          return newRow;
        });

        setRawDf(cleanedDf);
        setWorkingDf(cleanedDf);
        setColumns(validCols);

        const initialMapping = {};
        mandatoryCols.forEach(col => {
          if (validCols.includes(col)) {
            initialMapping[col] = col;
          } else {
            initialMapping[col] = '';
          }
        });
        setMapping(initialMapping);
        setStep(2);
      }
    });
  };

  const handleApplyMapping = () => {
    const missing = mandatoryCols.filter(col => !mapping[col] && !autoGenerateOptions.includes(col));
    if (missing.length > 0) {
      toast.error("Missing Columns", { description: `Please map the following required columns: ${missing.join(', ')}` });
      return;
    }

    const newDf = rawDf.map(row => {
      let mappedRow = { ...row };
      Object.entries(mapping).forEach(([target, source]) => {
        if (source && source !== 'auto') {
          mappedRow[target] = row[source];
          if (target !== source) {
            delete mappedRow[source];
          }
        }
      });
      return mappedRow;
    });

    setWorkingDf(newDf);
    setStep(3);
  };

  const handleApplyFixes = () => {
    let fallbackRating = customRating;
    if (ratingMethod !== 'custom') {
      const validRatings = workingDf.map(r => parseFloat(r.rating)).filter(v => !isNaN(v));
      if (validRatings.length > 0) {
        if (ratingMethod === 'mean') {
          fallbackRating = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
        } else {
          validRatings.sort((a, b) => a - b);
          const mid = Math.floor(validRatings.length / 2);
          fallbackRating = validRatings.length % 2 !== 0 ? validRatings[mid] : (validRatings[mid - 1] + validRatings[mid]) / 2;
        }
      }
    }

    const fixedDf = workingDf.map(row => {
      const newRow = { ...row };

      if (mapping['Capacity'] === 'auto' || !newRow['Capacity']) {
        newRow['Capacity'] = defaultCapacity;
      }

      if (!newRow['rating']) {
        newRow['rating'] = fallbackRating;
      }

      newRow['categories'] = newRow['categories'] || 'General';
      newRow['sub_category'] = newRow['sub_category'] || 'Uncategorized';
      newRow['brand'] = newRow['brand'] || 'General';
      newRow['description'] = newRow['description'] || 'No description provided';

      return newRow;
    });

    setWorkingDf(fixedDf);
    setStep(4);
  };

  const submitInventory = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/import_inventory`, {
        data: workingDf,
        mode: importMode
      });
      toast.success(res.data.message);
      setStep(1);
    } catch (err) {
      toast.error("Integration Error", { description: err.response?.data?.detail || err.message });
    }
  };


  // ----------- SALES LOGIC -----------
  const handleSalesUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const df = results.data;
        if (df.length === 0) return;

        const fileCols = Object.keys(df[0]);
        setSalesData(df);
        setSalesCols(fileCols);

        const autoMap = {};
        const allTargetCols = [...baseMandatory, ...financialCols];

        allTargetCols.forEach(targetCol => {
          const match = fileCols.find(c =>
            c.toLowerCase().replace(/_/g, '') === targetCol.toLowerCase().replace(/_/g, '')
          );
          autoMap[targetCol] = match || '';
        });

        setSalesMapping(autoMap);
      }
    });
  };

  const processAndUploadSales = async () => {
    const missingBase = baseMandatory.filter(col => !salesMapping[col]);
    if (missingBase.length > 0) {
      toast.error("Missing Core Columns", { description: `Missing core columns: ${missingBase.join(', ')}` });
      return;
    }

    const mappedFinCount = financialCols.filter(col => salesMapping[col] && salesMapping[col] !== 'auto').length;
    if (mappedFinCount < 2) {
      toast.error("Missing Financial Columns", { description: "You must map at least TWO financial columns (Sale_Price, Cost_Price, Profit)." });
      return;
    }

    setSalesUploading(true);
    setUploadProgress(0);

    try {
      const processedData = salesData.map(row => {
        const newRow = {};

        baseMandatory.forEach(col => {
          newRow[col] = row[salesMapping[col]];
        });

        let sp = parseFloat(row[salesMapping['Sale_Price']]);
        let cp = parseFloat(row[salesMapping['Cost_Price']]);
        let pr = parseFloat(row[salesMapping['Profit']]);
        const qty = parseFloat(newRow['Qty_Sold']) || 0;

        if (!salesMapping['Profit'] || salesMapping['Profit'] === 'auto' || isNaN(pr)) pr = (sp - cp) * qty;
        else if (!salesMapping['Cost_Price'] || salesMapping['Cost_Price'] === 'auto' || isNaN(cp)) cp = sp - (pr / qty);
        else if (!salesMapping['Sale_Price'] || salesMapping['Sale_Price'] === 'auto' || isNaN(sp)) sp = cp + (pr / qty);

        newRow['Sale_Price'] = sp;
        newRow['Cost_Price'] = cp;
        newRow['Profit'] = pr;
        newRow['Total_Price'] = sp * qty;
        newRow['Qty_Sold'] = qty;

        newRow['Category'] = newRow['Category'] || 'General';
        newRow['Sub_Category'] = newRow['Sub_Category'] || 'Uncategorized';
        newRow['Brand'] = row['Brand'] || 'General';
        newRow['Product_Name'] = row['Product_Name'] || 'Unknown';

        try {
          const dt = new Date(newRow['Timestamp']);
          if (!isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            newRow['Timestamp'] = `${y}-${m}-${d} ${hh}:${mm}`;
          }
        } catch (e) { }

        return newRow;
      }).filter(r => r.Timestamp);

      // --- NEW: CHUNKED BATCH STREAMING LAYER FOR CLOUD ROUTING ---
      const chunkSize = 400; // Optimal safe block width for free containers
      const totalRecords = processedData.length;
      let targetExecutionMode = salesImportMode; 
      let lastServerMessage = "Ingestion Complete";

      for (let i = 0; i < totalRecords; i += chunkSize) {
        const chunk = processedData.slice(i, i + chunkSize);
        
        // Compute live progress percentage
        setUploadProgress(Math.round((i / totalRecords) * 100));

        const res = await axios.post(`${BACKEND_URL}/api/import_sales`, {
          data: chunk,
          mode: targetExecutionMode
        });

        lastServerMessage = res.data.message;

        // Failsafe state mutation: Once the first chunk clears the tables via 'replace',
        // subsequent blocks must switch to 'append' so they stack up smoothly.
        if (targetExecutionMode === 'replace') {
          targetExecutionMode = 'append';
        }
      }

      setUploadProgress(100);
      toast.success("Synchronized Successfully", { description: `Processed ${totalRecords} historical log records.` });
      
      setSalesData([]);
      setSalesCols([]);
    } catch (err) {
      toast.error("Upload Failed", { description: err.response?.data?.detail || err.message });
    } finally {
      setSalesUploading(false);
      setTimeout(() => setUploadProgress(0), 4000); // Clear progress indicator
    }
  };


  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <Database className="text-blue-400" /> Master Cleaner Pipeline
      </h2>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setMode('inventory')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold flex justify-center items-center gap-2 border ${mode === 'inventory' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
        >
          <Upload size={20} /> Import Main Inventory
        </button>
        <button
          onClick={() => { setMode('sales'); setUploadProgress(0); }}
          className={`flex-1 py-3 px-4 rounded-lg font-bold flex justify-center items-center gap-2 border ${mode === 'sales' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
        >
          <FileSpreadsheet size={20} /> Import Historical Sales
        </button>
      </div>

      {mode === 'inventory' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="text-xl font-bold text-white mb-2">Step 1: Initial Upload & Structural Cleanup</h3>
              <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg text-sm text-blue-200">
                <strong>Data Validation Tiers:</strong><br />
                - <strong>Must Needed:</strong> ProductID, rating, Stock, Capacity<br />
                - <strong>Needed:</strong> product, sale_price, categories, sub_category, Cost_Price
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleInventoryUpload}
                className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <h3 className="text-xl font-bold text-white mb-2">Step 2: Hard Validation Gate (Column Mapper)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mandatoryCols.map(col => (
                  <div key={col} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <label className="block text-sm font-bold text-gray-300 mb-2">Map to <span className="text-blue-400">{col}</span></label>
                    <select
                      value={mapping[col] || ''}
                      onChange={e => setMapping({ ...mapping, [col]: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">--- Select Column ---</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      {autoGenerateOptions.includes(col) && <option value="auto">✨ Auto-Generate / Handle in Step 3</option>}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(1)} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white">Back</button>
                <button onClick={handleApplyMapping} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white">Apply Mapping</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Settings size={20} /> Step 3: Interactive Resolver</h3>

              <div className="space-y-6">
                {mapping['Capacity'] === 'auto' && (
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <label className="block font-medium text-white mb-2">📦 Set Default Shelf Capacity</label>
                    <input type="number" value={defaultCapacity} onChange={e => setDefaultCapacity(Number(e.target.value))} className="bg-gray-800 border border-gray-600 rounded p-2 text-white" />
                  </div>
                )}

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <label className="block font-medium text-white mb-2">🧠 AI Fallback for Customer Ratings</label>
                  <select value={ratingMethod} onChange={e => setRatingMethod(e.target.value)} className="bg-gray-800 border border-gray-600 rounded p-2 text-white mb-3 w-full">
                    <option value="median">Use Dataset Median Rating</option>
                    <option value="mean">Use Dataset Mean Rating</option>
                    <option value="custom">Set Custom Input</option>
                  </select>
                  {ratingMethod === 'custom' && (
                    <input type="number" step="0.1" value={customRating} onChange={e => setCustomRating(Number(e.target.value))} className="bg-gray-800 border border-gray-600 rounded p-2 text-white w-full" />
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(2)} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white">Back</button>
                <button onClick={handleApplyFixes} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white">Apply Fixes & Proceed to Step 4</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <h3 className="text-xl font-bold text-white mb-2">Step 4: Integration Strategy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setImportMode('update')}
                  className={`cursor-pointer border-2 rounded-xl p-6 transition-all ${importMode === 'update' ? 'bg-blue-900/30 border-blue-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}
                >
                  <h4 className="font-bold text-lg text-white mb-2 flex items-center gap-2"><RefreshCcw size={18} /> Smart Update</h4>
                  <p className="text-sm text-gray-400">Matches existing items by ProductID to update them. Adds new items to the bottom. Does NOT delete old data.</p>
                </div>

                <div
                  onClick={() => setImportMode('replace')}
                  className={`cursor-pointer border-2 rounded-xl p-6 transition-all ${importMode === 'replace' ? 'bg-red-900/30 border-red-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}
                >
                  <h4 className="font-bold text-lg text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Clean Slate</h4>
                  <p className="text-sm text-gray-400">Deletes all existing inventory and completely replaces it with this new file. Use with caution.</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4 mt-8 border-t border-gray-700">
                <button onClick={() => setStep(3)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white">Back</button>
                <button onClick={submitInventory} className={`px-8 py-3 rounded-lg font-bold text-white flex-1 ${importMode === 'update' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'}`}>
                  Execute {importMode === 'update' ? 'Merge' : 'Wipe & Replace'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'sales' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-in fade-in">
          <div className="bg-indigo-900/20 border border-indigo-800 p-4 rounded-lg text-sm text-indigo-200 mb-6">
            <strong>Mass Data Ingestion Protocol:</strong><br />
            The system will apply synchronous financial triad math client-side before batch inserting to the SQLite backend.
          </div>

          {salesData.length === 0 ? (
            <input
              type="file"
              accept=".csv"
              onChange={handleSalesUpload}
              className="w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
            />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-white mb-4 border-b border-gray-700 pb-2">Core Identifiers</h4>
                  <div className="space-y-3">
                    {baseMandatory.map(col => (
                      <div key={col}>
                        <label className="block text-xs font-bold text-gray-400 mb-1">{col}</label>
                        <select
                          value={salesMapping[col]}
                          onChange={e => setSalesMapping({ ...salesMapping, [col]: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white"
                        >
                          <option value="">--- Select Column ---</option>
                          {salesCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-indigo-400 mb-4 border-b border-gray-700 pb-2">Financial Triad (Need 2)</h4>
                  <div className="space-y-3">
                    {financialCols.map(col => (
                      <div key={col}>
                        <label className="block text-xs font-bold text-gray-400 mb-1">{col}</label>
                        <select
                          value={salesMapping[col]}
                          onChange={e => setSalesMapping({ ...salesMapping, [col]: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white"
                        >
                          <option value="">--- Select Column ---</option>
                          <option value="auto">--- Calculate Automatically ---</option>
                          {salesCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div
                  onClick={() => setSalesImportMode('append')}
                  className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${salesImportMode === 'append' ? 'bg-indigo-900/30 border-indigo-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}
                >
                  <h4 className="font-bold text-white mb-1 flex items-center gap-2"><RefreshCcw size={16} /> Append (Add New)</h4>
                  <p className="text-xs text-gray-400">Adds these logs to existing sales. (Duplicates are automatically ignored).</p>
                </div>

                <div
                  onClick={() => setSalesImportMode('replace')}
                  className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${salesImportMode === 'replace' ? 'bg-red-900/30 border-red-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}
                >
                  <h4 className="font-bold text-red-400 mb-1 flex items-center gap-2"><AlertTriangle size={16} /> Clean Slate (Wipe)</h4>
                  <p className="text-xs text-gray-400">Deletes all historical sales data and completely replaces it with this file.</p>
                </div>
              </div>

              {/* Progress Bar Display */}
              {salesUploading && (
                <div className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-2 animate-in fade-in">
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>Streaming Data Fragments to Cloud Instance...</span>
                    <span className="text-indigo-400 font-black">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700/50">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-700">
                <button onClick={() => setSalesData([])} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white">Reset File</button>
                <button
                  onClick={processAndUploadSales}
                  disabled={salesUploading}
                  className={`px-8 py-3 disabled:opacity-50 rounded-lg font-bold text-white flex-1 transition-all flex items-center justify-center gap-2 ${salesImportMode === 'append' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  {salesUploading ? <RefreshCcw className="animate-spin" /> : `🚀 Execute ${salesImportMode === 'append' ? 'Append' : 'Wipe & Replace'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}