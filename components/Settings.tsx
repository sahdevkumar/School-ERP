
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  School, 
  Save, 
  Loader2, 
  Globe, 
  Shield, 
  Clock, 
  Database, 
  Smartphone, 
  Fingerprint, 
  Plus, 
  Trash2, 
  BookOpen, 
  Layers, 
  Layout, 
  LayoutTemplate, 
  ToggleLeft, 
  ToggleRight, 
  Monitor, 
  PanelLeft, 
  Menu, 
  Edit2, 
  Upload, 
  ChevronDown, 
  Check, 
  X, 
  UserCog, 
  PenTool, 
  Users 
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../context/PermissionContext';
import { NavItem, DashboardLayoutConfig, AdminPanelConfig, SystemPermissions, UserFieldConfig } from '../types';
import { iconList, getIcon } from '../utils/iconMap';
import { UserManagement } from './UserManagement';

interface SettingsProps {
  activePage: string;
}

// Reusable Toggle Switch Component
const ToggleSwitch = ({ label, enabled, onChange }: { label?: string, enabled: boolean, onChange: () => void }) => (
  <div className={`flex items-center justify-between py-2 ${label ? 'border-b border-gray-100 dark:border-gray-700 last:border-b-0' : ''}`}>
    {label && <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:ring-offset-gray-800 ${
        enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

// Define Permission Modules
const permissionModules = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'admission', label: 'Admission & Reception' },
  { id: 'students', label: 'Student Management' },
  { id: 'employees', label: 'Employees / Staff' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'fees', label: 'Fees & Finance' },
  { id: 'users', label: 'User Management' },
  { id: 'settings', label: 'System Settings' },
  { id: 'activity', label: 'User Logs / Activity' },
  { id: 'recycle_bin', label: 'Recycle Bin' }
];

export const Settings: React.FC<SettingsProps> = ({ activePage }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [dashboardConfig, setDashboardConfig] = useState<DashboardLayoutConfig | null>(null);
  const [adminConfig, setAdminConfig] = useState<AdminPanelConfig | null>(null);
  const [menuLayout, setMenuLayout] = useState<NavItem[]>([]);
  const [rolePermissions, setRolePermissions] = useState<SystemPermissions | null>(null);
  
  // User Config State
  const [userConfig, setUserConfig] = useState<{ userTypes: string[]; userFields: UserFieldConfig[] }>({ userTypes: [], userFields: [] });
  const [newUserType, setNewUserType] = useState('');
  const [newField, setNewField] = useState<Partial<UserFieldConfig>>({ label: '', type: 'text', required: false });
  const [activeUserConfigTab, setActiveUserConfigTab] = useState<'types' | 'form'>('types');

  const [activeLayoutTab, setActiveLayoutTab] = useState<'dashboard' | 'admin' | 'menu'>('dashboard');
  const [activeRoleTab, setActiveRoleTab] = useState<string>('Admin');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const { refreshPermissions } = usePermissions();
  
  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Menu Layout State
  const [openIconPicker, setOpenIconPicker] = useState<string | null>(null);


  // Student Fields State
  const [studentFields, setStudentFields] = useState<{ classes: string[], sections: string[], subjects: string[] }>({ classes: [], sections: [], subjects: [] });
  const [newClass, setNewClass] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    if (activePage === 'system-student-field') {
      fetchStudentFields();
    } else if (activePage === 'dashboard-layout' || activePage === 'menu-layout') {
      if (activePage === 'menu-layout') setActiveLayoutTab('menu');
      fetchLayouts();
    } else if (activePage === 'role-permissions') {
      fetchPermissions();
      fetchUserConfig(); // Fetch dynamic roles for permissions tab
    } else if (activePage === 'user-configuration') {
      fetchUserConfig();
    } else if (activePage === 'settings-users') {
      // No specific load needed here, UserManagement handles it
    } else {
      fetchSettings();
    }
  }, [activePage]);

  const fetchSettings = async () => {
    setIsLoading(true);
    const data = await dbService.getSystemSettings();
    setSettings(data);
    if(data.school_logo_url) {
      setLogoPreview(data.school_logo_url);
    }
    setIsLoading(false);
  };

  const fetchStudentFields = async () => {
    setIsLoading(true);
    const data = await dbService.getStudentFields();
    setStudentFields(data);
    setIsLoading(false);
  };

  const fetchLayouts = async () => {
    setIsLoading(true);
    const [dashData, adminData, menuData] = await Promise.all([
      dbService.getDashboardLayout(),
      dbService.getAdminPanelConfig(),
      dbService.getMenuLayout()
    ]);
    setDashboardConfig(dashData);
    setAdminConfig(adminData);
    setMenuLayout(menuData);
    setIsLoading(false);
  };

  const fetchPermissions = async () => {
    setIsLoading(true);
    const data = await dbService.getRolePermissions();
    setRolePermissions(data);
    setIsLoading(false);
  };

  const fetchUserConfig = async () => {
    setIsLoading(true);
    const data = await dbService.getUserConfiguration();
    setUserConfig(data);
    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDashboardToggle = (key: keyof DashboardLayoutConfig) => {
    setDashboardConfig(prev => prev ? ({ ...prev, [key]: !prev[key] }) : null);
  };

  const handleAdminToggle = (key: keyof AdminPanelConfig) => {
    setAdminConfig(prev => prev ? ({ ...prev, [key]: !prev[key] }) : null);
  };

  const handlePermissionToggle = (role: string, module: string, action: 'view' | 'edit' | 'delete') => {
    setRolePermissions(prev => {
      const newPermissions = prev ? JSON.parse(JSON.stringify(prev)) : {};
      if (!newPermissions[role]) newPermissions[role] = {};
      if (!newPermissions[role][module]) newPermissions[role][module] = { view: false, edit: false, delete: false };
      
      newPermissions[role][module][action] = !newPermissions[role][module][action];
      return newPermissions;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    let finalSettings = { ...settings };
    
    if (logoFile) {
      const { publicUrl, error } = await dbService.uploadSystemAsset(logoFile, 'school_logo');
      if (publicUrl) {
        finalSettings.school_logo_url = publicUrl;
      } else {
        showToast("Logo upload failed: " + error, 'error');
        setIsSaving(false);
        return;
      }
    }
    
    const result = await dbService.saveSystemSettings(finalSettings);
    setIsSaving(false);

    if (result.success) {
      showToast("Settings saved successfully!");
      setLogoFile(null); // Reset file state
    } else {
      showToast("Failed to save settings: " + result.error, 'error');
    }
  };

  const handleSaveFields = async () => {
    setIsSaving(true);
    const result = await dbService.saveStudentFields(studentFields);
    setIsSaving(false);
    if (result.success) showToast("Student fields configuration saved!");
    else showToast("Failed to save: " + result.error, 'error');
  };

  const handleSaveLayout = async () => {
    if (!dashboardConfig || !adminConfig) return;
    setIsSaving(true);
    
    let result: { success: boolean; error?: string } | undefined;
    let type = '';

    if (activeLayoutTab === 'dashboard') {
      result = await dbService.saveDashboardLayout(dashboardConfig);
      type = 'Dashboard';
    } else if (activeLayoutTab === 'admin') {
      result = await dbService.saveAdminPanelConfig(adminConfig);
      type = 'Admin Panel';
    } else if (activeLayoutTab === 'menu') {
      result = await dbService.saveMenuLayout(menuLayout);
      type = 'Menu';
    }

    setIsSaving(false);
    if (result?.success) {
      showToast(`${type} layout updated successfully!`);
    } else {
      showToast(`Failed to save ${type} layout: ${result?.error}`, 'error');
    }
  };

  const handleSavePermissions = async () => {
    if (!rolePermissions) return;
    setIsSaving(true);
    const result = await dbService.saveRolePermissions(rolePermissions);
    setIsSaving(false);
    if (result.success) {
        showToast("Role & Permissions saved successfully!");
        await refreshPermissions(); // Refresh context
    } else {
        showToast("Failed to save permissions: " + result.error, 'error');
    }
  };

  const handleSaveUserConfig = async () => {
    setIsSaving(true);
    // 1. Save Config
    const result = await dbService.saveUserConfiguration(userConfig);
    
    if (result.success) {
        showToast("User configuration saved!");
        // 2. Attempt to Sync Schema (Auto Add Column)
        try {
            const schemaResult = await dbService.ensureCustomFieldsSchema();
            if (!schemaResult.success) {
                // Warning only - doesn't stop flow
                if (schemaResult.error.includes("function") && schemaResult.error.includes("does not exist")) {
                    showToast("Note: Auto-schema update failed. SQL setup required.", 'info');
                }
            } else {
                showToast("Database schema synchronized.");
            }
        } catch (e) {
            console.warn("Schema sync error", e);
        }
    } else {
        showToast("Failed to save: " + result.error, 'error');
    }
    setIsSaving(false);
  };

  const handleAddField = (type: 'classes' | 'sections' | 'subjects') => {
    let value = '';
    if (type === 'classes') value = newClass;
    if (type === 'sections') value = newSection;
    if (type === 'subjects') value = newSubject;

    if (!value.trim()) return;

    setStudentFields(prev => ({ ...prev, [type]: [...prev[type], value.trim()] }));

    if (type === 'classes') setNewClass('');
    if (type === 'sections') setNewSection('');
    if (type === 'subjects') setNewSubject('');
  };

  const handleRemoveField = (type: 'classes' | 'sections' | 'subjects', index: number) => {
    setStudentFields(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== index) }));
  };

  // User Config Helpers
  const addUserType = () => {
    if (!newUserType.trim()) return;
    setUserConfig(prev => ({ ...prev, userTypes: [...prev.userTypes, newUserType.trim()] }));
    setNewUserType('');
  };

  const removeUserType = (index: number) => {
    setUserConfig(prev => ({ ...prev, userTypes: prev.userTypes.filter((_, i) => i !== index) }));
  };

  const addUserField = () => {
    if (!newField.label) {
      showToast("Label is required", "error");
      return;
    }
    const field: UserFieldConfig = {
      id: Date.now().toString(),
      label: newField.label,
      type: newField.type || 'text',
      required: newField.required || false,
      options: newField.options
    };
    setUserConfig(prev => ({ ...prev, userFields: [...prev.userFields, field] }));
    setNewField({ label: '', type: 'text', required: false, options: '' });
  };

  const removeUserField = (id: string) => {
    setUserConfig(prev => ({ ...prev, userFields: prev.userFields.filter(f => f.id !== id) }));
  };

  // Menu Layout Handlers
  const handleMenuChange = (index: number, field: keyof NavItem, value: string) => {
    const newLayout = [...menuLayout];
    (newLayout[index] as any)[field] = value;
    setMenuLayout(newLayout);
  };

  const handleSubMenuChange = (parentIndex: number, childIndex: number, field: keyof NavItem, value: string) => {
    const newLayout = [...menuLayout];
    if (newLayout[parentIndex].children) {
      (newLayout[parentIndex].children![childIndex] as any)[field] = value;
      setMenuLayout(newLayout);
    }
  };

  const addMenuItem = () => {
    setMenuLayout([...menuLayout, { label: 'New Item', icon: 'Menu', href: 'new-page' }]);
  };
  
  const removeMenuItem = (index: number) => {
    setMenuLayout(menuLayout.filter((_, i) => i !== index));
  };

  const addSubMenuItem = (parentIndex: number) => {
    const newLayout = [...menuLayout];
    const parent = newLayout[parentIndex];
    if (!parent.children) parent.children = [];
    parent.children.push({ label: 'New Sub-Item', href: 'new-sub-page', icon: 'Circle' });
    setMenuLayout(newLayout);
  };

  const removeSubMenuItem = (parentIndex: number, childIndex: number) => {
    const newLayout = [...menuLayout];
    if (newLayout[parentIndex].children) {
      newLayout[parentIndex].children = newLayout[parentIndex].children!.filter((_, i) => i !== childIndex);
      setMenuLayout(newLayout);
    }
  };

  // Visual Icon Picker Component
  const renderIconPicker = (currentIcon: string, onSelect: (iconName: string) => void, pickerId: string) => {
    const Icon = getIcon(currentIcon);
    const isOpen = openIconPicker === pickerId;

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenIconPicker(isOpen ? null : pickerId)}
          className="input-field flex items-center justify-between text-left w-full"
        >
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="text-sm">{currentIcon || 'Select Icon'}</span>
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
            {iconList.map(iconName => {
              const ListItemIcon = getIcon(iconName);
              return (
                <button
                  type="button"
                  key={iconName}
                  onClick={() => {
                    onSelect(iconName);
                    setOpenIconPicker(null);
                  }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ListItemIcon className="w-4 h-4" />
                  <span className="text-sm">{iconName}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };


  const renderContent = () => {
    switch (activePage) {
      case 'settings-users':
        return <UserManagement />;

      case 'user-configuration':
        // ... (User Configuration Content)
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><UserCog className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">User Configuration</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage user types and custom form fields.</p>
                </div>
              </div>
              <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <button 
                  onClick={() => setActiveUserConfigTab('types')} 
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeUserConfigTab === 'types' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  <Users className="w-4 h-4" /> User Types
                </button>
                <button 
                  onClick={() => setActiveUserConfigTab('form')} 
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeUserConfigTab === 'form' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  <PenTool className="w-4 h-4" /> Input Form
                </button>
              </div>
            </div>

            <div className="mt-4">
              {/* User Types Section */}
              {activeUserConfigTab === 'types' && (
                <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Manage User Types</h4>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input
                      value={newUserType}
                      onChange={(e) => setNewUserType(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addUserType()}
                      placeholder="Add new user type (e.g., Driver, Staff)..."
                      className="input-field flex-1"
                    />
                    <button onClick={addUserType} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userConfig.userTypes.map((type, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-sm">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{type}</span>
                        {/* Prevent deleting core system roles */}
                        {!['Super Admin', 'Admin', 'Editor', 'Viewer'].includes(type) && (
                          <button onClick={() => removeUserType(index)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                    {userConfig.userTypes.length === 0 && <span className="text-sm text-gray-500 italic">No custom user types added.</span>}
                  </div>
                </div>
              )}

              {/* User Input Form Configuration */}
              {activeUserConfigTab === 'form' && (
                <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
                  {/* ... Existing form logic ... */}
                  <div className="flex items-center gap-2 mb-4">
                    <PenTool className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">Configure User Input Form</h4>
                  </div>
                  
                  {/* Add Field Form */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="md:col-span-1">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Label</label>
                      <input 
                        value={newField.label} 
                        onChange={e => setNewField({...newField, label: e.target.value})} 
                        placeholder="Field Label" 
                        className="input-field w-full"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
                      <select 
                        value={newField.type} 
                        onChange={e => setNewField({...newField, type: e.target.value as any})}
                        className="input-field w-full"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="date">Date</option>
                        <option value="select">Select Dropdown</option>
                        <option value="textarea">Text Area</option>
                      </select>
                    </div>
                    <div className="md:col-span-1">
                       <label className="text-xs font-medium text-gray-500 mb-1 block">Options (for Select)</label>
                       <input 
                        value={newField.options || ''} 
                        onChange={e => setNewField({...newField, options: e.target.value})} 
                        placeholder="Comma separated" 
                        disabled={newField.type !== 'select'}
                        className="input-field w-full disabled:opacity-50"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newField.required} 
                          onChange={e => setNewField({...newField, required: e.target.checked})}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
                      </label>
                      <button onClick={addUserField} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Add Field</button>
                    </div>
                  </div>

                  {/* Field List */}
                  <div className="space-y-2">
                    {userConfig.userFields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-gray-800 dark:text-white">{field.label}</span>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase">{field.type}</span>
                          {field.required && <span className="text-xs text-red-500 font-medium">* Required</span>}
                          {field.options && <span className="text-xs text-gray-500 truncate max-w-[200px]">Options: {field.options}</span>}
                        </div>
                        <button onClick={() => removeUserField(field.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {userConfig.userFields.length === 0 && <div className="text-center text-gray-500 py-4 italic">No custom fields configured.</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
               <button onClick={handleSaveUserConfig} disabled={isSaving || isLoading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Configuration
              </button>
            </div>
          </div>
        );

      case 'global-settings':
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Globe className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">General Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure basic system information</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">System Name</label>
                <input name="system_name" value={settings.system_name || ''} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">System Title</label>
                <input name="system_title" value={settings.system_title || ''} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <input name="address" value={settings.address || ''} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input name="phone" value={settings.phone || ''} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">System Email</label>
                <input type="email" name="system_email" value={settings.system_email || ''} onChange={handleInputChange} className="input-field" />
              </div>
               <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency Symbol</label>
                <input name="currency_symbol" value={settings.currency_symbol || ''} onChange={handleInputChange} className="input-field" />
              </div>
               <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency (e.g., USD)</label>
                <input name="currency" value={settings.currency || ''} onChange={handleInputChange} className="input-field" />
              </div>
               <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Session (e.g., 2025-2026)</label>
                <input name="session" value={settings.session || ''} onChange={handleInputChange} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
               <button onClick={handleSave} disabled={isSaving || isLoading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20"><Save className="w-5 h-5" />Save Settings</button>
            </div>
          </div>
        );

      case 'school-settings':
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><School className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">School Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Details printed on reports and ID cards</p>
                </div>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
               <div className="space-y-4">
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-gray-700 dark:text-gray-300">School Name</label>
                   <input name="school_name" value={settings.school_name || ''} onChange={handleInputChange} className="input-field" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-gray-700 dark:text-gray-300">School Code</label>
                   <input name="school_code" value={settings.school_code || ''} onChange={handleInputChange} className="input-field" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-gray-700 dark:text-gray-300">School Email</label>
                   <input type="email" name="school_email" value={settings.school_email || ''} onChange={handleInputChange} className="input-field" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-sm font-medium text-gray-700 dark:text-gray-300">School Phone</label>
                   <input name="school_phone" value={settings.school_phone || ''} onChange={handleInputChange} className="input-field" />
                 </div>
                  <div className="space-y-1">
                   <label className="text-sm font-medium text-gray-700 dark:text-gray-300">School Address</label>
                   <textarea name="school_address" value={settings.school_address || ''} onChange={handleInputChange} className="input-field" rows={3}></textarea>
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-300">School Logo</label>
                 <div className="mt-1 flex items-center gap-5">
                   <span className="h-24 w-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                     {logoPreview ? (
                       <img src={logoPreview} alt="Logo Preview" className="h-full w-full object-contain" />
                     ) : (
                       <School className="h-12 w-12 text-gray-300 dark:text-gray-500" />
                     )}
                   </span>
                   <label htmlFor="logo-upload" className="cursor-pointer px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-colors">
                     Change
                   </label>
                   <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleLogoChange} accept="image/png, image/jpeg" />
                 </div>
                 <p className="text-xs text-gray-500 mt-2">PNG or JPG, max 1MB.</p>
               </div>
            </div>
             <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                 <button onClick={handleSave} disabled={isSaving || isLoading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Information
                </button>
              </div>
          </div>
        );
      
      case 'role-permissions':
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><Shield className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Role & Permissions</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage access levels for different user roles</p>
              </div>
            </div>

            {/* Role Tabs */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg mb-6 w-fit overflow-x-auto">
              {userConfig.userTypes.map((role) => (
                <button 
                  key={role}
                  onClick={() => setActiveRoleTab(role)} 
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeRoleTab === role ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Permissions Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4 text-center">View</th>
                    <th className="px-6 py-4 text-center">Add / Edit</th>
                    <th className="px-6 py-4 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {permissionModules.map((module) => (
                    <tr key={module.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {module.label}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch 
                            enabled={rolePermissions?.[activeRoleTab]?.[module.id]?.view || false} 
                            onChange={() => handlePermissionToggle(activeRoleTab, module.id, 'view')} 
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch 
                            enabled={rolePermissions?.[activeRoleTab]?.[module.id]?.edit || false} 
                            onChange={() => handlePermissionToggle(activeRoleTab, module.id, 'edit')} 
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <ToggleSwitch 
                            enabled={rolePermissions?.[activeRoleTab]?.[module.id]?.delete || false} 
                            onChange={() => handlePermissionToggle(activeRoleTab, module.id, 'delete')} 
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
               <button onClick={handleSavePermissions} disabled={isSaving || isLoading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Permissions
              </button>
            </div>
          </div>
        );

      case 'dashboard-layout':
      case 'menu-layout':
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700 justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><LayoutTemplate className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Layout Configuration</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage interface preferences</p>
                </div>
              </div>
              <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex-wrap">
                <button onClick={() => setActiveLayoutTab('dashboard')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeLayoutTab === 'dashboard' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600' : 'text-gray-500'}`}>
                  <Monitor className="w-4 h-4" /> Dashboard Layout
                </button>
                <button onClick={() => setActiveLayoutTab('admin')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeLayoutTab === 'admin' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600' : 'text-gray-500'}`}>
                  <PanelLeft className="w-4 h-4" /> Admin Panel Layout
                </button>
                <button onClick={() => setActiveLayoutTab('menu')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${activeLayoutTab === 'menu' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600' : 'text-gray-500'}`}>
                  <Menu className="w-4 h-4" /> Menu Layout
                </button>
              </div>
            </div>

            {/* Dashboard Layout Tab */}
            {activeLayoutTab === 'dashboard' && dashboardConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Statistic Cards</h4>
                  <ToggleSwitch label="Total Students" enabled={dashboardConfig.stats_students} onChange={() => handleDashboardToggle('stats_students')} />
                  <ToggleSwitch label="Total Employees" enabled={dashboardConfig.stats_employees} onChange={() => handleDashboardToggle('stats_employees')} />
                  <ToggleSwitch label="Attendance Rate" enabled={dashboardConfig.stats_attendance} onChange={() => handleDashboardToggle('stats_attendance')} />
                  <ToggleSwitch label="Revenue" enabled={dashboardConfig.stats_revenue} onChange={() => handleDashboardToggle('stats_revenue')} />
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Charts & Graphs</h4>
                  <ToggleSwitch label="Attendance Chart" enabled={dashboardConfig.chart_attendance} onChange={() => handleDashboardToggle('chart_attendance')} />
                  <ToggleSwitch label="Demographics Pie" enabled={dashboardConfig.chart_demographics} onChange={() => handleDashboardToggle('chart_demographics')} />
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Lists & Feeds</h4>
                  <ToggleSwitch label="Recent Enrollments" enabled={dashboardConfig.recent_activity} onChange={() => handleDashboardToggle('recent_activity')} />
                </div>
              </div>
            )}

            {/* Admin Panel Layout Tab */}
            {activeLayoutTab === 'admin' && adminConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Sidebar</h4>
                   <ToggleSwitch label="Default Collapsed" enabled={adminConfig.sidebar_default_collapsed} onChange={() => handleAdminToggle('sidebar_default_collapsed')} />
                </div>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">General UI</h4>
                   <ToggleSwitch label="Compact Table Mode" enabled={adminConfig.table_compact_mode} onChange={() => handleAdminToggle('table_compact_mode')} />
                   <ToggleSwitch label="Enable Animations" enabled={adminConfig.enable_animations} onChange={() => handleAdminToggle('enable_animations')} />
                   <ToggleSwitch label="Show Breadcrumbs" enabled={adminConfig.show_breadcrumbs} onChange={() => handleAdminToggle('show_breadcrumbs')} />
                </div>
              </div>
            )}

            {/* Menu Layout Tab */}
            {activeLayoutTab === 'menu' && (
              <div className="animate-fade-in">
                <div className="space-y-4">
                  {menuLayout.map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <input value={item.label} onChange={(e) => handleMenuChange(index, 'label', e.target.value)} placeholder="Label" className="input-field" />
                        <input value={item.href || ''} onChange={(e) => handleMenuChange(index, 'href', e.target.value)} placeholder="Href (e.g., dashboard)" className="input-field" />
                        {renderIconPicker(
                          item.icon || '',
                          (iconName) => handleMenuChange(index, 'icon', iconName),
                          `main-${index}`
                        )}
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => addSubMenuItem(index)} className="p-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="Add Submenu"><Plus className="w-4 h-4" /></button>
                          <button onClick={() => removeMenuItem(index)} className="p-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Remove Item"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      {item.children && item.children.length > 0 && (
                        <div className="mt-4 pl-8 space-y-3">
                           {item.children.map((child, childIndex) => (
                            <div key={childIndex} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                              <input value={child.label} onChange={(e) => handleSubMenuChange(index, childIndex, 'label', e.target.value)} placeholder="Sub Label" className="input-field" />
                              <input value={child.href || ''} onChange={(e) => handleSubMenuChange(index, childIndex, 'href', e.target.value)} placeholder="Sub Href" className="input-field" />
                              {renderIconPicker(
                                child.icon || '',
                                (iconName) => handleSubMenuChange(index, childIndex, 'icon', iconName),
                                `sub-${index}-${childIndex}`
                              )}
                              <div className="flex justify-end">
                                <button onClick={() => removeSubMenuItem(index, childIndex)} className="p-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Remove Sub Item"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                           ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addMenuItem} className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center gap-2"><Plus className="w-4 h-4" /> Add Menu Item</button>
              </div>
            )}
            
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
               <button 
                  onClick={handleSaveLayout} 
                  disabled={isSaving || isLoading} 
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>}
                  {`Save ${activeLayoutTab.charAt(0).toUpperCase() + activeLayoutTab.slice(1)} Layout`}
                </button>
            </div>
          </div>
        );
      
      case 'system-student-field':
        // ... (rest of the file remains unchanged)
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><BookOpen className="w-5 h-5" /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">System Student Fields</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage dynamic options for classes, sections, and subjects.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Classes Card */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Layout className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Manage Classes</h4>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddField('classes')}
                    placeholder="Add new class..."
                    className="input-field flex-1"
                  />
                  <button onClick={() => handleAddField('classes')} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {studentFields.classes.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      <button onClick={() => handleRemoveField('classes', index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Sections Card */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Manage Sections</h4>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddField('sections')}
                    placeholder="Add new section..."
                    className="input-field flex-1"
                  />
                  <button onClick={() => handleAddField('sections')} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {studentFields.sections.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      <button onClick={() => handleRemoveField('sections', index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subjects Card */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Manage Subjects</h4>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddField('subjects')}
                    placeholder="Add new subject..."
                    className="input-field flex-1"
                  />
                  <button onClick={() => handleAddField('subjects')} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"><Plus className="w-5 h-5" /></button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {studentFields.subjects.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      <button onClick={() => handleRemoveField('subjects', index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
               <button onClick={handleSaveFields} disabled={isSaving || isLoading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20"><Save className="w-5 h-5" />Save Fields</button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
             <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
             <p>The "{activePage.replace(/-/g, ' ')}" module is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        renderContent()
      )}
       <style>{`
        .input-field { width: 100%; padding: 8px 12px; border-radius: 0.5rem; border: 1px solid #d1d5db; background-color: #fff; outline: none; transition: all 0.2s; }
        .dark .input-field { border-color: #4b5563; background-color: rgba(31, 41, 55, 1); color: white; }
        .input-field:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }
      `}</style>
    </div>
  );
};
