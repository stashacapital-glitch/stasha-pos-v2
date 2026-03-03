 'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

// This line forces the page to be dynamic, fixing the useSearchParams build error
export const dynamic = 'force-dynamic';

export default function AdjustStockPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('item');

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('opening_adjustment');
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const qty = Number(quantity);
    if (!qty) {
      toast.error("Enter a quantity (positive or negative)");
      return;
    }

    setSubmitting(true);
    
    const { error } = await supabase.from('stock_transactions').insert({
      org_id: profile?.org_id,
      menu_item_id: itemId,
      quantity: qty,
      transaction_type: 'adjustment',
      note: reason
    });

    if (error) {
      toast.error("Failed to record adjustment");
    } else {
      toast.success("Stock Adjusted!");
      router.back();
    }
    setSubmitting(false);
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Adjust Stock</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Adjustment Quantity</label>
          <input 
            type="number" 
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full p-3 bg-gray-700 rounded border border-gray-600"
            placeholder="e.g. 5 or -2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Use positive for found stock, negative for loss/breakage.</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Reason</label>
          <select 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-3 bg-gray-700 rounded border border-gray-600"
          >
            <option value="opening_adjustment">Opening Stock Correction</option>
            <option value="breakage">Breakage / Spoilage</option>
            <option value="theft">Theft / Loss</option>
            <option value="return">Return to Supplier</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button 
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-orange-500 text-black font-bold rounded flex items-center justify-center gap-2 hover:bg-orange-400 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Adjustment
        </button>
      </form>
    </div>
  );
}