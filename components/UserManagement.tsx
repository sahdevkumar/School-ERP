
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Search, Plus, Loader2, Edit, Trash2, CheckCircle, XCircle, Camera, User, X, Save, FileText, Filter
} from 'lucide-react';
import { dbService, supabase } from '../services/supabase';
import { SystemUser, UserFieldConfig } from '../types';
import { useToast } from '../context/ToastContext';
import { ImageEditor } from './ImageEditor';

export const UserManagement: React.FC = () => {
  // ... state declarations ...
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState(''); // Role Filter State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<SystemUser>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [userTypes, setUserTypes] = useState<string[]>([]); // Dynamic user types from DB
  const [userFields, setUserFields] = useState<UserFieldConfig[]>([]); // Dynamic form fields
  
  // Access Control State
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentEmail, setCurrentEmail] = useState<string>('');

  const { showToast } = useToast();

  // ... (useEffect and fetch methods unchanged) ...
  useEffect(() => {
    fetchUsers();
    fetchUserConfig();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    
    // 1. Get Current Session User
    const { data: { session } } = await supabase.auth.getSession();
    let email = session?.user?.email;

    // DEV MODE: If no actual session, fallback to dev admin
    if (!email) {
        email = 'admin@dev.com';
    }
    setCurrentEmail(email || '');

    // 2. Fetch All System Users
    let data = await dbService.getSystemUsers();
    
    // 3. Determine Current User Role
    let myRole = 'Viewer';
    
    if (email === 'admin@dev.com') {
        myRole = 'Super Admin';
    } else {
        const myself = data.find(u => u.email === email);
        myRole = myself?.role || 'Viewer'; 
    }
    setCurrentUserRole(myRole);

    const isAdmin = ['Super Admin', 'Admin'].includes(myRole);
    if (!isAdmin && email) {
      data = data.filter(u => u.email === email);
    } else if (!isAdmin && !email) {
      data = []; 
    }

    setUsers(data);
    setIsLoading(false);
  };

  const fetchUserConfig = async () => {
    const config = await dbService.getUserConfiguration();
    setUserTypes(config.userTypes || []);
    setUserFields(config.userFields || []);
  };

  const handleOpenModal = (user?: SystemUser) => {
    if (user) {
      setEditingUser({
        ...user,
        custom_fields: user.custom_fields || {}
      });
      setPhotoPreview(user.avatar_url || null);
    } else {
      setEditingUser({
        full_name: '',
        email: '',
        role: '',
        status: 'active',
        custom_fields: {}
      });
      setPhotoPreview(null);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser.full_name?.trim()) {
      showToast("Full Name is required", 'error');
      return;
    }
    if (!editingUser.email?.trim()) {
      showToast("Email is required", 'error');
      return;
    }
    if (!editingUser.role) {
      showToast("Role is required", 'error');
      return;
    }

    if (userTypes.length > 0 && !userTypes.includes(editingUser.role)) {
      showToast(`Invalid role selected. '${editingUser.role}' is not a valid User Type.`, 'error');
      return;
    }

    for (const field of userFields) {
      if (field.required && (!editingUser.custom_fields || !editingUser.custom_fields[field.label])) {
        showToast(`${field.label} is required`, 'error');
        return;
      }
    }

    setIsSaving(true);
    let result;
    
    const payload = { ...editingUser };
    if (!payload.id) {
        delete payload.id;
    }

    if (editingUser.id) {
      result = await dbService.updateSystemUser(payload);
    } else {
      result = await dbService.createSystemUser(payload);
    }
    
    setIsSaving(false);
    if (result.success) {
      if (result.warning) {
        showToast(result.warning, 'info');
      } else {
        showToast(editingUser.id ? "User updated successfully" : "User created successfully");
      }
      setModalOpen(false);
      fetchUsers();
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to save: " + errorMsg, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const result = await dbService.deleteSystemUser(id);
    if (result.success) {
      showToast("User deleted");
      fetchUsers();
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to delete: " + errorMsg, 'error');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImageSrc(reader.result?.toString() || null);
        setIsEditorOpen(true);
      });
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleEditorSave = async (blob: Blob) => {
    setIsEditorOpen(false);
    const objectUrl = URL.createObjectURL(blob);
    setPhotoPreview(objectUrl);
    setIsUploadingPhoto(true);

    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    const result = await dbService.uploadSystemAsset(file, 'user-avatars');
    setIsUploadingPhoto(false);

    if (result.publicUrl) {
      setEditingUser(prev => ({ ...prev, avatar_url: result.publicUrl }));
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Photo upload failed: " + errorMsg, 'error');
    }
  };

  // ... (Rest of UI rendering code identical to existing) ...
  // ... (handleCustomFieldChange, renderCustomField, filteredUsers, etc.) ...
  
  const handleCustomFieldChange = (label: string, value: any) => {
    setEditingUser(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [label]: value
      }
    }));
  };

  const renderCustomField = (field: UserFieldConfig) => {
    const value = editingUser.custom_fields?.[field.label] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            rows={2}
          />
        );
      case 'select':
        const options = field.options ? field.options.split(',').map(o => o.trim()) : [];
        return (
          <select
            value={value}
            onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select {field.label}</option>
            {options.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );
      default:
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleCustomFieldChange(field.label, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        );
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole ? u.role === selectedRole : true;
    return matchesSearch && matchesRole;
  });

  const isAdminAccess = ['Super Admin', 'Admin'].includes(currentUserRole);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-8 h-8 text-indigo-600" /> User Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage system users, roles, and access.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
         <div className="flex gap-4 w-full sm:flex-1">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
            </div>
            <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <select 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="">All Roles</option>
                  {userTypes.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
            </div>
         </div>
         
         <div className="flex gap-2">
            {isAdminAccess && (
              <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap">
                  <Plus className="w-4 h-4"/> Add User
              </button>
            )}
         </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                          ) : (
                            user.full_name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {user.status === 'active' ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Inactive</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(user)} 
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" 
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isAdminAccess && (
                          <button 
                            onClick={() => handleDelete(user.id)} 
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" 
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                {editingUser.id ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="user-form" onSubmit={handleSave} className="space-y-5">
                
                <div className="flex justify-center mb-6">
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden border-2 border-dashed border-indigo-300 dark:border-indigo-700">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-indigo-400" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} disabled={isUploadingPhoto} />
                    </label>
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={editingUser.full_name} 
                      onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                      className="w-full pl-4 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address <span className="text-red-500">*</span></label>
                    <input 
                      type="email" 
                      value={editingUser.email} 
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      className="w-full pl-4 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
                      placeholder="john@example.com"
                      disabled={!!editingUser.id}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role <span className="text-red-500">*</span></label>
                    <select 
                      value={editingUser.role} 
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      disabled={!isAdminAccess}
                      className={`w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none ${!isAdminAccess ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Select Role</option>
                      {userTypes.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Account Status</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Toggle user access to the system</p>
                    </div>
                    <button 
                      type="button"
                      disabled={!isAdminAccess}
                      onClick={() => isAdminAccess && setEditingUser({...editingUser, status: editingUser.status === 'active' ? 'inactive' : 'active'})}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:ring-offset-gray-800 ${
                        editingUser.status === 'active' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                      } ${!isAdminAccess ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editingUser.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {userFields.length > 0 && (
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Additional Information</h4>
                      <div className="space-y-4">
                        {userFields.map(field => (
                          <div key={field.id} className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            {renderCustomField(field)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </form>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save User
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditorOpen && selectedImageSrc && (
        <ImageEditor 
          imageSrc={selectedImageSrc} 
          onClose={() => setIsEditorOpen(false)} 
          onSave={handleEditorSave} 
        />
      )}
    </div>
  );
};
