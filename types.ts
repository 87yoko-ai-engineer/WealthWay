
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  memo: string;
  type: TransactionType;
}

export const CATEGORIES = {
  expense: [
    '食費',
    '住居・光熱費',
    '交通費',
    '趣味・娯楽',
    '日用品・衣服',
    '健康・医療',
    '教育・教養',
    'その他'
  ],
  income: [
    '給料',
    'ボーナス',
    '投資',
    '臨時収入',
    '副業',
    'その他'
  ]
};
