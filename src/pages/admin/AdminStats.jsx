import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Package, Activity } from 'lucide-react';

import { BACKEND_URL } from '../../config';

export default function AdminStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/analytics`);
        setData(res.data);
        setError(null);
      } catch (err) {
        console.error("Analytics Error:", err);
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-8 text-blue-400 font-bold flex items-center gap-2"><Activity className="animate-spin" /> Fetching Enterprise Analytics...</div>;

  // THE FIX: Provide a graceful error screen instead of a White Screen crash
  if (error) return <div className="p-8 text-red-500 font-bold bg-red-900/20 rounded-xl m-6">Error loading analytics: {error}</div>;

  if (data?.status === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <Activity size={48} className="mb-4 opacity-50" />
        <h3 className="text-xl font-bold text-white mb-2">No Data Available</h3>
        <p>The system requires at least one completed transaction to generate analytics.</p>
      </div>
    );
  }

  // Safely extract KPIs utilizing optional chaining to prevent undefined crashes
  const kpis = data?.kpis || {};
  const formatCurrency = (val) => Number(val || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
        <TrendingUp className="text-blue-400" /> Enterprise Analytics Dashboard
      </h2>

      {/* EXECUTIVE KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md">
          <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">💰 Gross Revenue</div>
          <div className="text-2xl font-black text-white">{formatCurrency(kpis.total_revenue)}</div>
        </div>

        <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md">
          <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">📦 Gross Markup Profit</div>
          <div className="text-2xl font-black text-blue-300">{formatCurrency(kpis.gross_profit)}</div>
          <div className="text-[11px] text-gray-500 mt-1 font-medium">Margin: {Number(kpis.gross_margin || 0).toFixed(1)}%</div>
        </div>

        <div className="bg-gray-800 border border-orange-900/30 p-5 rounded-xl shadow-md">
          <div className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-1">💸 Operational Overhead</div>
          <div className="text-2xl font-black text-orange-300">-{formatCurrency(kpis.overhead_deducted)}</div>
          <div className="text-[11px] text-gray-500 mt-1 font-medium">Rent, Tax, Utilities & Salaries</div>
        </div>

        <div className="bg-emerald-950/20 border-2 border-emerald-900/50 p-5 rounded-xl shadow-lg lg:col-span-2 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={64} /></div>
          <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1 relative z-10">📈 Net Operating Profit</div>
          <div className="text-3xl font-black text-emerald-400 relative z-10">{formatCurrency(kpis.net_profit)}</div>
          <div className="text-[11px] text-emerald-500 font-semibold mt-1 relative z-10">True Take-Home Margin: {Number(kpis.net_margin || 0).toFixed(1)}%</div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-md">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-6">Daily Revenue Volatility</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.trends?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="Date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} />
                <Line type="monotone" dataKey="Total_Price" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-md">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-6">Peak Shopping Hours</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.trends?.hourly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="Hour" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }} cursor={{ fill: '#374151' }} />
                <Bar dataKey="Transaction_ID" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PERFORMANCE TABLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md overflow-hidden flex flex-col">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">🏆 Top Revenue Drivers</h3>
          <div className="space-y-3 flex-1">
            {(data?.performance?.top_revenue || []).map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-gray-200 text-sm truncate pr-2">{item.Product_Name}</span>
                <span className="text-blue-400 font-bold text-sm">{formatCurrency(item.Total_Price)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md overflow-hidden flex flex-col">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">📦 Volume Leaders</h3>
          <div className="space-y-3 flex-1">
            {(data?.performance?.top_volume || []).map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-gray-200 text-sm truncate pr-2">{item.Product_Name}</span>
                <span className="text-emerald-400 font-bold text-sm">{item.Qty_Sold} Units</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md overflow-hidden flex flex-col">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">📑 Top Categories (Profit)</h3>
          <div className="space-y-3 flex-1">
            {(data?.performance?.top_categories || []).map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-gray-200 text-sm truncate pr-2">{item.Category}</span>
                <span className="text-indigo-400 font-bold text-sm">{formatCurrency(item.Profit)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ALGORITHMIC INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <div className="bg-gray-800 border border-indigo-900/50 p-6 rounded-xl shadow-md">
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package size={18} /> Market Basket Analysis
          </h3>
          {data?.insights?.market_basket?.length > 0 ? (
            <div className="space-y-3">
              {data.insights.market_basket.map((pair, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                  <div className="flex flex-col text-sm">
                    <span className="text-gray-300">{pair.Item_A}</span>
                    <span className="text-gray-500 text-xs">+ {pair.Item_B}</span>
                  </div>
                  <div className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded text-xs font-bold border border-indigo-700/50">
                    {pair.Times_Bought_Together}x Together
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm italic p-4 text-center border border-dashed border-gray-700 rounded-lg">
              Not enough multi-item purchases to generate association rules yet.
            </div>
          )}
        </div>

        <div className="bg-gray-800 border border-red-900/30 p-6 rounded-xl shadow-md">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle size={18} /> Dead Stock Warning
          </h3>
          {data?.insights?.days_running < 7 ? (
            <div className="text-yellow-500/80 text-sm italic p-4 text-center border border-dashed border-yellow-900/50 rounded-lg bg-yellow-900/10">
              ⏳ Horizon Failsafe Active: Algorithm requires 7 days of historical data to confidently flag dead stock. (Current runtime: {data.insights.days_running} days)
            </div>
          ) : data?.insights?.dead_stock?.length > 0 ? (
            <div className="space-y-3">
              {data.insights.dead_stock.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-red-950/20 p-3 rounded-lg border border-red-900/50">
                  <span className="text-gray-300 text-sm truncate pr-2">{item.product}</span>
                  <span className="text-red-400 text-xs font-bold bg-red-950/50 px-2 py-1 rounded border border-red-900">
                    {item.Stock} in vault
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-emerald-500/80 text-sm italic p-4 text-center border border-dashed border-emerald-900/50 rounded-lg bg-emerald-900/10">
              ✅ Healthy Inventory: All items are moving.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}