 import { createClient } from './supabase';

type TransactionType = 'purchase' | 'sale' | 'return' | 'wastage';

export const logStockTransaction = async (
  orgId: string,
  itemId: string,
  quantity: number,
  type: TransactionType,
  note?: string
) => {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('stock_transactions')
    .insert({
      org_id: orgId,
      menu_item_id: itemId,
      quantity: quantity,
      transaction_type: type,
      note: note
    });

  if (error) {
    console.error('Failed to log stock transaction:', error);
    return false;
  }
  return true;
};