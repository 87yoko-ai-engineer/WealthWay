
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, CATEGORIES } from './types';
import { getFinancialInsights } from './services/geminiService';
import { 
  PlusIcon, 
  TrashIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  SparklesIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  PencilIcon,
  XMarkIcon,
  ArrowPathIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';

// --- Helper Functions ---
const formatDateToLocalISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addMonths = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth() + n, date.getDate());

/**
 * 指定したアンカー日と開始日(1-28)に基づいて、その日を含むサイクル期間を取得する
 */
const getCycleRange = (anchorDate: Date, startDay: number) => {
  let start: Date;
  // アンカー日の日が開始日以上なら今月の開始日、そうでなければ先月の開始日がサイクルの起点
  if (anchorDate.getDate() >= startDay) {
    start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), startDay);
  } else {
    start = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, startDay);
  }
  
  // 終了日は開始月の翌月（開始日-1）日
  // 例: 16日開始なら 翌月15日
  // 例: 1日開始なら その月の末日 (Date(Y, M+1, 0))
  const end = new Date(start.getFullYear(), start.getMonth() + 1, startDay - 1);
  
  return {
    start: formatDateToLocalISO(start),
    end: formatDateToLocalISO(end)
  };
};

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('wealthway_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  // 集計開始日の設定 (1-28)
  const [cycleStartDay, setCycleStartDay] = useState<number>(() => {
    const saved = localStorage.getItem('wealthway_cycle_start_day');
    return saved ? parseInt(saved, 10) : 1;
  });

  // 日付範囲の初期値（現在のサイクル）
  const [startDate, setStartDate] = useState<string>(() => {
    return getCycleRange(new Date(), cycleStartDay).start;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return getCycleRange(new Date(), cycleStartDay).end;
  });
  
  const [dateError, setDateError] = useState<string | null>(null);

  // フォームの状態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [date, setDate] = useState<string>(formatDateToLocalISO(new Date()));
  
  const [insights, setInsights] = useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('wealthway_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('wealthway_cycle_start_day', cycleStartDay.toString());
  }, [cycleStartDay]);

  // 日付バリデーション
  useEffect(() => {
    if (startDate > endDate) {
      setDateError('開始日は終了日より前の日付を選択してください。');
    } else {
      setDateError(null);
    }
  }, [startDate, endDate]);

  // プリセット用ハンドラー (カスタムサイクル基準)
  const handleThisMonth = () => {
    const range = getCycleRange(new Date(), cycleStartDay);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const handleLastMonth = () => {
    const now = new Date();
    // 今のサイクルの開始日よりさらに前の月をアンカーにする
    const currentRange = getCycleRange(now, cycleStartDay);
    const currentStart = new Date(currentRange.start);
    const prevAnchor = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() - 1);
    const prevRange = getCycleRange(prevAnchor, cycleStartDay);
    setStartDate(prevRange.start);
    setEndDate(prevRange.end);
  };

  // 集計開始日が変更されたら、現在の表示範囲も「今月」に更新する
  const handleCycleStartDayChange = (newDay: number) => {
    setCycleStartDay(newDay);
    const range = getCycleRange(new Date(), newDay);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  // Insights Trigger
  const handleGetInsights = async () => {
    setIsLoadingInsights(true);
    const result = await getFinancialInsights(filteredTransactions);
    setInsights(result);
    setIsLoadingInsights(false);
  };

  // 選択された期間に基づくフィルタリング
  const filteredTransactions = useMemo(() => {
    if (dateError) return [];
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }, [transactions, startDate, endDate, dateError]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return `¥${Math.floor(val).toLocaleString('ja-JP')}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    return dateStr.replace(/-/g, '/');
  };

  const chartColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

  // Handlers
  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setMemo('');
    setCategory('');
    setDate(formatDateToLocalISO(new Date()));
    setType('expense');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    if (editingId) {
      setTransactions(transactions.map(t => 
        t.id === editingId 
        ? { ...t, amount: Math.floor(parseFloat(amount)), category, memo, date, type } 
        : t
      ));
    } else {
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        date,
        amount: Math.floor(parseFloat(amount)),
        category,
        memo,
        type
      };
      setTransactions([newTransaction, ...transactions]);
    }
    resetForm();
  };

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setMemo(t.memo);
    setDate(t.date);
    setType(t.type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTransaction = (id: string) => {
    if (window.confirm('この取引を削除しますか？')) {
      setTransactions(transactions.filter(t => t.id !== id));
      if (editingId === id) resetForm();
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-auto lg:h-20 py-3 lg:py-0 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">WealthWay</h1>
          </div>
          
          <div className="flex flex-col items-center lg:items-end w-full lg:w-auto">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Cycle Start Day Setting */}
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <div className="flex items-center space-x-1 text-slate-500">
                  <Cog6ToothIcon className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase">集計開始日</span>
                </div>
                <select 
                  value={cycleStartDay}
                  onChange={(e) => handleCycleStartDayChange(parseInt(e.target.value, 10))}
                  className="bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-700 p-0 pr-6 cursor-pointer"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}日</option>
                  ))}
                </select>
              </div>

              {/* Presets */}
              <div className="flex bg-slate-100 p-1 rounded-full shadow-inner border border-slate-200">
                <button 
                  onClick={handleThisMonth}
                  className="px-4 py-1 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-full transition-all"
                >
                  今月
                </button>
                <button 
                  onClick={handleLastMonth}
                  className="px-4 py-1 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-full transition-all"
                >
                  先月
                </button>
              </div>

              {/* Date Range Inputs */}
              <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <div className="flex items-center space-x-2 text-sm">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium p-0 text-slate-600 w-[115px]"
                  />
                  <span className="text-slate-300">〜</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium p-0 text-slate-600 w-[115px]"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full mt-1.5 px-2">
              <span className="text-[10px] text-slate-400 font-medium italic">
                {cycleStartDay}日〜翌月{cycleStartDay === 1 ? '末' : `${cycleStartDay - 1}日`}が「今月」になります
              </span>
              {dateError && (
                <div className="flex items-center space-x-1 text-red-500 text-[10px] font-medium">
                  <ExclamationCircleIcon className="w-3 h-3" />
                  <span>{dateError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Form & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100">
              <p className="text-indigo-100 text-sm font-medium">指定期間の収支</p>
              <h2 className="text-3xl font-bold mt-1">{formatCurrency(stats.balance)}</h2>
              <div className="flex justify-between mt-6 pt-4 border-t border-indigo-400/50">
                <div>
                  <p className="text-indigo-100 text-xs">収入</p>
                  <p className="font-semibold text-lg text-white">+{formatCurrency(stats.income)}</p>
                </div>
                <div>
                  <p className="text-indigo-100 text-xs">支出</p>
                  <p className="font-semibold text-lg text-white">-{formatCurrency(stats.expense)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className={`rounded-2xl p-6 border transition-all duration-300 shadow-sm ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingId ? '取引を編集' : '収支を入力'}
              </h3>
              {editingId && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded uppercase">Edit Mode</span>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategory(''); }}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'expense' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                  支出
                </button>
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategory(''); }}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'income' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                  収入
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">金額</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
                  <input
                    required
                    type="number"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">カテゴリー</label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                >
                  <option value="">選択してください</option>
                  {CATEGORIES[type].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">日付</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">メモ</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="何に使いましたか？"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg active:scale-[0.98] ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
                >
                  {editingId ? <ArrowPathIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                  <span>{editingId ? '更新する' : '記録する'}</span>
                </button>
                
                {editingId && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => deleteTransaction(editingId)}
                      className="flex-1 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors flex items-center justify-center space-x-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>削除</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors flex items-center justify-center space-x-1"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <span>キャンセル</span>
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Columns - Insights & List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-indigo-700">
                <SparklesIcon className="w-5 h-5" />
                <h3 className="font-bold">AIアドバイス（指定期間）</h3>
              </div>
              <button 
                onClick={handleGetInsights}
                disabled={isLoadingInsights || !!dateError}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                {isLoadingInsights ? '分析中...' : 'アドバイスを更新'}
              </button>
            </div>
            <div className="text-slate-700 text-sm leading-relaxed min-h-[4rem] flex items-center italic">
              {insights || "「アドバイスを更新」をタップすると、AIが選択された期間の支出に基づいたヒントを提案します。"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 h-80 flex flex-col shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">支出の内訳</h3>
              <div className="flex-1 min-h-0">
                {!dateError && categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm text-center px-4">
                    {dateError ? '期間設定エラー' : '指定期間の支出データがありません'}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 h-80 flex flex-col shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">収入 vs 支出</h3>
              <div className="flex-1 min-h-0">
                {!dateError ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: '集計', income: stats.income, expense: stats.expense }]}>
                      <XAxis dataKey="name" hide />
                      <YAxis tickFormatter={(val) => `¥${val.toLocaleString()}`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend formatter={(value) => (value === 'income' ? '収入' : '支出')} />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">期間設定エラー</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">指定期間の履歴</h3>
              <span className="text-xs text-slate-400">{filteredTransactions.length} 件のデータ</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
              {dateError ? (
                <div className="py-12 text-center text-red-400 px-6">
                  <p>{dateError}</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p>指定期間の取引データはありません。</p>
                </div>
              ) : (
                filteredTransactions.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => startEditing(t)}
                    className={`px-6 py-4 hover:bg-indigo-50 transition-all flex items-center group cursor-pointer border-l-4 ${editingId === t.id ? 'bg-indigo-50 border-indigo-500' : 'border-transparent'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {t.type === 'income' ? <ArrowUpIcon className="w-5 h-5" /> : <ArrowDownIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="truncate pr-2">
                          <p className="font-semibold text-slate-800 truncate">{t.category}</p>
                          <p className="text-xs text-slate-500 truncate">{formatDateDisplay(t.date)} {t.memo && `• ${t.memo}`}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PencilIcon className="w-4 h-4 text-slate-400" />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTransaction(t.id);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="削除"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
