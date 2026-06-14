import { useState, useEffect } from 'react';
import axios from 'axios';
// THE FIX: Changed RefreshCw to RefreshCcw so it matches the UI elements below
import { Building, Zap, Users, Receipt, Save, RefreshCcw } from 'lucide-react';

import { BACKEND_URL } from '../../config';
import { toast } from 'sonner';

export default function StoreSettings() {
    const [settings, setSettings] = useState({
        monthly_rent: 0,
        monthly_electricity: 0,
        monthly_salaries: 0,
        tax_rate_percent: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${BACKEND_URL}/api/settings`);
            // Safety fallback in case the backend returns empty data
            setSettings(res.data || {
                monthly_rent: 0,
                monthly_electricity: 0,
                monthly_salaries: 0,
                tax_rate_percent: 0
            });
        } catch (err) {
            console.error("Failed to fetch store settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/api/settings`, settings);
            toast.success(res.data.message || "Configuration securely updated!");
        } catch (err) {
            toast.error("Failed to save settings", { description: err.response?.data?.detail || err.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-blue-400 font-medium">
                <RefreshCcw className="animate-spin mr-2" size={20} /> Loading parameters configuration...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">⚙️ Operational Parameters Configuration</h2>
                <p className="text-gray-400 text-sm">
                    Define fixed monthly operating expenses (OpEx) and municipal tax burdens. The centralized algorithmic analytics engine reads these configurations to dynamically scale and calculate true Net Operating Profit over chronological transactional lifespan records.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Rent Box */}
                    <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-3">
                            <Building size={18} className="text-blue-400" /> Base Store Rent Expense (Monthly)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={settings.monthly_rent || 0}
                                onChange={e => setSettings({ ...settings, monthly_rent: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 pl-8 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                                required
                            />
                        </div>
                    </div>

                    {/* Electricity Box */}
                    <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-3">
                            <Zap size={18} className="text-yellow-400" /> Commercial Utility & Electricity (Monthly)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={settings.monthly_electricity || 0}
                                onChange={e => setSettings({ ...settings, monthly_electricity: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 pl-8 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-shadow"
                                required
                            />
                        </div>
                    </div>

                    {/* Salaries Box */}
                    <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-3">
                            <Users size={18} className="text-emerald-400" /> Total Headcount Payroll Salaries (Monthly)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={settings.monthly_salaries || 0}
                                onChange={e => setSettings({ ...settings, monthly_salaries: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 pl-8 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-shadow"
                                required
                            />
                        </div>
                    </div>

                    {/* Tax Box */}
                    <div className="bg-gray-800 border border-gray-700 p-5 rounded-xl shadow-md">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-3">
                            <Receipt size={18} className="text-red-400" /> Estimated Corporate Tax Rate
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={settings.tax_rate_percent || 0}
                                onChange={e => setSettings({ ...settings, tax_rate_percent: Number(e.target.value) })}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 pr-8 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-shadow"
                                required
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">%</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-2">Deducted systematically against total Gross profit calculations.</p>
                    </div>

                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
                >
                    {saving ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}
                    {saving ? "Commiting Changes..." : "Save Parameters Matrix"}
                </button>
            </form>
        </div>
    );
}