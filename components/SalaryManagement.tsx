
import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

interface SalaryConfigItem {
  id: string;
  department: string;
  level: string;
  amount: number;
  frequency: string;
}

export const SalaryManagement: React.FC = () => {
  const { currencySymbol, currencyCode } = useSettings();
  const [configs, setConfigs] = useState<SalaryConfigItem[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  // Form State
  const [formData, setFormData] = useState({
    department: '',
    level: 'Senior',
    amount: 0,
    frequency: 'Monthly'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [depts, savedConfigs] = await Promise.all([
        dbService.getDepartments(),
        dbService.getSalaryConfigs() // Returns any[] in supabase.ts
      ]);
      setDepartments(depts || []);
      
      // Adapt saved configurations if they exist
      if (savedConfigs) {
        setConfigs(savedConfigs.map((c: any) => ({
          id: c.id || Math.random().toString(36).substr(2, 9),
          department: c.department || c.employee_type || '',
          level: c.level || 'Senior',
          amount: c.amount || 0,
          frequency: c.frequency || 'Monthly'
        })));
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to load salary settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!formData.department) {
      showToast("Please select a department", "error");
      return;
    }
    if (formData.amount <= 0) {
      showToast("Amount must be greater than zero", "error");
      return;
    }

    const newItem: SalaryConfigItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData
    };

    setConfigs([...configs, newItem]);
    setFormData({ ...formData, amount: 0 }); // Reset only amount
  };

  const handleRemove = (id: string) => {
    setConfigs(configs.filter(c => c.id !== id));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    // Map local state back to what the service expects if different
    const result = await dbService.saveSalaryConfigs(configs as any);
    setIsSaving(false);

    if (result.success) {
      showToast("Salary configurations saved successfully!");
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to save: " + errorMsg, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-8 h-8 text-indigo-600" /> Salary Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Configure salary structures based on departments and experience levels.
          </p>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-500" /> Create Salary Rule
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5 lg:col-span-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Layers className="w-3 h-3" /> Department
            </label>
            <select 
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            >
              <option value="">Select Dept</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Level
            </label>
            <select 
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            >
              <option value="Senior">Senior</option>
              <option value="Junior">Junior</option>
              <option value="Intern">Intern</option>
              <option value="HOD">HOD</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              Amount ({currencyCode})
            </label>
            <div className="relative">
               <div className="absolute left-3 top-3 h-4 w-4 text-gray-400 flex items-center justify-center font-bold text-xs">{currencySymbol}</div>
               <input 
                 type="number"
                 value={formData.amount || ''}
                 onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                 placeholder="0.00"
                 className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
               />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3 h-3" /> Frequency
            </label>
            <select 
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            >
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
              <option value="Daily">Daily</option>
            </select>
          </div>

          <button 
            onClick={handleAdd}
            className="w-full h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Configurations List */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-gray-700">
           <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
             <Briefcase className="w-4 h-4 text-indigo-600" /> Active Salary Configurations
           </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Frequency</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {configs.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 dark:text-white">{item.department}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      item.level === 'Senior' ? 'bg-purple-100 text-purple-700' :
                      item.level === 'HOD' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{item.frequency}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-green-600 dark:text-green-400">{currencySymbol}{item.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {configs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                       <TrendingUp className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400 font-bold">No configurations added yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Save Button at Bottom */}
        <div className="p-6 border-t border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-xl border border-amber-100 dark:border-amber-900/50">
             <AlertCircle className="w-4 h-4" />
             <span className="text-xs font-bold">Changes must be saved to apply globally</span>
          </div>
          <button 
            onClick={handleSaveAll}
            disabled={isSaving || configs.length === 0}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-3 uppercase tracking-widest text-xs"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Configurations
          </button>
        </div>
      </div>
    </div>
  );
};
