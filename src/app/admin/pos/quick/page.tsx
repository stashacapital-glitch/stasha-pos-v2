 'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { Loader2, ShoppingCart, Plus, Trash2, Search, Printer, Eye, CheckCircle, X } from 'lucide-react';
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

  useEffect(() => {
    fetchItems();
  }, [profile]);

  const fetchItems = async () => {
    if (!profile?.org_id) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, price, current_stock')
      .eq('org_id', profile.org_id)
      .eq('is_available', true)
      .order('name');

    if (error) toast.error("Failed to load items");
    else setAllItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (search.length > 0) {
      setResults(allItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase())));
    } else {
      setResults([]);
    }
  }, [search, allItems]);

  const addToCart = (item: any) => {
    if (item.current_stock !== null && item.current_stock <= 0) {
      toast.error(`${item.name} is out of stock!`);
      return;
    }
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        if (item.current_stock !== null && (exists.quantity + 1) > item.current_stock) {
           toast.error("Not enough stock!");
           return prev;
        }
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
      if (delta > 0 && item.current_stock !== null && newQty > item.current_stock) {
        toast.error("Stock limit reached!");
        return item;
      }
      return newQty > 0 ? { ...item, quantity: newQty } : item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const generateReceiptNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCP-${year}${month}${day}-${random}`;
  };

  const handleSale = async (method: 'cash' | 'mpesa' | 'card') => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const receiptNumber = generateReceiptNumber();

      const { data: order, error: orderError } = await supabase.from('orders').insert({
        org_id: profile?.org_id,
        items: cart,
        total_price: total,
        status: 'paid',
        payment_method: method,
        paid_at: new Date().toISOString(),
        receipt_number: receiptNumber
      }).select('id, receipt_number, paid_at').single();

      if (orderError) throw orderError;

      const itemIds = cart.map(i => i.id);
      const { data: allRecipes } = await supabase.from('recipes').select('menu_item_id, ingredient_id, quantity').in('menu_item_id', itemIds);
      
      // FIX: Explicitly type the array as Promise<any>[]
      const deductionOperations: Promise<any>[] = [];
      
      cart.forEach(item => {
        const relatedRecipes = allRecipes?.filter(r => r.menu_item_id === item.id);
        if (relatedRecipes && relatedRecipes.length > 0) {
          relatedRecipes.forEach(ing => {
            deductionOperations.push(
              supabase.rpc('deduct_stock', { item_id: ing.ingredient_id, qty: ing.quantity * item.quantity })
            );
          });
        } else {
          deductionOperations.push(
            supabase.rpc('deduct_stock', { item_id: item.id, qty: item.quantity })
          );
        }
      });

      await Promise.all(deductionOperations);

      setLastOrder({ ...order, items: cart, total: total, method: method, cashier: profile?.full_name || 'Admin' });
      setIsPaidModal(true);
      setShowBillModal(true); 
      setCart([]);
      fetchItems();
      toast.success("Sale Complete!");

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const printWindow = window.open('', '', 'height=600,width=300');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Receipt</title>');
      printWindow.document.write('<style>body{font-family: "Courier New", monospace; font-size: 12px; width: 280px; margin: 0 auto; color: #000;} .header{text-align: center; margin-bottom: 10px;} .meta{margin-bottom: 10px;} .items{width: 100%; border-collapse: collapse; margin-bottom: 10px;} .items td{padding: 2px 0;} .totals{width: 100%; margin-top: 10px;} .totals td{padding: 2px 0;} .total-row{font-weight: bold; font-size: 16px;} .footer{text-align: center; margin-top: 15px; font-size: 10px;} hr{border: 0; border-top: 1px dashed #000; margin: 10px 0;}</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(printContents);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const openViewModal = () => {
    setIsPaidModal(false);
    setLastOrder(null);
    setShowBillModal(true);
  }

  const displayData = isPaidModal ? lastOrder : { items: cart, total, cashier: profile?.full_name, receipt_number: 'PRO-FORMA', paid_at: new Date().toISOString(), method: 'UNPAID' };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-orange-400" /></div>;

  return (
    <PermissionGate allowedRoles={['admin', 'manager', 'waiter', 'bartender']} fallback={<div className="p-8 text-red-400 text-center">Access Denied</div>}>
      <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <h1 className="text-2xl font-bold text-orange-400">Quick Sale</h1>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto">
          
          {/* 1. SEARCH SECTION */}
          <div className="p-4 bg-gray-900 sticky top-0 z-10 border-b border-gray-800">
            <div className="flex items-center gap-2 bg-gray-800 p-3 rounded-lg border border-gray-700">
              <Search className="text-gray-500" size={20} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white text-lg focus:outline-none"
              />
              {search.length > 0 && (
                <button onClick={() => setSearch('')} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* 2. SEARCH RESULTS */}
          {search.length > 0 && (
            <div className="p-4 space-y-2 bg-gray-950">
              {results.length === 0 ? (
                <p className="text-gray-500 text-center text-sm py-4">No items found</p>
              ) : (
                results.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => addToCart(item)}
                    className="w-full text-left p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-orange-500 flex justify-between items-center transition"
                  >
                    <div>
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-sm text-orange-400">KES {item.price}</p>
                    </div>
                    <div className="text-right">
                      {item.current_stock !== null ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${item.current_stock > 0 ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                          {item.current_stock > 0 ? `${item.current_stock} in stock` : 'Out of stock'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">Unlimited</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* 3. CURRENT BILL */}
          {search.length === 0 && (
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-gray-300">Current Bill</h2>
                <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">{cart.length} items</span>
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                   <ShoppingCart className="text-gray-700 mb-3" size={40} />
                   <p className="text-gray-600 text-sm">Search items above to add to bill</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-800">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                        <p className="text-gray-500 text-xs">KES {item.price}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-red-900/30 text-red-300 rounded flex items-center justify-center font-bold">-</button>
                        <span className="text-white font-bold text-sm w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-green-900/30 text-green-300 rounded flex items-center justify-center font-bold">+</button>
                        <button onClick={() => removeFromCart(item.id)} className="ml-1 text-gray-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 p-4">
           <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={openViewModal} disabled={cart.length === 0} className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"><Eye size={12}/> View Bill</button>
              <button onClick={handlePrint} disabled={cart.length === 0} className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"><Printer size={12}/> Print</button>
           </div>

           <div className="flex justify-between font-bold text-lg text-white mb-3">
             <span>TOTAL</span>
             <span>KES {total.toLocaleString()}</span>
           </div>

           <div className="grid grid-cols-3 gap-2">
             <button onClick={() => handleSale('cash')} disabled={submitting || cart.length === 0} className="py-3 bg-green-700 hover:bg-green-600 rounded-lg text-white text-sm font-bold disabled:opacity-50">Cash</button>
             <button onClick={() => handleSale('mpesa')} disabled={submitting || cart.length === 0} className="py-3 bg-purple-700 hover:bg-purple-600 rounded-lg text-white text-sm font-bold disabled:opacity-50">M-Pesa</button>
             <button onClick={() => handleSale('card')} disabled={submitting || cart.length === 0} className="py-3 bg-blue-700 hover:bg-blue-600 rounded-lg text-white text-sm font-bold disabled:opacity-50">Card</button>
           </div>
        </div>
      </div>

      {/* HIDDEN PRINT TEMPLATE */}
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

          <table className="items text-xs mb-2">
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

          <table className="totals text-xs mb-2">
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

          <div className="footer border-t border-dashed border-gray-400 pt-2">
            <p className="font-bold">Thank you for your business!</p>
            <p className="mt-1">Powered by StashaPOS</p>
          </div>
        </div>
      </div>

      {/* VIEW / SUCCESS MODAL */}
      {showBillModal && displayData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 p-6 rounded-2xl w-full max-w-sm border border-gray-700 relative">
            <button onClick={() => setShowBillModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={18} /></button>
            
            {isPaidModal ? (
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-400" size={32} />
                </div>
                <h2 className="text-xl font-bold text-white">Sale Complete</h2>
                <p className="text-gray-400 text-sm">Receipt: {displayData.receipt_number}</p>
              </div>
            ) : (
              <h2 className="text-xl font-bold text-white mb-4">Current Bill</h2>
            )}

            <div className="bg-gray-800 p-4 rounded-lg mb-6 text-white text-sm max-h-48 overflow-y-auto">
               {displayData.items.map((item: any, idx: number) => (
                 <div key={idx} className="flex justify-between mb-1 text-xs">
                   <span>{item.quantity} x {item.name}</span>
                   <span>KES {(item.price * item.quantity).toLocaleString()}</span>
                 </div>
               ))}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg mb-6 text-white text-sm">
               <div className="flex justify-between mb-2"><span className="text-gray-400">Total:</span><span className="font-bold text-lg">KES {displayData.total.toLocaleString()}</span></div>
               {!isPaidModal && <div className="text-xs text-gray-500 text-center">UNPAID</div>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowBillModal(false)} className="py-3 bg-gray-700 rounded-lg text-white font-bold hover:bg-gray-600">Close</button>
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