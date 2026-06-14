import { useState, useEffect } from 'react';
import axios from 'axios';
import { Lock, ShieldAlert, Key, LogOut, CheckCircle, ShieldCheck } from 'lucide-react';

import { BACKEND_URL } from '../../config';

export default function AdminAuthGuard({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('adminAuth') === 'true');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Password Change Modal State
    const [showModal, setShowModal] = useState(false);
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [modalMsg, setModalMsg] = useState({ text: '', type: '' });

    // --- THE ENTERPRISE FAILSAFE: Automatic Logout ---
    useEffect(() => {
        return () => {
            // The exact millisecond this component unmounts (meaning the user navigated 
            // away from the Admin panel to the POS terminal), the token is destroyed.
            sessionStorage.removeItem('adminAuth');
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post(`${BACKEND_URL}/api/auth/login`, { password });
            sessionStorage.setItem('adminAuth', 'true');
            setIsAuthenticated(true);
        } catch (err) {
            setError(err.response?.data?.detail || "Connection Error");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setModalMsg({ text: 'Processing...', type: 'info' });
        try {
            const res = await axios.post(`${BACKEND_URL}/api/auth/change_password`, {
                current_password: currentPass,
                new_password: newPass
            });
            setModalMsg({ text: res.data.message, type: 'success' });
            setTimeout(() => {
                setShowModal(false);
                setModalMsg({ text: '', type: '' });
                setCurrentPass('');
                setNewPass('');
            }, 2000);
        } catch (err) {
            setModalMsg({ text: err.response?.data?.detail || "Failed to update", type: 'error' });
        }
    };

    const handleManualLogout = () => {
        sessionStorage.removeItem('adminAuth');
        setIsAuthenticated(false);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans relative overflow-hidden">
                {/* Background ambient lighting */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-gray-800 p-4 rounded-full border border-gray-700 mb-4 shadow-inner">
                            <ShieldAlert size={40} className="text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Restricted Access</h2>
                        <p className="text-gray-400 text-sm mt-1">Enterprise Management Console</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Administrator Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="password"
                                    autoFocus
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && <div className="text-red-400 text-sm font-bold bg-red-950/40 p-3 rounded-lg border border-red-900/50 text-center">{error}</div>}

                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? 'Verifying Cryptography...' : 'Authenticate'}
                        </button>
                    </form>
                    <div className="mt-6 text-center text-xs text-gray-600 font-medium">
                        Session tracked. Unauthorized access prohibited.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen">
            {/* 1. Renders the actual Admin Panel inside the guard */}
            {children}

            {/* 2. Floating Security Controls */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700 p-3 rounded-full shadow-lg transition-all flex items-center justify-center group"
                    title="Security Settings"
                >
                    <Key size={20} className="group-hover:text-blue-400 transition-colors" />
                </button>
                <button
                    onClick={handleManualLogout}
                    className="bg-gray-900 hover:bg-red-900/80 text-gray-300 border border-gray-700 p-3 rounded-full shadow-lg transition-all flex items-center justify-center group hover:border-red-800"
                    title="Force Terminate Session"
                >
                    <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
                </button>
            </div>

            {/* 3. Change Password Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-800 bg-gray-800/50 flex justify-between items-center">
                            <h3 className="text-xl font-black flex items-center gap-2 text-white"><ShieldCheck className="text-emerald-400" /> Update Credentials</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleChangePassword} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
                                <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            {modalMsg.text && (
                                <div className={`p-3 rounded-lg border text-sm font-bold flex items-center gap-2 ${modalMsg.type === 'error' ? 'bg-red-950/40 text-red-400 border-red-900/50' : modalMsg.type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-blue-950/40 text-blue-400 border-blue-900/50'}`}>
                                    {modalMsg.type === 'success' && <CheckCircle size={16} />} {modalMsg.text}
                                </div>
                            )}

                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all">
                                Commit Security Update
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}