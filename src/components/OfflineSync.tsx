 'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase';
import { getOfflineQueue, removeOrderFromQueue, isOnline } from '@/utils/offlineManager';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OfflineSync() {
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(isOnline()); // Initialize with current status
  const supabase = createClient();

  // Define sync function with useCallback to prevent unnecessary re-renders
  const syncOrders = useCallback(async () => {
    if (!isOnline()) return;
    
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    let syncedCount = 0;

    for (const order of queue) {
      const { error } = await supabase.from('orders').insert({
        org_id: order.org_id,
        table_id: order.table_id,
        items: order.items,
        total_price: order.total_price,
        status: 'pending'
      });

      if (!error) {
        removeOrderFromQueue(order._offline_id);
        syncedCount++;
      } else {
        console.error('Failed to sync order:', order._offline_id, error);
        // Optional: Stop syncing on error? Or continue? 
        // Currently we continue to next order.
      }
    }

    setSyncing(false);
    const newCount = getOfflineQueue().length;
    setQueueCount(newCount);

    // Single toast for the batch
    if (syncedCount > 0) {
      toast.success(`Synced ${syncedCount} order(s) successfully!`);
    }
  }, [supabase]);

  useEffect(() => {
    // Initial queue check
    setQueueCount(getOfflineQueue().length);

    // Define handlers
    const handleOnline = () => {
      setOnline(true);
      toast.success('Back Online! Syncing...');
      syncOrders();
    };

    const handleOffline = () => {
      setOnline(false);
      toast.error('You are offline.');
    };

    // Add listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // CLEANUP FUNCTION (Fixes Memory Leak)
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOrders]); // Dependency added

  if (queueCount === 0 && online) return null;

  return (
    <div className="p-4 bg-red-900 border-t border-red-500 text-xs mb-2 rounded">
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{online ? `${queueCount} Pending` : 'Offline'}</span>
        </div>
        {online && queueCount > 0 && (
          <button 
            onClick={syncOrders} 
            disabled={syncing} 
            className="bg-white text-black px-2 py-1 rounded font-bold disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>
    </div>
  );
}