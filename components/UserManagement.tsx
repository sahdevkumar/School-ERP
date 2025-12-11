
import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Search, Plus, Loader2, Edit, Trash2, CheckCircle, XCircle, Camera, User, X, Save
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { SystemUser } from '../types';
import { useToast } from '../context/ToastContext';
import { ImageEditor } from './ImageEditor';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<SystemUser>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await dbService.getSystemUsers();
    setUsers(data);
    setIsLoading(false);
  };

  const handleOpenModal = (user?: SystemUser) => {
    if (user) {
      setEditingUser(user);
      setPhotoPreview(user.avatar_url || null);
    } else {
      setEditingUser({
        full_name: '',
        email: '',
        role: 'Viewer',
        status: 'active'
      });
      setPhotoPreview(null);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.full_name || !editingUser.email) {
      showToast("Name and Email are required", 'error');
      return;
    }

    setIsSaving(true);
    let result;
    if (editingUser.id) {
      result = await dbService.updateSystemUser(editingUser);
    } else {
      result = await dbService.createSystemUser(editingUser);
    }
    
    setIsSaving(false);
    if (result.success) {
      showToast(editingUser.id ? "User updated" : "User created");
      setModalOpen(false);
      fetchUsers();
    } else {
      showToast("Failed to save: " + result.error, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const result = await dbService.deleteSystemUser(id);
    if (result.success) {
      showToast("User deleted");
      fetchUsers();
    } else {
      showToast("Failed to delete", 'error');
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
      showToast("Photo upload failed: " + result.error, 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-8 h-8 text-indigo-600" /> User Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage system administrators and staff access.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors">
          <Plus className="w-4 h-4"/> Add User
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 flex flex-col items-center text-center flex-1">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4 overflow-hidden border-2 border-white dark:border-gray-600 shadow-md">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">{user.full_name.charAt(0)}</div>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{user.full_name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{user.email}</p>
                <div className="flex gap-2 mb-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    user.role === 'Super Admin' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                    user.role === 'Admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' :
                    'bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                  }`}>
                    {user.role}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    user.status === 'active' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                    'bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
              <div className="flex border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => handleOpenModal(user)} className="flex-1 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-center gap-2 border-r border-gray-100 dark:border-gray-700">
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => handleDelete(user.id)} className="flex-1 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {editingUser.id ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="flex justify-center mb-6">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-gray-400" />}
                  </div>
                  <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} disabled={isUploadingPhoto} />
                  </label>
                  {isUploadingPhoto && <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center rounded-full"><Loader2 className="w-6 h-6 animate-spin text-indigo-600"/></div>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <input 
                  value={editingUser.full_name || ''} 
                  onChange={e => setEditingUser({...editingUser, full_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                <input 
                  type="email"
                  value={editingUser.email || ''} 
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                  <select 
                    value={editingUser.role} 
                    onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Viewer">Viewer</option>
                    <option value="Editor">Editor</option>
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <select 
                    value={editingUser.status} 
                    onChange={e => setEditingUser({...editingUser, status: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSaving || isUploadingPhoto} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditorOpen && selectedImageSrc && (
        <ImageEditor imageSrc={selectedImageSrc} onClose={() => setIsEditorOpen(false)} onSave={handleEditorSave} />
      )}
    </div>
  );
};
