
import React, { useState, useEffect } from 'react';
import { Percent, Plus, Trash2, Tag, Gift, Save, Loader2, DollarSign } from 'lucide-react';
import { dbService } from '../services/supabase';
import { Discount } from '../types';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

export const FinanceDiscounts: React.FC = () => {
  const { currencySymbol } = useSettings();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [activeTab, setActiveTab] = useState<'student' | 'employee'>('student');
  const [loading, setLoading] = useState(false);
  const [newDiscount, setNewDiscount] = useState<Partial<Discount>>({ name: '', type: 'percentage', value: 0, description: '' });
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setLoading(true);
    const data = await dbService.getDiscounts();
    setDiscounts(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newDiscount.name || newDiscount.value === undefined) {
      showToast("Name and Value are required", 'error');
      return;
    }
    setIsSaving(true);
    const payload: Discount = {
      ...newDiscount as Discount,
      category: activeTab,
      created_at: new Date().toISOString()
    };
    const result = await dbService.createDiscount(payload);
    setIsSaving(false);
    
    if (result.success) {
      showToast(`${activeTab === 'student' ? 'Discount' : 'Bonus'} added successfully`);
      setNewDiscount({ name: '', type: 'percentage', value: 0, description: '' });
      fetchDiscounts();
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to add: " + errorMsg, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    const result = await dbService.deleteDiscount(id);
    if (result.success) {
      showToast("Item deleted");
      setDiscounts(prev => prev.filter(d => d.id !== id));
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to delete: " + errorMsg, 'error');
    }
  };

  const filteredDiscounts = discounts.filter(d => d.category === activeTab);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl">
               <Percent className="w-8 h-8 text-white" />
            </div>
            Discount & Bonus
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage student fee discounts and employee salary bonuses.</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('student')} 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'student' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Tag className="w-4 h-4" /> Student Discounts
          </button>
          <button 
            onClick={() => setActiveTab('employee')} 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'employee' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Gift className="w-4 h-4" /> Employee Bonuses
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
          {activeTab === 'student' ? 'Fee Concessions & Discounts' : 'Staff Bonuses & Allowances'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg items-end">
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-medium text-gray-500">Name</label>
            <input 
              placeholder={activeTab === 'student' ? "e.g. Sibling Discount" : "e.g. Performance Bonus"} 
              value={newDiscount.name} 
              onChange={e => setNewDiscount({...newDiscount, name: e.target.value})} 
              className="input-field w-full" 
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-gray-500">Type</label>
            <select 
              value={newDiscount.type} 
              onChange={e => setNewDiscount({...newDiscount, type: e.target.value as any})} 
              className="input-field w-full"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount ({currencySymbol})</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-gray-500">Value</label>
            <div className="relative">
               <div className="absolute left-3 top-3 h-4 w-4 text-gray-400 flex items-center justify-center font-bold text-xs">{newDiscount.type === 'percentage' ? '%' : currencySymbol}</div>
               <input 
                 type="number" 
                 placeholder="0" 
                 value={newDiscount.value || ''} 
                 onChange={e => setNewDiscount({...newDiscount, value: Number(e.target.value)})} 
                 className="input-field w-full pl-10" 
               />
            </div>
          </div>
          <div className="md:col-span-3 space-y-1">
            <label className="text-xs font-medium text-gray-500">Description</label>
            <input 
              placeholder="Optional notes" 
              value={newDiscount.description || ''} 
              onChange={e => setNewDiscount({...newDiscount, description: e.target.value})} 
              className="input-field w-full" 
            />
          </div>
          <div className="md:col-span-2">
            <button 
              onClick={handleAdd} 
              disabled={isSaving}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-70 shadow-lg shadow-indigo-500/20"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600"/></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 text-xs uppercase font-bold tracking-wider">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Value</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredDiscounts.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 pl-2 font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-400 capitalize">{item.type}</td>
                    <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {item.type === 'percentage' ? `${item.value}%` : `${currencySymbol}${item.value}`}
                    </td>
                    <td className="py-3 text-sm text-gray-500">{item.description || '-'}</td>
                    <td className="py-3 text-right pr-2">
                      <button onClick={() => handleDelete(item.id!)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDiscounts.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-gray-500">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`.input-field { width: 100%; padding: 10px; border-radius: 0.5rem; border: 1px solid #e5e7eb; background: #fff; } .dark .input-field { background: #374151; border-color: #4b5563; color: white; }`}</style>
    </div>
  );
};
