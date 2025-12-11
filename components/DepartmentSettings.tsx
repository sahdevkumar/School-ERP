
import React, { useState, useEffect } from 'react';
import { Layers, Briefcase, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { dbService } from '../services/supabase';
import { useToast } from '../context/ToastContext';

export const DepartmentSettings: React.FC = () => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [depts, desigs] = await Promise.all([
      dbService.getDepartments(),
      dbService.getDesignations()
    ]);
    setDepartments(depts);
    setDesignations(desigs);
    setLoading(false);
  };

  const handleAdd = (type: 'dept' | 'desig') => {
    if (type === 'dept' && newDept.trim()) {
      setDepartments([...departments, newDept.trim()]);
      setNewDept('');
    } else if (type === 'desig' && newDesig.trim()) {
      setDesignations([...designations, newDesig.trim()]);
      setNewDesig('');
    }
  };

  const handleRemove = (type: 'dept' | 'desig', index: number) => {
    if (type === 'dept') {
      setDepartments(departments.filter((_, i) => i !== index));
    } else {
      setDesignations(designations.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const [res1, res2] = await Promise.all([
      dbService.saveDepartments(departments),
      dbService.saveDesignations(designations)
    ]);
    setSaving(false);
    if (res1.success && res2.success) {
      showToast('Settings saved successfully!');
    } else {
      showToast('Failed to save settings', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Department & Designation</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage organization structure.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            <Layers className="w-5 h-5 text-indigo-500" /> Departments
          </div>
          <div className="flex gap-2 mb-4">
            <input 
              value={newDept} 
              onChange={e => setNewDept(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleAdd('dept')}
              placeholder="e.g. Science" 
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={() => handleAdd('dept')} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {departments.map((dept, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">{dept}</span>
                <button onClick={() => handleRemove('dept', i)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            <Briefcase className="w-5 h-5 text-indigo-500" /> Designations
          </div>
          <div className="flex gap-2 mb-4">
            <input 
              value={newDesig} 
              onChange={e => setNewDesig(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleAdd('desig')}
              placeholder="e.g. Senior Teacher" 
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={() => handleAdd('desig')} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {designations.map((desig, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">{desig}</span>
                <button onClick={() => handleRemove('desig', i)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Changes
        </button>
      </div>
    </div>
  );
};
