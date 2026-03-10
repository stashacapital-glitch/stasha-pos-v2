 'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, ShoppingCart, Plus, Trash2, Search, Printer, Eye, CheckCircle, X, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '@/components/PermissionGate';

export default function QuickSalePage() {
  const { profile } = useAuth();
  const supabase = createClient();
  
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [showBillModal, setShowBillModal] = useState(false);
  const [isPaidModal, setIsPaidModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchItems(); }, [profile]);

  const fetchItems = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    const { data, error } = await supabase.from('menu_items').select('id, name, price, current_stock').eq('org_id', profile.org_id).eq('is_available', true).order('name');
    if (error) toast.error("Failed to load items");
    else setAllItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (search.length > 0) setResults(allItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase())));
    else setResults([]);
  }, [search, allItems]);

  const addToCart = (item: any) => {
    if (item.current_stock !== null && item.current_stock <= 0) { toast.error(`${item.name} is out of stock!`); return; }
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        if (item.current_stock !== null && (exists.quantity + 1) > item.current_stock) { toast.error("Not enough stock!"); return prev; }
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setSearch('');
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = item.quantity + delta;
      if (delta > 0 && item.current_stock !== null && newQty > item.current_stock) { toast.error("Stock limit reached!"); return item; }
      return newQty > 0 ? { ...item, quantity: newQty } : item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const generateReceiptNumber = () => {
    const now = new Date();
    return `RCP-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  };

  const handleSale = async (method: 'cash' | 'mpesa' | 'card') => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const receiptNumber = generateReceiptNumber();
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        org_id: profile?.org_id, items: cart, total_price: total, status: 'paid', payment_method: method, paid_at: new Date().toISOString(), receipt_number: receiptNumber
      }).select('id, receipt_number, paid_at').single();
      if (orderError) throw orderError;

      const itemIds = cart.map((i: any) => i.id);
      const { data: allRecipes } = await supabase.from('recipes').select('menu_item_id, ingredient_id, quantity').in('menu_item_id', itemIds);
      const deductionOperations: Promise<any>[] = [];
      
      cart.forEach((item: any) => {
        const relatedRecipes = allRecipes?.filter((r: any) => r.menu_item_id === item.id);
        if (relatedRecipes && relatedRecipes.length > 0) {
          relatedRecipes.forEach((ing: any) => {
            deductionOperations.push(supabase.rpc('deduct_stock', { item_id: ing.ingredient_id, qty: ing.quantity * item.quantity }));
          });
        } else {
          deductionOperations.push(supabase.rpc('deduct_stock', { item_id: item.id, qty: item.quantity }));
        }
      });
      await Promise.all(deductionOperations);

      setLastOrder({ ...order, items: cart, total: total, method: method, cashier: profile?.full_name || 'Admin' });
      setIsPaidModal(true); setShowBillModal(true); setCart([]); fetchItems();
      toast.success("Sale Complete!");
    } catch (err: any) { toast.error(err.message); } finally { setSubmitting(false); }
  };

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const printWindow = window.open('', '', 'height=600,width=300');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Receipt</title>');
      printWindow.document.write('<style>body{font-family: "Courier New", monospace; font-size: 12px; width: 280px; margin: 0 auto; color: #000;} .header{text-align: center; margin-bottom: 10px;} .meta{margin-bottom: 10px;} .items{width: 100%; border-collapse: collapse; margin-bottom: 10px;} .items td{padding: 2px 0;} .totals{width: 100%; margin-top: 10px;} .totals td{padding: 2px 0;} .total-row{font-weight: bold; font-size: 16px;} .footer{text-align: center; margin-top: 15px; font-size: 10px;} hr{border: 0; border-top: 1px dashed #000; margin: 10px 0;}</style>');
      printWindow.document.write('</head><body>'); printWindow.document.write(printContents); printWindow.document.write('</body></html>');
      printWindow.document.close(); printWindow.focus(); printWindow.print();
    }
  };

  const displayData = isPaidModal ? lastOrder : { items: cart, total, cashier: profile?.full_name, receipt_number: 'PRO-FORMA', paid_at: new Date().toISOString(), method: 'UNPAID' };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager', 'waiter', 'bartender']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="h-screen flex flex-col bg-gray-950 overflow-hidden relative">
        
        {/* TOP SEARCH AREA - Sticky */}
        <div className="bg-gray-900 p-4 border-b border-gray-800 z-20 shadow-lg">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl border border-gray-700 focus-within:border-orange-500 transition">
              <Search className="text-gray-500" size={20} />
              <input 
                type="text" 
                placeholder="Search item name or code..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white text-base focus:outline-none"
              />
              {search.length > 0 && (
                <button onClick={() => setSearch('')} className="p-1 hover:bg-gray-700 rounded-full text-gray-500 hover:text-white transition"><X size={16} /></button>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA - Scrollable */}
        <div className="flex-1 overflow-y-auto pb-48">
          
          {/* SEARCH RESULTS */}
          {search.length > 0 && (
            <div className="p-4 max-w-lg mx-auto space-y-3">
              {results.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Search size={32} className="mx-auto mb-2 opacity-50"/>
                  <p>No items found</p>
                </div>
              ) : (
                results.map((item: any) => (
                  <button 
                    key={item.id} 
                    onClick={() => addToCart(item)}
                    className="w-full text-left p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-orange-500 flex justify-between items-center transition-all hover:scale-[1.01] active:scale-100"
                  >
                    <div>
                      <p className="font-semibold text-white text-lg">{item.name}</p>
                      <p className="text-sm text-gray-400 mt-1">KES {item.price.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      {item.current_stock !== null ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.current_stock > 0 ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                          {item.current_stock > 0 ? 'In Stock' : 'Out'}
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-800 text-gray-500 px-2 py-1 rounded-full border border-gray-700">Unlimited</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* CURRENT BILL */}
          {search.length === 0 && (
            <div className="p-4 max-w-lg mx-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                   <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800 mb-4">
                     <ShoppingCart className="text-gray-700" size={32} />
                   </div>
                   <p className="text-gray-600 font-medium">Your cart is empty</p>
                   <p className="text-gray-700 text-sm mt-1">Search items to start selling</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item: any, idx: number) => (
                    <div key={idx} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{item.name}</p>
                        <p className="text-orange-400 text-sm mt-1">KES {item.price.toLocaleString()}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-gray-300 transition border border-gray-700">
                          {item.quantity === 1 ? <Trash2 size={14} className="text-red-400" /> : <Minus size={14} />}
                        </button>
                        <span className="w-8 text-center text-white font-bold">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-gray-800 hover:bg-orange-500 rounded-lg flex items-center justify-center text-gray-300 hover:text-black transition font-bold border border-gray-700 hover:border-orange-500">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM PAYMENT AREA - Fixed */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-gray-900 border-t border-gray-800 z-30">
           <div className="max-w-lg mx-auto p-4">
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => { setIsPaidModal(false); setShowBillModal(true); }} disabled={cart.length === 0} className="py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 border border-gray-700">
                   <Eye size={16}/> View Bill
                </button>
                <button onClick={handlePrint} disabled={cart.length === 0} className="py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 border border-gray-700">
                   <Printer size={16}/> Print
                </button>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-gray-400 font-medium">TOTAL</span>
                <span className="text-3xl font-extrabold text-white tracking-tight">KES {total.toLocaleString()}</span>
              </div>

              {/* Payment Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => handleSale('cash')} 
                    disabled={submitting || cart.length === 0} 
                    className="py-4 bg-green-600 hover:bg-green-500 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition shadow-lg shadow-green-900/30"
                >
                  Cash
                </button>
                <button 
                    onClick={() => handleSale('mpesa')} 
                    disabled={submitting || cart.length === 0} 
                    className="py-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition shadow-lg shadow-purple-900/30"
                >
                  M-Pesa
                </button>
                <button 
                    onClick={() => handleSale('card')} 
                    disabled={submitting || cart.length === 0} 
                    className="py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition shadow-lg shadow-blue-900/30"
                >
                  Card
                </button>
              </div>
           </div>
        </div>
      </div>

      {/* PRINT TEMPLATE */}
      <div className="hidden">
        <div ref={printRef} className="p-0 bg-white text-black" style={{ width: '280px', margin: '0 auto' }}>
          <div className="header text-center py-2 border-b border-dashed border-gray-400">
            <h1 className="text-xl font-bold tracking-wide">{profile?.business_name || 'RECEIPT'}</h1>
            <p className="text-xs">{profile?.address || 'Nairobi, Kenya'}</p>
            <p className="text-xs">Tel: {profile?.phone || 'N/A'}</p>
          </div>
          <div className="meta py-2 text-xs border-b border-dashed border-gray-400">
            <div className="flex justify-between"><span>Receipt No:</span><span className="font-bold">{displayData?.receipt_number}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{new Date(displayData?.paid_at).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span>Time:</span><span>{new Date(displayData?.paid_at).toLocaleTimeString()}</span></div>
            <div className="flex justify-between"><span>Cashier:</span><span>{displayData?.cashier}</span></div>
          </div>
          <table className="items text-xs mb-2 w-full">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1">Item</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {displayData?.items.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-dotted border-gray-200">
                  <td className="py-1">{item.name}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{item.price}</td>
                  <td className="text-right">{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="totals text-xs mb-2 w-full">
            <tbody>
              <tr className="border-t border-dashed border-gray-400">
                <td className="py-1 text-right" colSpan={3}>SUBTOTAL</td>
                <td className="text-right pl-2">KES {displayData?.total.toLocaleString()}</td>
              </tr>
              <tr className="total-row border-t border-dashed border-gray-400">
                <td className="py-2 text-right" colSpan={3}>TOTAL</td>
                <td className="text-right pl-2">KES {displayData?.total.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-1 text-right" colSpan={3}>Payment Method</td>
                <td className="text-right pl-2 uppercase">{displayData?.method}</td>
              </tr>
            </tbody>
          </table>
          <div className="footer border-t border-dashed border-gray-400 pt-2 text-center">
            <p className="font-bold">Thank you for your business!</p>
            <p className="mt-1 text-gray-600">Powered by StashaPOS</p>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showBillModal && displayData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-sm border border-gray-800 relative text-center">
            <button onClick={() => setShowBillModal(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white"><X size={20} /></button>
            
            {isPaidModal ? (
              <>
                <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-green-400" size={40} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Payment Successful</h2>
                <p className="text-gray-500 text-sm mb-6">Receipt: {displayData.receipt_number}</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-6">Current Bill</h2>
                <div className="text-left max-h-48 overflow-y-auto border border-gray-800 rounded-lg p-4 mb-6">
                   {displayData.items.map((item: any, idx: number) => (
                     <div key={idx} className="flex justify-between mb-2 text-sm">
                       <span className="text-gray-400">{item.quantity} x {item.name}</span>
                       <span className="text-white font-mono">KES {(item.price * item.quantity).toLocaleString()}</span>
                     </div>
                   ))}
                </div>
              </>
            )}

            <div className="bg-gray-800/50 p-4 rounded-xl mb-6">
               <div className="flex justify-between mb-2"><span className="text-gray-400">Amount Due</span><span className="text-2xl font-bold text-white">KES {displayData.total.toLocaleString()}</span></div>
               {!isPaidModal && <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">UNPAID</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowBillModal(false)} className="py-3 bg-gray-800 rounded-lg text-white font-semibold hover:bg-gray-700">Close</button>
              <button onClick={handlePrint} className="py-3 bg-orange-500 rounded-lg text-black font-bold hover:bg-orange-400 flex items-center justify-center gap-2">
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </PermissionGate>
  );
}