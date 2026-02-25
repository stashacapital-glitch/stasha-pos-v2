'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { getOfflineQueue, removeOrderFromQueue, isOnline } from '@/utils/offlineManager';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OfflineSync() {
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkQueue = () => {
      const queue = getOfflineQueue();
      setQueueCount(queue.length);
    };
    checkQueue();

    window.addEventListener('online', () => {
      toast.success('Back Online! Syncing...');
      syncOrders();
    });

    window.addEventListener('offline', () => {
      toast.error('You are offline.');
    });
  }, []);

  const syncOrders = async () => {
    if (!isOnline()) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    setSyncing(true);

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
        toast.success(`Synced Order!`);
      }
    }
    setSyncing(false);
    setQueueCount(getOfflineQueue().length);
  };

  if (queueCount === 0 && isOnline()) return null;

  return (
    <div className="p-4 bg-red-900 border-t border-red-500 text-xs mb-2 rounded">
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
            {isOnline() ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline() ? `${queueCount} Pending` : 'Offline'}</span>
        </div>
        {isOnline() && queueCount > 0 && (
          <button onClick={syncOrders} disabled={syncing} className="bg-white text-black px-2 py-1 rounded font-bold">
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>
    </div>
  );
}