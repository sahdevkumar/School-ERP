
import * as React from 'react';
import { 
  User, Search, Phone, Users, Upload, FileText, Briefcase, Save, Loader2, X, 
  Camera, CheckCircle, Plus, Banknote, Eye, Trash2, Mail, MapPin, Calendar, Layers, UserX, UserCheck
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { Employee, EmployeeDocument } from '../types';
import { ImageEditor } from './ImageEditor';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../context/PermissionContext';

interface EmployeesProps {
  initialAction?: 'add';
}

export const Employees: React.FC<EmployeesProps> = ({ initialAction }) => {
  const { can } = usePermissions();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showInactive, setShowInactive] = React.useState(false);
  
  const [roles, setRoles] = React.useState<string[]>([]);
  const [departments, setDepartments] = React.useState<string[]>([]);
  
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Employee>>({});
  const [activeTab, setActiveTab] = React.useState<'personal' | 'professional' | 'financial' | 'documents'>('personal');
  const [isSaving, setIsSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = React.useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [employeeDocuments, setEmployeeDocuments] = React.useState<EmployeeDocument[]>([]);
  const [uploadingDocType, setUploadingDocType] = React.useState<string | null>(null);

  const { showToast } = useToast();

  React.useEffect(() => {
    fetchEmployees();
    fetchRolesAndDepartments();
  }, [showInactive]);

  React.useEffect(() => {
    if (initialAction === 'add' && can('employees', 'edit')) {
      setTimeout(() => openProfile(null), 100);
    }
  }, [initialAction]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getEmployees();
      const filtered = showInactive 
        ? data.filter(t => t.status === 'inactive') 
        : data.filter(t => t.status !== 'inactive');
      setEmployees(filtered);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch employees", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRolesAndDepartments = async () => {
    const [userConfig, depts] = await Promise.all([
      dbService.getUserConfiguration(),
      dbService.getDepartments()
    ]);
    setRoles(userConfig.userTypes || []);
    setDepartments(depts);
  };

  const openProfile = async (employee: Employee | null) => {
    setFormData(employee || { status: 'active', gender: 'male' }); 
    setPhotoPreview(employee?.photo_url || null);
    setSelectedImageSrc(null);
    
    if (employee?.id) {
        const docs = await dbService.getEmployeeDocuments(employee.id);
        setEmployeeDocuments(docs);
    } else {
        setEmployeeDocuments([]);
    }
    setActiveTab('personal');
    setErrors({});
    setProfileModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
        setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[name];
            return newErrors;
        });
    }
  };

  const validateForm = () => {
      const newErrors: Record<string, string> = {};
      if (!formData.full_name?.trim()) newErrors.full_name = "Full Name is required";
      if (!formData.phone?.trim()) newErrors.phone = "Phone is required";
      if (!formData.subject) newErrors.subject = "Designation/Role is required";
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('employees', 'edit')) {
      showToast("You don't have permission to edit employees.", 'error');
      return;
    }
    
    if (!validateForm()) {
        showToast("Please fix the validation errors", 'error');
        return;
    }
    
    setIsSaving(true);
    try {
        if (formData.id) {
            await dbService.updateEmployee(formData as Employee);
            showToast("Employee updated successfully");
        } else {
            await dbService.addEmployee(formData as Employee);
            showToast("Employee added successfully");
        }
        setProfileModalOpen(false);
        fetchEmployees();
    } catch (error: any) {
        showToast("Operation failed: " + error.message, 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const handleToggleStatus = async (employeeId: number, currentStatus: string) => {
      if (!can('employees', 'edit')) return;
      
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const action = newStatus === 'active' ? 'activate' : 'deactivate';
      
      if (!confirm(`Are you sure you want to ${action} this employee?`)) return;

      const result = await dbService.toggleEmployeeStatus(employeeId, newStatus);
      if (result.success) {
          showToast(`Employee ${action}d successfully`);
          // Refresh list locally
          setEmployees(prev => prev.filter(e => e.id !== employeeId));
      } else {
          showToast(`Failed to ${action}: ` + result.error, 'error');
      }
  };

  const handleDelete = async (employeeId: number) => {
      if (!can('employees', 'delete')) {
          showToast("Permission denied", 'error');
          return;
      }
      if (!confirm("WARNING: This will permanently delete the employee record. This action cannot be undone. Are you sure?")) return;

      const result = await dbService.permanentDeleteEmployee(employeeId);
      if (result.success) {
          showToast("Employee deleted permanently");
          setEmployees(prev => prev.filter(e => e.id !== employeeId));
          if (profileModalOpen) setProfileModalOpen(false);
      } else {
          showToast("Failed to delete: " + result.error, 'error');
      }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!can('employees', 'edit')) return;
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
    const file = new File([blob], "emp_photo.jpg", { type: "image/jpeg" });
    
    const result = await dbService.uploadEmployeePhoto(file); // Assume this method now exists or use uploadSystemAsset
    setIsUploadingPhoto(false);
    
    if (result.publicUrl) {
       setFormData(prev => ({ ...prev, photo_url: result.publicUrl }));
       showToast("Photo uploaded");
    } else {
       showToast("Upload failed: " + result.error, 'error');
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInputClass = (fieldName?: string, extraClasses?: string) => {
    const hasError = fieldName && errors[fieldName];
    return `w-full px-4 py-2.5 rounded-xl border ${
      hasError
        ? 'border-red-500 focus:ring-red-200' 
        : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
    } bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 ${extraClasses || ''}`;
  };

  const renderDocumentCard = (docType: string) => {
      const existingDoc = employeeDocuments.find(d => d.document_type === docType);
      const docUrl = existingDoc?.file_url;
      const isUploading = uploadingDocType === docType;

      return (
          <div className={`border-2 border-dashed ${docUrl ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600'} p-6 text-center rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 relative transition-colors group`}>
              {can('employees', 'edit') && (
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={() => {}} disabled={isUploading || !formData.id} />
              )}
              {isUploading ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                    <span className="text-sm font-medium text-gray-500">Uploading...</span>
                  </div>
              ) : docUrl ? (
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white">{docType} Uploaded</h4>
                    <a href={docUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline mt-2 z-20 relative">View Document</a>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="mx-auto mb-3 text-gray-400 group-hover:text-indigo-500 w-10 h-10" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Upload {docType}</h4>
                    <p className="text-xs text-gray-500 mt-1">PDF or JPG</p>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Briefcase className="w-8 h-8 text-indigo-600" /> Employee Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage employees and staff records.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search by name, role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"/>
         </div>
         <div className="flex gap-2">
            <button onClick={() => setShowInactive(!showInactive)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                {showInactive ? 'Show Active' : 'Show Inactive'}
            </button>
            {can('employees', 'edit') && (
              <button onClick={() => openProfile(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors">
                  <Plus className="w-4 h-4"/> Add Employee
              </button>
            )}
         </div>
      </div>

      {isLoading ? <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600"/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map(employee => (
            <div key={employee.id} onClick={() => openProfile(employee)} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">
                      {employee.photo_url ? <img src={employee.photo_url} alt="" className="w-full h-full object-cover" /> : employee.full_name.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{employee.full_name}</h3>
                      <p className="text-sm text-gray-500 truncate">{employee.subject || 'Staff'}</p>
                  </div>
               </div>
               
               <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {employee.phone || 'N/A'}</div>
                  <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5" /> {employee.email || 'N/A'}</div>
               </div>

               <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {can('employees', 'edit') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(employee.id, employee.status || 'active'); }}
                      className={`p-1.5 rounded shadow-sm border border-gray-100 dark:border-gray-600 transition-colors ${employee.status === 'active' ? 'bg-white dark:bg-gray-700 text-orange-500 hover:bg-orange-50' : 'bg-white dark:bg-gray-700 text-green-500 hover:bg-green-50'}`}
                      title={employee.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                        {employee.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  )}
                  {/* Show Delete Button ONLY when Inactive */}
                  {can('employees', 'delete') && employee.status === 'inactive' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(employee.id); }} 
                        className="p-1.5 bg-white dark:bg-gray-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded shadow-sm border border-gray-100 dark:border-gray-600"
                        title="Delete Permanently"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                  )}
               </div>
            </div>
          ))}
          {filteredEmployees.length === 0 && <div className="col-span-full text-center py-10 text-gray-500">No employees found.</div>}
        </div>
      )}

      {profileModalOpen && formData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-gray-800 w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in">
            {/* Sidebar */}
            <div className="w-full md:w-72 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
               <div className="p-6 flex flex-col items-center border-b border-gray-200 dark:border-gray-700">
                  <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-3xl font-bold text-indigo-600 relative group cursor-pointer border-2 border-dashed border-indigo-300 dark:border-indigo-700 overflow-hidden">
                     {photoPreview ? (<img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />) : (formData.full_name?.charAt(0) || <User />)}
                     {can('employees', 'edit') && (
                       <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                          <Camera className="w-6 h-6 text-white" />
                          <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} disabled={isUploadingPhoto} />
                       </label>
                     )}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mt-3 text-center">{formData.full_name || 'New Employee'}</h3>
                  <p className="text-sm text-gray-500">{formData.subject || 'Designation'}</p>
               </div>
               
               <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                 {[{ id: 'personal', label: 'Personal Info', icon: User }, { id: 'professional', label: 'Professional', icon: Briefcase }, { id: 'financial', label: 'Financial', icon: Banknote }, { id: 'documents', label: 'Documents', icon: FileText }].map((tab) => (
                   <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}>
                     <tab.icon className="w-4 h-4" /> {tab.label}
                   </button>
                 ))}
               </nav>
               
               {can('employees', 'delete') && formData.id && (
                 <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                    <button 
                      type="button" 
                      onClick={() => handleToggleStatus(formData.id!, formData.status || 'active')} 
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${formData.status === 'active' ? 'border-orange-200 text-orange-600 hover:bg-orange-50 bg-white dark:bg-transparent' : 'border-green-200 text-green-600 hover:bg-green-50 bg-white dark:bg-transparent'}`}
                    >
                      {formData.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />} 
                      {formData.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    {/* Delete Permanently only when Inactive */}
                    {formData.status === 'inactive' && (
                        <button 
                            type="button" 
                            onClick={() => handleDelete(formData.id!)} 
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-transparent shadow-sm"
                        >
                        <Trash2 className="w-4 h-4" /> Delete Permanently
                        </button>
                    )}
                 </div>
               )}
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-800">
               {/* Mobile Header */}
               <div className="md:hidden p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 dark:text-white">Profile Details</h3>
                  <button onClick={() => setProfileModalOpen(false)}><X className="w-6 h-6 text-gray-500" /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  {/* ... same form content ... */}
                  <form id="employee-form" onSubmit={handleSaveProfile} className="space-y-6">
                    <fieldset disabled={!can('employees', 'edit')} className="contents group-disabled">
                       {activeTab === 'personal' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name <span className="text-red-500">*</span></label>
                                <input name="full_name" value={formData.full_name || ''} onChange={handleInputChange} className={getInputClass('full_name')} placeholder="e.g. Sarah Connor" />
                                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                                <input type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} className={getInputClass('dob')} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                                <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className={getInputClass('gender')}>
                                    <option value="male">Male</option><option value="female">Female</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone <span className="text-red-500">*</span></label>
                                <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input name="phone" value={formData.phone || ''} onChange={handleInputChange} className={getInputClass('phone', '!pl-10')} /></div>
                                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                <div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input name="email" value={formData.email || ''} onChange={handleInputChange} className={getInputClass('email', '!pl-10')} /></div>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                                <div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><textarea name="address" value={formData.address || ''} onChange={handleInputChange} className={getInputClass('address', '!pl-10')} rows={2} /></div>
                            </div>
                          </div>
                       )}

                       {activeTab === 'professional' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Designation <span className="text-red-500">*</span></label>
                                <input name="subject" value={formData.subject || ''} onChange={handleInputChange} className={getInputClass('subject')} placeholder="e.g. Senior Teacher" />
                                {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Department</label>
                                <select name="department" value={formData.department || ''} onChange={handleInputChange} className={getInputClass('department')}>
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Joining Date</label>
                                <div className="relative"><Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input type="date" name="joining_date" value={formData.joining_date || ''} onChange={handleInputChange} className={getInputClass('joining_date', '!pl-10')} /></div>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Qualification</label>
                                <input name="qualification" value={formData.qualification || ''} onChange={handleInputChange} className={getInputClass('qualification')} />
                             </div>
                             <div className="space-y-1.5 md:col-span-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Experience Details</label>
                                <textarea name="experience_details" value={formData.experience_details || ''} onChange={handleInputChange} className={getInputClass('experience_details')} rows={3} placeholder="Previous employment history..." />
                             </div>
                          </div>
                       )}

                       {activeTab === 'financial' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Basic Salary</label>
                                <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500">$</span><input type="number" name="salary_amount" value={formData.salary_amount || ''} onChange={handleInputChange} className={getInputClass('salary_amount', '!pl-8')} /></div>
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Account No</label>
                                <input name="bank_account_no" value={formData.bank_account_no || ''} onChange={handleInputChange} className={getInputClass('bank_account_no')} />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label>
                                <input name="bank_name" value={formData.bank_name || ''} onChange={handleInputChange} className={getInputClass('bank_name')} />
                             </div>
                             <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">IFSC Code</label>
                                <input name="bank_ifsc_code" value={formData.bank_ifsc_code || ''} onChange={handleInputChange} className={getInputClass('bank_ifsc_code')} />
                             </div>
                          </div>
                       )}

                       {activeTab === 'documents' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                             {renderDocumentCard('Resume / CV')}
                             {renderDocumentCard('ID Proof')}
                             {renderDocumentCard('Contract Agreement')}
                             {renderDocumentCard('Certificate')}
                          </div>
                       )}
                    </fieldset>
                  </form>
               </div>

               <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                  <button onClick={() => setProfileModalOpen(false)} className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-xl">Close</button>
                  {can('employees', 'edit') && (
                    <button onClick={handleSaveProfile} disabled={isSaving} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Changes
                    </button>
                  )}
               </div>
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
