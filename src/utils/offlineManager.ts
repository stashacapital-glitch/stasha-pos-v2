// src/utils/offlineManager.ts

const OFFLINE_QUEUE_KEY = 'stasha_offline_orders';

export const isOnline = () => {
  return typeof window !== 'undefined' ? window.navigator.onLine : true;
};

export const saveOrderOffline = (order: any) => {
  if (typeof window === 'undefined') return;
  const queue = getOfflineQueue();
  queue.push({ ...order, _offline_id: Date.now(), _status: 'pending' });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

export const getOfflineQueue = (): any[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

export const removeOrderFromQueue = (offlineId: number) => {
  if (typeof window === 'undefined') return;
  const queue = getOfflineQueue();
  const newQueue = queue.filter((item: any) => item._offline_id !== offlineId);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
};