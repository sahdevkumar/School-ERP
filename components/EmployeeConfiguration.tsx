
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  ShieldCheck,
  UserCog,
  CheckCircle2,
  Info
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { useToast } from '../context/ToastContext';

export const EmployeeConfiguration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'role' | 'designation' | 'department'>('role');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  // Data States
  const [roles, setRoles] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // Input States
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userConfig, depts, desigs] = await Promise.all([
        dbService.getUserConfiguration(),
        dbService.getDepartments(),
        dbService.getDesignations()
      ]);
      setRoles(userConfig.userTypes || []);
      setDepartments(depts || []);
      setDesignations(desigs || []);
    } catch (error) {
      showToast('Failed to load configuration data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;

    if (activeTab === 'role') {
      if (roles.includes(newItem.trim())) {
        showToast('Role already exists', 'error');
        return;
      }
      setRoles([...roles, newItem.trim()]);
    } else if (activeTab === 'designation') {
      if (designations.includes(newItem.trim())) {
        showToast('Designation already exists', 'error');
        return;
      }
      setDesignations([...designations, newItem.trim()]);
    } else {
      if (departments.includes(newItem.trim())) {
        showToast('Department already exists', 'error');
        return;
      }
      setDepartments([...departments, newItem.trim()]);
    }
    setNewItem('');
  };

  const handleRemoveItem = (index: number) => {
    if (activeTab === 'role') {
      const roleToRemove = roles[index];
      if (['Super Admin', 'Admin', 'Editor', 'Viewer'].includes(roleToRemove)) {
        showToast('System roles cannot be deleted', 'error');
        return;
      }
      setRoles(roles.filter((_, i) => i !== index));
    } else if (activeTab === 'designation') {
      setDesignations(designations.filter((_, i) => i !== index));
    } else {
      setDepartments(departments.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'role') {
        const config = await dbService.getUserConfiguration();
        await dbService.saveUserConfiguration({
          ...config,
          userTypes: roles
        });
      } else if (activeTab === 'designation') {
        await dbService.saveDesignations(designations);
      } else {
        await dbService.saveDepartments(departments);
      }
      showToast(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings saved successfully!`);
    } catch (error) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentList = activeTab === 'role' ? roles : activeTab === 'designation' ? designations : departments;
  const TabIcon = activeTab === 'role' ? UserCog : activeTab === 'designation' ? Briefcase : Layers;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
               <Users className="w-8 h-8 text-white" />
            </div>
            Employees Configuration
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage organizational hierarchy and roles.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex w-fit">
        {[
          { id: 'role', label: 'Role', icon: UserCog },
          { id: 'designation', label: 'Designation', icon: Briefcase },
          { id: 'department', label: 'Department', icon: Layers }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setNewItem(''); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
             <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-widest text-xs">
                  <TabIcon className="w-4 h-4 text-indigo-600" /> Current {activeTab}s
                </h3>
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg">
                  {currentList.length} Total
                </span>
             </div>

             <div className="p-6">
                <div className="flex gap-3 mb-8">
                   <input 
                     value={newItem} 
                     onChange={e => setNewItem(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                     placeholder={`Enter new ${activeTab} name...`}
                     className="flex-1 px-5 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                   />
                   <button 
                     onClick={handleAddItem}
                     className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                   >
                     <Plus className="w-6 h-6" />
                   </button>
                </div>

                <div className="space-y-2">
                   {currentList.map((item, index) => (
                     <div 
                       key={index} 
                       className="group flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/30 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900 rounded-2xl transition-all"
                     >
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-xs font-black text-indigo-600 shadow-sm border border-gray-100 dark:border-gray-700">
                             {index + 1}
                           </div>
                           <span className="font-bold text-gray-700 dark:text-gray-300">{item}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   ))}
                   {currentList.length === 0 && (
                     <div className="text-center py-10">
                        <div className="bg-gray-50 dark:bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                           <TabIcon className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-bold">No {activeTab}s configured yet.</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
              <div className="relative z-10">
                <CheckCircle2 className="w-10 h-10 mb-4 opacity-50" />
                <h4 className="text-xl font-black mb-2">Publish Changes</h4>
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">Changes made to the lists above are temporary until you save them to the global system settings.</p>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-4 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save All Settings
                </button>
              </div>
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
           </div>

           <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-start gap-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                 <Info className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Important Note</h5>
                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                  Removing a role or designation that is currently assigned to active employees may affect their profile visibility or reporting.
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
