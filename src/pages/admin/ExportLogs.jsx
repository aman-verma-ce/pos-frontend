import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { Download, Search, Calendar, ChevronDown } from 'lucide-react';

import { BACKEND_URL } from '../../config';

export default function ExportLogs() {
  const [preset, setPreset] = useState('custom');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const handlePresetChange = (e) => {
    const value = e.target.value;
    setPreset(value);

    if (value === 'custom') return;

    const today = new Date();
    const end = formatDate(today);
    let start = '';

    switch (value) {
      case 'today':
        start = end;
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        start = formatDate(yesterday);
        setEndDate(start);
        setStartDate(start);
        return;
      case 'last7':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        start = formatDate(last7);
        break;
      case 'last30':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        start = formatDate(last30);
        break;
      case 'thisMonth':
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        start = formatDate(thisMonth);
        break;
      case 'allTime':
        start = '2020-01-01';
        break;
      default:
        break;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const handleManualDateChange = (setter) => (e) => {
    setPreset('custom');
    setter(e.target.value);
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await axios.get(`${BACKEND_URL}/api/export`, {
        params: { start_date: startDate, end_date: endDate }
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data || data.length === 0) return;

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sales_Logs_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Download className="text-blue-400" /> Export Sales Logs
        </h2>
        <p className="text-gray-400 text-sm mb-6">Download historical transaction data based on a specific time period.</p>

        <div className="mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-2">
            <Calendar size={16} className="text-indigo-400" /> Quick Select Range
          </label>
          <div className="relative">
            <select
              value={preset}
              onChange={handlePresetChange}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
            >
              <option value="custom">⚙️ Custom Range...</option>
              <option value="today">📅 Today</option>
              <option value="yesterday">⏪ Yesterday</option>
              <option value="last7">📊 Last 7 Days</option>
              <option value="last30">📉 Last 30 Days</option>
              <option value="thisMonth">🗓️ This Month</option>
              <option value="allTime">♾️ All Time</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
            <input
              type="date"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors [color-scheme:dark] cursor-pointer"
              value={startDate}
              onChange={handleManualDateChange(setStartDate)}
              onKeyDown={(e) => e.preventDefault()}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
            <input
              type="date"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors [color-scheme:dark] cursor-pointer"
              value={endDate}
              onChange={handleManualDateChange(setEndDate)}
              onKeyDown={(e) => e.preventDefault()}
              onClick={(e) => e.target.showPicker && e.target.showPicker()}
            />
          </div>
        </div>

        {error && <div className="text-red-400 mb-4 text-sm bg-red-900/20 p-3 rounded">{error}</div>}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          {loading ? 'Crunching Database...' : <><Search size={18} /> Generate Data Payload</>}
        </button>
      </div>

      {data && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-xl">
          {data.length === 0 ? (
            <div className="text-yellow-500 bg-yellow-900/20 p-4 rounded-lg border border-yellow-800 text-center">
              No sales found in this time period. Try expanding your date range.
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="text-emerald-400 font-bold bg-emerald-950/40 px-4 py-3 rounded-lg border border-emerald-800/50 flex-1">
                  ✅ Report Generated! Found {data.length} transaction records.
                </div>
                <button
                  onClick={handleDownload}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-gray-500 w-full md:w-auto font-bold"
                >
                  <Download size={18} /> Download CSV File
                </button>
              </div>

              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Data Preview (Top 10)</h3>
              <div className="overflow-x-auto border border-gray-700 rounded-lg">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-900 text-gray-400">
                    <tr>
                      <th className="p-3 font-medium">Transaction ID</th>
                      <th className="p-3 font-medium">Timestamp</th>
                      <th className="p-3 font-medium">Product</th>
                      <th className="p-3 font-medium">Qty</th>
                      <th className="p-3 font-medium">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="p-3 text-gray-300 font-mono text-xs">{row.Transaction_ID}</td>
                        <td className="p-3 text-gray-400">{row.Timestamp}</td>
                        <td className="p-3 text-gray-300">{row.Product_Name}</td>
                        <td className="p-3 text-gray-300">{row.Qty_Sold}</td>
                        <td className="p-3 text-blue-400 font-medium">₹{parseFloat(row.Total_Price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}