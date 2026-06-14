import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, ShoppingCart, Plus, Minus, CreditCard, ChevronLeft, AlertCircle, ChevronDown, Star } from 'lucide-react';

import { BACKEND_URL } from '../config';
import { toast } from 'sonner';

export default function POSDashboard() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // --- THE REAL PERFORMANCE FIX: useDeferredValue ---
  // React treats this state with low priority. While typing, searchQuery updates instantly 
  // keeping the input liquid-smooth, while deferredQuery trails behind when the thread is clear.
  const deferredQuery = useDeferredValue(searchQuery);
  const isPending = searchQuery !== deferredQuery;

  // Drill-down state
  const [viewLevel, setViewLevel] = useState('category');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const [recommendations, setRecommendations] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/products`);
      const validProducts = res.data.filter(p => p.sale_price && Number(p.sale_price) > 0);
      setProducts(validProducts);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    const fetchRecs = async () => {
      const cartKeys = Object.keys(cart);
      if (cartKeys.length > 0) {
        const lastPid = cartKeys[cartKeys.length - 1];
        try {
          const res = await axios.get(`${BACKEND_URL}/api/recommendations/${lastPid}`);
          setRecommendations(res.data || []);
        } catch (err) {
          console.error("ML Error:", err);
          setRecommendations([]);
        }
      } else {
        setRecommendations([]);
      }
    };
    fetchRecs();
  }, [cart]);

  // Compute filtered array against the deferred query value
  const filteredProducts = useMemo(() => {
    if (deferredQuery) {
      const lowerQuery = deferredQuery.toLowerCase().trim();
      return products
        .filter(p =>
          p.product?.toLowerCase().includes(lowerQuery) ||
          p.categories?.toLowerCase().includes(lowerQuery) ||
          p.brand?.toLowerCase().includes(lowerQuery)
        )
        .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }

    let filtered = products;
    if (viewLevel === 'category') {
      return filtered;
    } else if (viewLevel === 'sub_category') {
      return filtered.filter(p => p.categories === selectedCategory);
    } else if (viewLevel === 'brand_check' || viewLevel === 'brand') {
      return filtered.filter(p => p.categories === selectedCategory && p.sub_category === selectedSubCategory);
    } else if (viewLevel === 'products') {
      filtered = filtered.filter(p => p.categories === selectedCategory && p.sub_category === selectedSubCategory);
      if (selectedBrand) {
        filtered = filtered.filter(p => (p.brand || 'General') === selectedBrand);
      }
      return filtered.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }
    return filtered;
  }, [products, deferredQuery, viewLevel, selectedCategory, selectedSubCategory, selectedBrand]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev[product.ProductID];
      if (existing) {
        if (existing.quantity < product.Stock) {
          return { ...prev, [product.ProductID]: { ...existing, quantity: existing.quantity + 1 } };
        }
        return prev;
      }
      return {
        ...prev,
        [product.ProductID]: {
          name: product.product,
          price: Number(product.sale_price || 0),
          quantity: 1,
          stock: Number(product.Stock || 0)
        }
      };
    });
  }, []);

  const increaseQty = (pid) => {
    setCart(prev => {
      const existing = prev[pid];
      if (existing && existing.quantity < existing.stock) {
        return { ...prev, [pid]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return prev;
    });
  };

  const decreaseQty = (pid) => {
    setCart(prev => {
      const existing = prev[pid];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const newCart = { ...prev };
        delete newCart[pid];
        return newCart;
      }
      return { ...prev, [pid]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const grandTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    const payload = {
      items: Object.entries(cart).map(([pid, item]) => ({
        ProductID: pid,
        Quantity_Bought: item.quantity
      })),
      payment_method: paymentMethod
    };

    try {
      await axios.post(`${BACKEND_URL}/api/checkout`, payload);
      setPaymentSuccess(true);
      setCart({});
      setIsCheckingOut(false);
      fetchInventory();
      setTimeout(() => setPaymentSuccess(false), 5000);
    } catch (err) {
      toast.error("Checkout Failed", { description: err.response?.data?.detail || err.message });
    }
  };

  const renderStars = (rating) => {
    const num = parseFloat(rating);
    if (isNaN(num) || num <= 0) return <div className="text-gray-500 text-xs font-medium h-5 flex items-center">No Rating</div>;

    const fullStars = Math.floor(num);
    const hasHalfStar = num % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-2 h-5">
        <div className="flex items-center gap-0.5">
          {[...Array(fullStars)].map((_, i) => (
            <Star key={`f-${i}`} size={14} className="fill-yellow-400 text-yellow-400" />
          ))}
          {hasHalfStar && (
            <div className="relative">
              <Star size={14} className="text-gray-600" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          )}
          {[...Array(emptyStars)].map((_, i) => (
            <Star key={`e-${i}`} size={14} className="text-gray-600" />
          ))}
        </div>
        <span className="text-xs font-bold text-gray-300">{num.toFixed(1)}</span>
      </div>
    );
  };

  const memoizedProductView = useMemo(() => {
    const renderProductGrid = (items) => {
      if (items.length === 0) return <div className="p-8 text-center text-gray-400 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">No products found matching your search.</div>;

      const visibleItems = items.slice(0, 80);

      return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8 transition-all duration-200 ease-in-out ${isPending ? 'opacity-40 scale-[0.99] blur-[1px]' : 'opacity-100 scale-100 blur-0'}`}>
          {visibleItems.map(row => {
            const isOutOfStock = row.Stock <= 0;

            // Look up this specific item in the cart to check its quantity
            const cartItem = cart[row.ProductID];
            const qtyInCart = cartItem ? cartItem.quantity : 0;
            const isAtLimit = qtyInCart >= row.Stock;

            return (
              <div key={row.ProductID} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-blue-500 transition-all shadow-md">
                <h3 className="font-bold text-gray-100 mb-1.5 leading-tight">{row.product}</h3>

                {/* NEW: Crisp Stars Component */}
                <div className="mb-2">{renderStars(row.rating)}</div>

                {row.description && String(row.description).toLowerCase() !== 'nan' && (
                  <p className="text-gray-400 text-xs mb-4 flex-grow line-clamp-2">{row.description}</p>
                )}

                <div className="flex justify-between items-end mt-auto pt-3 border-t border-gray-700/50">
                  <div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-0.5">Price</div>
                    <span className="font-black text-xl text-white tracking-tight">₹{Number(row.sale_price || 0).toFixed(2)}</span>
                  </div>

                  {/* NEW: Dynamic Add to Cart / Quantity Toggle */}
                  {qtyInCart > 0 ? (
                    <div className="flex items-center bg-blue-600 rounded-lg p-1 shadow-lg shadow-blue-500/20 animate-in zoom-in-95 duration-200">
                      <button
                        onClick={() => decreaseQty(row.ProductID)}
                        className="w-8 h-8 flex items-center justify-center text-white hover:bg-blue-700 active:scale-90 rounded-md transition-all"
                      >
                        <Minus size={16} strokeWidth={3} />
                      </button>
                      <span className="w-8 text-center font-bold text-white text-sm tabular-nums">
                        {qtyInCart}
                      </span>
                      <button
                        disabled={isAtLimit}
                        onClick={() => increaseQty(row.ProductID)}
                        className={`w-8 h-8 flex items-center justify-center text-white rounded-md transition-all ${isAtLimit ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-90'}`}
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={isOutOfStock}
                      onClick={() => addToCart(row)}
                      className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${isOutOfStock
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
                          : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-blue-500/20'
                        }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    };
    if (deferredQuery) return renderProductGrid(filteredProducts);

    if (viewLevel === 'category') {
      const categories = [...new Set(products.map(p => p.categories).filter(Boolean))];
      return (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-all duration-300 ${isPending ? 'opacity-50 blur-sm' : 'opacity-100'}`}>
          {categories.map(cat => (
            <button key={cat} onClick={() => { setSelectedCategory(cat); setViewLevel('sub_category'); }} className="bg-gray-800 hover:bg-blue-900 border border-gray-700 rounded-lg p-6 text-center font-bold transition-colors shadow-sm">
              {cat}
            </button>
          ))}
        </div>
      );
    }

    if (viewLevel === 'sub_category') {
      const subCats = [...new Set(filteredProducts.map(p => p.sub_category).filter(Boolean))];
      return (
        <div className="animate-in fade-in">
          <button onClick={() => setViewLevel('category')} className="mb-4 text-gray-400 hover:text-white flex items-center transition-colors font-medium">
            <ChevronLeft size={20} className="mr-1" /> Back to Categories
          </button>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subCats.map(sub => (
              <button key={sub} onClick={() => {
                setSelectedSubCategory(sub);
                const temp = products.filter(p => p.categories === selectedCategory && p.sub_category === sub);
                const missingBrand = temp.length > 0 ? (temp.filter(p => !p.brand).length / temp.length) : 1;
                missingBrand <= 0.85 ? setViewLevel('brand') : (setSelectedBrand(null), setViewLevel('products'));
              }} className="bg-gray-800 hover:bg-blue-800 border border-gray-700 rounded-lg p-6 text-center font-semibold transition-colors shadow-sm">
                {sub}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (viewLevel === 'brand') {
      const brands = [...new Set(filteredProducts.map(p => p.brand || 'General'))];
      return (
        <div className="animate-in fade-in">
          <button onClick={() => setViewLevel('sub_category')} className="mb-4 text-gray-400 hover:text-white flex items-center transition-colors font-medium">
            <ChevronLeft size={20} className="mr-1" /> Back to Sub-Categories
          </button>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {brands.map(brand => (
              <button key={brand} onClick={() => { setSelectedBrand(brand); setViewLevel('products'); }} className="bg-gray-800 hover:bg-indigo-800 border border-gray-700 rounded-lg p-6 text-center font-semibold transition-colors shadow-sm">
                {brand}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (viewLevel === 'products') {
      return (
        <div className="animate-in fade-in">
          <button onClick={() => setViewLevel(selectedBrand ? 'brand' : 'sub_category')} className="mb-4 text-gray-400 hover:text-white flex items-center transition-colors font-medium">
            <ChevronLeft size={20} className="mr-1" /> Back
          </button>
          {renderProductGrid(filteredProducts)}
        </div>
      );
    }
  }, [filteredProducts, viewLevel, selectedCategory, selectedSubCategory, selectedBrand, deferredQuery, products, addToCart, isPending]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col md:flex-row overflow-hidden font-sans">
      <div className="flex-1 flex flex-col h-screen overflow-y-auto border-r border-gray-800">
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md z-10 p-6 border-b border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
              <ShoppingCart size={28} className="text-blue-500" />
              Retail Checkout Terminal
            </h1>
            <Link to="/admin" className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-bold transition-colors shadow-sm">
              Admin Panel
            </Link>
          </div>

          <div className="relative">
            {isPending ? (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-gray-500 border-t-blue-500 rounded-full animate-spin"></div>
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            )}

            <input
              type="text"
              placeholder="🔍 Search for a product, category, or brand..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-blue-400 gap-3">
              <div className="w-8 h-8 border-4 border-blue-900 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="font-bold tracking-widest uppercase text-sm">Loading Inventory...</span>
            </div>
          ) : (
            memoizedProductView
          )}
        </div>
      </div>

      {/* RIGHT PANE: Cart Sidebar */}
      <div className="w-full md:w-96 bg-gray-800/50 flex flex-col h-screen border-l border-gray-800 shadow-2xl relative">
        <div className="p-6 border-b border-gray-700/50 bg-gray-800/30">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🛒 Shopping Cart
            <span className="bg-blue-600 text-xs px-2 py-1 rounded-full font-bold shadow-sm">{Object.keys(cart).length} items</span>
          </h2>
        </div>

        {paymentSuccess && (
          <div className="bg-emerald-900/40 border border-emerald-500/50 p-4 m-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-4">
            <AlertCircle className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-300">Receipt Generated</h4>
              <p className="text-sm text-emerald-200/70">Payment approved. Cart cleared.</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {Object.keys(cart).length === 0 && !paymentSuccess ? (
            <div className="text-center text-gray-500 mt-12 flex flex-col items-center">
              <div className="bg-gray-800/50 p-6 rounded-full mb-4 border border-gray-700/50">
                <ShoppingCart size={32} className="opacity-40 text-gray-400" />
              </div>
              <p className="font-medium text-sm">Your cart is completely empty.</p>
            </div>
          ) : (
            Object.entries(cart).map(([pid, item]) => {
              const isAtLimit = item.quantity >= item.stock;
              return (
                <div key={pid} className="bg-gray-800 border border-gray-700/50 p-3.5 rounded-xl flex flex-col gap-2 shadow-sm animate-in fade-in">
                  <div className="font-bold text-sm leading-tight text-gray-200 pr-4">{item.name}</div>
                  <div className="grid grid-cols-[auto_1fr_auto_minmax(60px,auto)] gap-2 items-center w-full mt-1">
                    <button onClick={() => decreaseQty(pid)} className="bg-gray-700 hover:bg-red-900/80 hover:text-red-300 text-white rounded-lg p-1.5 transition-colors flex items-center justify-center border border-gray-600 hover:border-red-800">
                      <Minus size={16} />
                    </button>
                    <div className="text-center font-bold text-sm bg-gray-900/80 py-1.5 px-2 rounded-lg whitespace-nowrap overflow-hidden border border-gray-700/50">
                      {item.quantity} <span className="text-gray-500 font-normal ml-1">x</span>
                    </div>
                    <button disabled={isAtLimit} onClick={() => increaseQty(pid)} className={`bg-gray-700 rounded-lg p-1.5 transition-colors flex items-center justify-center border border-gray-600 ${isAtLimit ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-600 hover:border-blue-500 text-white'}`}>
                      <Plus size={16} />
                    </button>
                    <div className="text-right font-black text-blue-400 whitespace-nowrap text-base">
                      ₹{Number(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-gray-900 border-t border-gray-800 relative z-10">
          <div className="flex justify-between items-end mb-5">
            <span className="text-gray-400 font-bold tracking-wide uppercase text-xs">Grand Total</span>
            <span className="text-4xl font-black text-white tracking-tight">₹{grandTotal.toFixed(2)}</span>
          </div>

          <button
            disabled={Object.keys(cart).length === 0}
            onClick={() => setIsCheckingOut(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700 border border-transparent text-white font-black py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2"
          >
            <CreditCard size={20} /> PROCESS CHECKOUT
          </button>
        </div>

        {recommendations.length > 0 && !isCheckingOut && (
          <div className="p-4 border-t border-gray-800 bg-indigo-950/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Smart Upsell
              </span>
            </div>
            <div className="space-y-2">
              {recommendations.filter(rec => !cart[rec.ProductID] && rec.Stock > 0).slice(0, 2).map(rec => (
                <div key={rec.ProductID} className="bg-gray-800/80 border border-indigo-900/30 p-2.5 rounded-lg flex justify-between items-center group hover:bg-gray-800 transition-colors">
                  <div className="flex-1 pr-3 truncate">
                    <div className="text-xs font-bold text-gray-200 truncate">{rec.product}</div>
                    <div className="text-[10px] font-medium text-indigo-300 mt-0.5">₹{Number(rec.sale_price || 0).toFixed(2)}</div>
                  </div>
                  <button onClick={() => addToCart(rec)} className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors border border-indigo-500/30">
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal overlay */}
      {isCheckingOut && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 bg-gray-800/50">
              <h3 className="text-xl font-bold flex items-center gap-2 text-white"><CreditCard className="text-blue-400" /> Finalize Payment</h3>
            </div>
            <div className="p-8 space-y-8 bg-gray-900">
              <div className="text-center bg-gray-800/50 p-6 rounded-xl border border-gray-700/50">
                <div className="text-gray-400 mb-1 font-bold tracking-widest text-xs uppercase">Total Due</div>
                <div className="text-5xl font-black text-blue-400 tracking-tight">₹{grandTotal.toFixed(2)}</div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Select Payment Method</label>
                <div className="relative">
                  <select
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none font-medium cursor-pointer shadow-inner"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">💵 Physical Cash</option>
                    <option value="UPI">📱 UPI / QR Scan</option>
                    <option value="Card">💳 Credit / Debit Card</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-800/80 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setIsCheckingOut(false)}
                className="flex-1 py-3.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-colors border border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                className="flex-[2] py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black transition-all shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2"
              >
                ✅ Confirm Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}