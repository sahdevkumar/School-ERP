import * as React from 'react';
import { 
  User, Search, Phone, Users, Upload, FileText, Briefcase, Save, Loader2, X, 
  Camera, CheckCircle, Plus, Banknote, Eye, Trash2, Mail, MapPin, Calendar, Layers, UserX, UserCheck,
  LayoutGrid, List, Image as ImageIcon, Settings2, Download, FileSpreadsheet, File as FileIcon, Table as TableIcon, Edit, ExternalLink, BookOpen, TrendingUp, Clock, AlertCircle, ReceiptText,
  DollarSign, ArrowLeft, Fingerprint, Wallet, History, CreditCard, ChevronRight
} from 'lucide-react';
import { dbService, SalaryConfigEntry } from '../services/supabase';
import { Employee, EmployeeDocument, EmployeeSalaryPayment } from '../types';
import { ImageEditor } from './ImageEditor';
import { compressImageFile } from '../utils/imageProcessor';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../context/PermissionContext';
import { useSettings } from '../context/SettingsContext';
import { exportData } from '../utils/exportUtils';
import { formatDate } from '../utils/dateFormatter';

interface EmployeesProps {
  initialAction?: 'add';
  onNavigate?: (page: string) => void;
}

export const Employees: React.FC<EmployeesProps> = ({ initialAction, onNavigate }) => {
  const { can } = usePermissions();
  // Added currencyCode to the destructuring of useSettings to fix line 696 error
  const { currencySymbol, currencyCode } = useSettings();
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showInactive, setShowInactive] = React.useState(false);
  
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'thumbnail'>('grid');
  
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [designations, setDesignations] = React.useState<string[]>([]);
  const [subjects, setSubjects] = React.useState<string[]>([]);
  const [salaryRoles, setSalaryRoles] = React.useState<string[]>([]);
  const [globalSalaryConfigs, setGlobalSalaryConfigs] = React.useState<SalaryConfigEntry[]>([]);
  
  // View Toggle State
  const [isProfileViewActive, setIsProfileViewActive] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Employee>>({});
  const [activeTab, setActiveTab] = React.useState<'personal' | 'professional' | 'financial' | 'ledger' | 'documents'>('personal');
  const [isSaving, setIsSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = React.useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [employeeDocuments, setEmployeeDocuments] = React.useState<EmployeeDocument[]>([]);
  const [uploadingDocType, setUploadingDocType] = React.useState<string | null>(null);

  // New State for Payment History (Passbook)
  const [paymentHistory, setPaymentHistory] = React.useState<EmployeeSalaryPayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  const { showToast } = useToast();

  React.useEffect(() => {
    fetchEmployees();
    fetchRolesAndDepartments();
  }, [showInactive]);

  React.useEffect(() => {
    if (initialAction === 'add' && can('employees', 'edit')) {
      handleOpenProfile(null);
    }
  }, [initialAction]);

  // Effect to auto-populate Base Salary on the Professional Tab
  React.useEffect(() => {
    if (isProfileViewActive && activeTab === 'professional' && formData.department && formData.level && formData.salary_frequency) {
        const match = globalSalaryConfigs.find(c => 
            c.department === formData.department && 
            c.level === formData.level &&
            c.frequency === formData.salary_frequency
        );
        
        if (match) {
            setFormData(prev => ({ ...prev, salary_amount: match.amount }));
        }
    }
  }, [formData.department, formData.level, formData.salary_frequency, activeTab, globalSalaryConfigs, isProfileViewActive]);

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
    const [depts, desigs, fields, sRoles, sConfigs] = await Promise.all([
      dbService.getDepartments(),
      dbService.getDesignations(),
      dbService.getStudentFields(),
      dbService.getSalaryRoles(),
      dbService.getSalaryConfigs()
    ]);
    setDepartments(depts || []);
    setDesignations(desigs || []);
    setSubjects(fields.subjects || []);
    setSalaryRoles(sRoles || []);
    setGlobalSalaryConfigs(sConfigs || []);
  };

  const handleOpenProfile = async (employee: Employee | null) => {
    setFormData(employee || { status: 'active', gender: 'male', salary_frequency: 'Monthly', custom_fields: {} }); 
    setPhotoPreview(employee?.photo_url || null);
    setSelectedImageSrc(null);
    
    if (employee?.id) {
        setIsLoadingHistory(true);
        const [docs, history] = await Promise.all([
            dbService.getEmployeeDocuments(employee.id),
            dbService.getEmployeePayments(employee.id)
        ]);
        setEmployeeDocuments(docs);
        setPaymentHistory(history);
        setIsLoadingHistory(false);
    } else {
        setEmployeeDocuments([]);
        setPaymentHistory([]);
    }
    
    setActiveTab('personal');
    setErrors({});
    setIsProfileViewActive(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setIsProfileViewActive(false);
    setFormData({});
    setPhotoPreview(null);
    fetchEmployees();
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
        let result;
        if (formData.id) {
            result = await dbService.updateEmployee(formData as Employee);
        } else {
            result = await dbService.addEmployee(formData as Employee);
        }
        
        if (result.success) {
            showToast(formData.id ? "Employee updated successfully" : "Employee added successfully");
            handleBackToList();
        } else {
            const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
            showToast("Operation failed: " + errorMsg, 'error');
        }
    } catch (error: any) {
        const errorMsg = typeof error?.message === 'string' ? error.message : String(error);
        showToast("Operation failed: " + errorMsg, 'error');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (employeeId: number) => {
      if (!can('employees', 'delete')) return;
      if (!confirm("Permanently delete this record?")) return;
      const result = await dbService.permanentDeleteEmployee(employeeId);
      if (result.success) {
          showToast("Deleted permanently");
          setEmployees(prev => prev.filter(e => e.id !== employeeId));
          if (isProfileViewActive) handleBackToList();
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
    setIsUploadingPhoto(true);
    const file = new File([blob], "emp_photo.jpg", { type: "image/jpeg" });
    const result = await dbService.uploadEmployeePhoto(file);
    setIsUploadingPhoto(false);
    if (result.publicUrl) {
      setPhotoPreview(URL.createObjectURL(blob));
      setFormData(prev => ({ ...prev, photo_url: result.publicUrl }));
    }
  };

  const handleDocumentUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!can('employees', 'edit')) {
      showToast("You don't have permission to upload documents.", 'error');
      return;
    }
    const file = e.target.files?.[0];
    if (!file || !formData?.id) return;
    setUploadingDocType(docType);
    try {
      const compressedFile = await compressImageFile(file);
      const result = await dbService.uploadEmployeeDocument(compressedFile, formData.id, docType);
      if (result.success) {
        const docs = await dbService.getEmployeeDocuments(formData.id);
        setEmployeeDocuments(docs);
        showToast(`${docType} uploaded successfully!`);
      } else {
        const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
        showToast("Upload failed: " + errorMsg, 'error');
      }
    } catch (error) {
      console.error(error);
      showToast("An unexpected error occurred during upload.", 'error');
    } finally {
      setUploadingDocType(null);
      e.target.value = '';
    }
  };

  const renderDocumentCard = (docType: string) => {
    const existingDoc = employeeDocuments.find(d => d.document_type === docType);
    const docUrl = existingDoc?.file_url;
    const isUploading = uploadingDocType === docType;
    return (
      <div className={`border-2 border-dashed ${docUrl ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600'} p-6 text-center rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 relative transition-colors group`}>
        {can('employees', 'edit') && (
          <input 
            type="file" 
            accept="image/*,application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={(e) => handleDocumentUpload(docType, e)}
            disabled={isUploading}
          />
        )}
        
        {isUploading ? (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-2" />
            <span className="text-sm font-medium text-gray-500">Compressing & Uploading...</span>
          </div>
        ) : docUrl ? (
           <div className="flex flex-col items-center justify-center">
             <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
             <h4 className="font-medium text-gray-900 dark:text-white">{docType}</h4>
             <div className="flex gap-2 mt-2 z-20">
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <Eye className="w-3 h-3" /> View
                </a>
                {can('employees', 'edit') && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-indigo-600">Click box to replace</span>
                  </>
                )}
             </div>
           </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Upload className="mx-auto mb-3 text-gray-400 group-hover:text-indigo-500 w-10 h-10" />
            <h4 className="font-medium text-gray-900 dark:text-white">Upload {docType}</h4>
            <p className="text-xs text-gray-500 mt-1">{can('employees', 'edit') ? 'PDF or JPG' : 'No document'}</p>
          </div>
        )}
      </div>
    );
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

  // Render List View
  if (!isProfileViewActive) {
    return (
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-indigo-600" /> Employee Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage employees and staff records.</p>
          </div>
          {can('employees', 'edit') && (
            <button onClick={() => handleOpenProfile(null)} className="w-full md:auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                <Plus className="w-5 h-5"/> Add Employee
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col xl:flex-row gap-4 justify-between items-center">
           <div className="relative w-full xl:w-96">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Search by name, role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"/>
           </div>
           <div className="flex items-center gap-2 flex-wrap justify-end w-full xl:w-auto">
              <div className="bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg flex items-center">
                 <button onClick={() => setShowInactive(false)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!showInactive ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>Active</button>
                 <button onClick={() => setShowInactive(true)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${showInactive ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>Inactive</button>
              </div>

              <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}><List className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('thumbnail')} className={`p-2 rounded-md transition-all ${viewMode === 'thumbnail' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}><ImageIcon className="w-4 h-4" /></button>
              </div>
           </div>
        </div>

        {isLoading ? <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600"/></div> : 
          filteredEmployees.length === 0 ? <div className="col-span-full text-center py-10 text-gray-500">No employees found.</div> : (
          viewMode === 'list' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                           <th className="px-6 py-4 w-24">ID</th>
                           <th className="px-6 py-4">Employee Profile</th>
                           <th className="px-6 py-4">Designation</th>
                           <th className="px-6 py-4">Contact</th>
                           <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredEmployees.map((employee) => (
                           <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer" onClick={() => handleOpenProfile(employee)}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 align-top">#{employee.id}</td>
                              <td className="px-6 py-4">
                                 <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                      {employee.photo_url ? (<img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />) : (employee.full_name.charAt(0))}
                                    </div>
                                    <div>
                                       <div className="font-bold text-gray-900 dark:text-white text-sm">{employee.full_name}</div>
                                       <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{employee.gender || 'N/A'}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 align-top">
                                <div className="text-sm text-gray-900 dark:text-gray-200">{employee.subject || 'Staff'}</div>
                                {employee.department && <div className="text-xs text-gray-500">{employee.department}</div>}
                              </td>
                              <td className="px-6 py-4 align-top">
                                 <div className="text-xs text-gray-600 dark:text-gray-400">{employee.phone || 'N/A'}</div>
                                 <div className="text-xs text-gray-600 dark:text-gray-400">{employee.email || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
                                 <div className="flex items-center justify-end gap-2">
                                   <button onClick={() => handleOpenProfile(employee)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                                     {can('employees', 'edit') ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                   </button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 ${viewMode === 'thumbnail' ? 'lg:grid-cols-4 xl:grid-cols-5' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-6`}>
              {filteredEmployees.map(employee => (
                <div key={employee.id} onClick={() => handleOpenProfile(employee)} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden ${viewMode === 'thumbnail' ? 'p-4' : 'p-6'}`}>
                   <div className={`flex items-center gap-4 ${viewMode === 'thumbnail' ? 'flex-col text-center' : 'mb-4'}`}>
                      <div className={`${viewMode === 'thumbnail' ? 'w-20 h-20 text-2xl' : 'w-14 h-14 text-xl'} rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105`}>
                          {employee.photo_url ? <img src={employee.photo_url} alt="" className="w-full h-full object-cover" /> : employee.full_name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                          <h3 className={`font-bold text-gray-900 dark:text-white truncate ${viewMode === 'thumbnail' ? 'text-sm' : ''}`}>{employee.full_name}</h3>
                          <p className="text-sm text-gray-500 truncate">{employee.subject || 'Staff'}</p>
                      </div>
                   </div>
                   {viewMode !== 'thumbnail' && (
                     <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {employee.phone || 'N/A'}</div>
                        <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5" /> {employee.email || 'N/A'}</div>
                     </div>
                   )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    );
  }

  // Render Full-Screen Profile View Directly in Content Area
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-24">
        {/* Header with Back Button (Fixed at Top) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleBackToList}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500"
                    title="Back to List"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formData.id ? 'Employee Profile' : 'Add New Employee'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage individual staff data and records.
                    </p>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
            {/* Top Navigation Row */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                {/* Profile Summary Section */}
                <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-4xl font-bold text-indigo-600 relative group cursor-pointer border-2 border-dashed border-indigo-300 dark:border-indigo-700 overflow-hidden shadow-sm">
                        {photoPreview ? (<img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />) : (formData.full_name?.charAt(0) || <User />)}
                        {can('employees', 'edit') && (
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                            <Camera className="w-6 h-6 text-white" />
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} disabled={isUploadingPhoto} />
                        </label>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left mb-2">
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white">{formData.full_name || 'New Employee'}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mt-2">
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-800">
                                {formData.subject || 'Designation Not Set'}
                            </span>
                            <span className="text-gray-400">•</span>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${formData.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{formData.status}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Horizontal Tab List - Mobile Optimized: only active tab shows text */}
                <nav className="flex items-center gap-1 px-4 md:px-8 border-t border-gray-200 dark:border-gray-700 overflow-x-auto custom-scrollbar bg-white dark:bg-gray-800/50">
                    {[
                        { id: 'personal', label: 'Personal', icon: User },
                        { id: 'professional', label: 'Professional', icon: Briefcase },
                        { id: 'ledger', label: 'Ledger', icon: ReceiptText },
                        { id: 'financial', label: 'Financial', icon: Banknote },
                        { id: 'documents', label: 'Documents', icon: FileText }
                    ].map((tab) => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap
                                ${activeTab === tab.id 
                                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                        >
                            <tab.icon className="w-4 h-4 shrink-0" /> 
                            <span className={`${activeTab === tab.id ? 'inline' : 'hidden lg:inline'}`}>
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Tab Content */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
               <div className="flex-1 p-6 md:p-10 pb-20">
                    <form onSubmit={e => e.preventDefault()} className="max-w-4xl">
                        {activeTab === 'personal' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Full Name <span className="text-red-500">*</span></label>
                                    <input name="full_name" value={formData.full_name || ''} onChange={handleInputChange} className={getInputClass('full_name')} placeholder="Full Name" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Phone <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <input name="phone" value={formData.phone || ''} onChange={handleInputChange} className={getInputClass('phone', '!pl-10')} placeholder="10-digit number" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <input name="email" value={formData.email || ''} onChange={handleInputChange} className={getInputClass('email', '!pl-10')} placeholder="email@example.com" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Date of Birth</label>
                                    <input type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} className={getInputClass('dob')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Gender</label>
                                    <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className={getInputClass('gender')}>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Aadhar Card Number</label>
                                    <div className="relative">
                                        <Fingerprint className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <input name="aadhar_no" value={formData.aadhar_no || ''} onChange={handleInputChange} className={getInputClass('aadhar_no', '!pl-10')} placeholder="12-digit UID" maxLength={12} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Blood Group</label>
                                    <select name="blood_group" value={formData.blood_group || ''} onChange={handleInputChange} className={getInputClass('blood_group')}>
                                        <option value="">Select Group</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Residential Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                        <textarea name="address" value={formData.address || ''} onChange={handleInputChange} className={getInputClass('address', '!pl-10')} rows={3} placeholder="Full address..." />
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'professional' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Employee Type</label>
                                    <select name="employee_type" value={formData.employee_type || ''} onChange={handleInputChange} className={getInputClass('employee_type')}>
                                        <option value="">Select Type</option>
                                        <option value="Academic">Academic</option>
                                        <option value="Non-Academic">Non-Academic</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Designation (Role)</label>
                                    <select name="subject" value={formData.subject || ''} onChange={handleInputChange} className={getInputClass('subject')}>
                                        <option value="">Select Designation</option>
                                        {designations.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                {formData.employee_type === 'Academic' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black uppercase tracking-widest text-gray-400">Primary Subject</label>
                                        <select name="academic_subject" value={formData.academic_subject || ''} onChange={handleInputChange} className={getInputClass('academic_subject')}>
                                            <option value="">Select Subject</option>
                                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Department</label>
                                    <select name="department" value={formData.department || ''} onChange={handleInputChange} className={getInputClass('department')}>
                                        <option value="">Select Department</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Salary Role</label>
                                    <div className="relative">
                                        <Wallet className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <select name="salary_role" value={formData.salary_role || ''} onChange={handleInputChange} className={getInputClass('salary_role', '!pl-10')}>
                                            <option value="">Select Salary Role</option>
                                            {salaryRoles.map(role => <option key={role} value={role}>{role}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Seniority Level</label>
                                    <select name="level" value={formData.level || ''} onChange={handleInputChange} className={getInputClass('level')}>
                                        <option value="">Select Level</option>
                                        <option value="Senior">Senior</option>
                                        <option value="Junior">Junior</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Salary Frequency</label>
                                    <select name="salary_frequency" value={formData.salary_frequency || ''} onChange={handleInputChange} className={getInputClass('salary_frequency')}>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Yearly">Yearly</option>
                                        <option value="Daily">Daily</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Base Salary Amount</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 h-4 w-4 text-gray-400 flex items-center justify-center font-bold text-sm">{currencySymbol}</div>
                                        <input type="number" name="salary_amount" value={formData.salary_amount || 0} onChange={handleInputChange} className={getInputClass('salary_amount', '!pl-10')} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Joining Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <input type="date" name="joining_date" value={formData.joining_date || ''} onChange={handleInputChange} className={getInputClass('joining_date', '!pl-10')} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Experience (Years)</label>
                                    <input name="total_experience" value={formData.total_experience || ''} onChange={handleInputChange} className={getInputClass('total_experience')} placeholder="e.g. 5 Years" />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Highest Qualification</label>
                                    <input name="qualification" value={formData.qualification || ''} onChange={handleInputChange} className={getInputClass('qualification')} placeholder="e.g. Masters in Science" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'ledger' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <History className="w-6 h-6 text-indigo-600" /> Salary Passbook
                                    </h3>
                                    <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-lg border border-indigo-100 dark:border-indigo-800">
                                        {paymentHistory.length} Recorded Transactions
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                                    <th className="px-6 py-4">Trans. Date</th>
                                                    <th className="px-6 py-4">Salary Cycle</th>
                                                    <th className="px-6 py-4">Credit ({currencyCode})</th>
                                                    <th className="px-6 py-4">Method</th>
                                                    <th className="px-6 py-4">Ref/Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {isLoadingHistory ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-20 text-center">
                                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
                                                            <p className="mt-2 text-sm text-gray-400">Fetching passbook records...</p>
                                                        </td>
                                                    </tr>
                                                ) : paymentHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-20 text-center">
                                                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                                                                <CreditCard className="w-8 h-8 text-gray-300" />
                                                            </div>
                                                            <p className="text-gray-400 text-sm font-bold italic">No payment history found in database.</p>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paymentHistory.map((pay) => (
                                                        <tr key={pay.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatDate(pay.payment_date)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm font-medium text-gray-500">
                                                                    {new Date(pay.payment_for_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-base font-black text-green-600">
                                                                    +{currencySymbol}{pay.amount_paid?.toLocaleString()}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-[10px] font-black uppercase">
                                                                    {pay.payment_mode}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="max-w-[200px] truncate text-xs text-gray-400" title={pay.notes}>
                                                                    {pay.notes || '-'}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End of Passbook</span>
                                        <button 
                                            type="button" 
                                            onClick={() => formData.id && dbService.getEmployeePayments(formData.id).then(setPaymentHistory)}
                                            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                        >
                                            <History className="w-3 h-3" /> Refresh Records
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'financial' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Bank Name</label>
                                    <input name="bank_name" value={formData.bank_name || ''} onChange={handleInputChange} className={getInputClass('bank_name')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Account Number</label>
                                    <input name="bank_account_no" value={formData.bank_account_no || ''} onChange={handleInputChange} className={getInputClass('bank_account_no')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">IFSC Code</label>
                                    <input name="bank_ifsc_code" value={formData.bank_ifsc_code || ''} onChange={handleInputChange} className={getInputClass('bank_ifsc_code')} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black uppercase tracking-widest text-gray-400">Account Holder</label>
                                    <input name="account_holder_name" value={formData.account_holder_name || ''} onChange={handleInputChange} className={getInputClass('account_holder_name')} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 animate-fade-in">
                                {['National ID', 'Degree Certificate', 'Offer Letter', 'Contract'].map(doc => (
                                    <div key={doc}>
                                        {renderDocumentCard(doc)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </form>
               </div>

                {/* Bottom Global Action Bar */}
                <div className="sticky bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-700 p-4 md:p-6 flex flex-wrap items-center justify-end gap-3 z-30">
                    {formData.id && can('employees', 'delete') && (
                        <button 
                            onClick={() => handleDelete(formData.id!)}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-red-600 border border-red-100 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> 
                            <span className="hidden sm:inline">Delete Account</span>
                        </button>
                    )}
                    <button 
                        onClick={handleBackToList} 
                        className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    {can('employees', 'edit') && (
                        <button 
                            onClick={handleSaveProfile} 
                            disabled={isSaving} 
                            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
                            Save Changes
                        </button>
                    )}
                </div>
            </div>
        </div>

        {isEditorOpen && selectedImageSrc && (
            <ImageEditor imageSrc={selectedImageSrc} onClose={() => setIsEditorOpen(false)} onSave={handleEditorSave} />
        )}
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { height: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; }
        `}</style>
    </div>
  );
};