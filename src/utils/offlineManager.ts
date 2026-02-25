 // src/utils/offlineManager.ts

const OFFLINE_QUEUE_KEY = 'stasha_offline_orders';

// 1. Check if online
export const isOnline = () => {
  return typeof window !== 'undefined' ? window.navigator.onLine : true;
};

// 2. Save order to Local Storage (Queue)
export const saveOrderOffline = (order: any) => {
  if (typeof window === 'undefined') return;
  
  const queue = getOfflineQueue();
  queue.push({ ...order, _offline_id: Date.now(), _status: 'pending' });
  
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  console.log('Order saved to offline queue:', order);
};

// 3. Get all pending offline orders
export const getOfflineQueue = (): any[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

// 4. Remove order from queue after successful sync
export const removeOrderFromQueue = (offlineId: number) => {
  if (typeof window === 'undefined') return;
  
  const queue = getOfflineQueue();
  const newQueue = queue.filter((item: any) => item._offline_id !== offlineId);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
};