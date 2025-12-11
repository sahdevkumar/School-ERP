
import * as React from 'react';
import { 
  User, Search, Phone, Users, Upload, FileText, Briefcase, Save, Loader2, X, 
  Camera, CheckCircle, Plus, Banknote, Eye, ChevronDown
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { Employee, EmployeeDocument } from '../types';
import { ImageEditor } from './ImageEditor';
import { compressImageFile } from '../utils/imageProcessor';
import { useToast } from '../context/ToastContext';

interface EmployeesProps {
  initialAction?: 'add';
}

export const Employees: React.FC<EmployeesProps> = ({ initialAction }) => {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showInactive, setShowInactive] = React.useState(false);
  
  // Core System: Dynamic Options
  const [designations, setDesignations] = React.useState<string[]>([]);
  
  // Modal State
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Employee>>({});
  const [activeTab, setActiveTab] = React.useState<'personal' | 'financial' | 'documents'>('personal');
  const [isSaving, setIsSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  
  // Upload State
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = React.useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [employeeDocuments, setEmployeeDocuments] = React.useState<EmployeeDocument[]>([]);
  const [uploadingDocType, setUploadingDocType] = React.useState<string | null>(null);

  // Status Toggle Modal
  const [statusToggleModalOpen, setStatusToggleModalOpen] = React.useState(false);
  const [employeeToToggle, setEmployeeToToggle] = React.useState<Employee | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = React.useState(false);

  const { showToast } = useToast();

  const initialFormState: Partial<Employee> = {
    full_name: '', gender: 'male', dob: '', phone: '', email: '', address: '', 
    qualification: '', subject: '', joining_date: new Date().toISOString().split('T')[0], 
    photo_url: '', status: 'active',
    bank_name: '', bank_account_no: '', bank_ifsc_code: '', bank_branch_name: '', 
    account_holder_name: '', upi_id: '', salary_amount: 0
  };

  React.useEffect(() => {
    fetchEmployees();
    fetchDesignations();
  }, [showInactive]);

  React.useEffect(() => {
    if (initialAction === 'add') {
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

  const fetchDesignations = async () => {
    const data = await dbService.getDesignations();
    setDesignations(data);
  };

  const openProfile = async (employee: Employee | null) => {
    setFormData(employee || initialFormState);
    setPhotoPreview(employee?.photo_url || null);
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
            const newErr = { ...prev };
            delete newErr[name];
            return newErr;
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
    if (!validateForm()) {
        showToast("Please check the form for errors", 'error');
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

    const file = new File([blob], "profile_photo.jpg", { type: "image/jpeg" });
    try {
        const result = await dbService.uploadSystemAsset(file, 'employee-photos'); 
        if (result.publicUrl) {
            setFormData(prev => ({ ...prev, photo_url: result.publicUrl }));
            showToast("Photo uploaded");
        } else {
            showToast("Upload failed: " + result.error, 'error');
        }
    } catch (e: any) {
        showToast("Error: " + e.message, 'error');
    } finally {
        setIsUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
        showToast("Upload failed: " + result.error, 'error');
      }
    } catch (error: any) {
      showToast("Error: " + error.message, 'error');
    } finally {
      setUploadingDocType(null);
      e.target.value = '';
    }
  };

  const initiateStatusToggle = (employee: Employee) => {
      setEmployeeToToggle(employee);
      setStatusToggleModalOpen(true);
  };

  const confirmStatusToggle = async () => {
      if (!employeeToToggle) return;
      setIsTogglingStatus(true);
      try {
          const newStatus = employeeToToggle.status === 'active' ? 'inactive' : 'active';
          await dbService.updateEmployee({ ...employeeToToggle, status: newStatus });
          setEmployees(prev => prev.filter(t => t.id !== employeeToToggle.id)); 
          showToast(`Employee marked as ${newStatus}`);
      } catch (e: any) {
          showToast("Failed: " + e.message, 'error');
      } finally {
          setIsTogglingStatus(false);
          setStatusToggleModalOpen(false);
          setEmployeeToToggle(null);
      }
  };

  const renderDocumentCard = (docType: string) => {
      const existingDoc = employeeDocuments.find(d => d.document_type === docType);
      const docUrl = existingDoc?.file_url;
      const isUploading = uploadingDocType === docType;

      return (
          <div className={`p-4 border-2 border-dashed ${docUrl ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600'} rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 relative group`}>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                onChange={(e) => handleDocumentUpload(docType, e)}
                disabled={isUploading || !formData.id}
              />
              {isUploading ? (
                  <div className="flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                      <span className="text-xs text-gray-500">Uploading...</span>
                  </div>
              ) : docUrl ? (
                  <div className="flex flex-col items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{docType}</span>
                      <div className="flex gap-2 mt-1 z-20">
                          <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                              <Eye className="w-3 h-3" /> View
                          </a>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 mb-2 group-hover:text-indigo-500" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Upload {docType}</span>
                      {!formData.id && <span className="text-xs text-red-400 mt-1">Save profile first</span>}
                  </div>
              )}
          </div>
      );
  };

  // Filter employees
  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <input 
              type="text" 
              placeholder="Search by name, designation..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
         </div>
         <div className="flex gap-2">
            <button onClick={() => setShowInactive(!showInactive)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {showInactive ? 'Show Active' : 'Show Inactive'}
            </button>
            <button onClick={() => openProfile(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-colors">
                <Plus className="w-4 h-4"/> Add Employee
            </button>
         </div>
      </div>

      {isLoading ? <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600"/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map(employee => (
            <div key={employee.id} onClick={() => openProfile(employee)} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
               <div className={`absolute top-0 left-0 w-full h-1 ${employee.status === 'inactive' ? 'bg-gray-400' : 'bg-green-500'}`}></div>
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl overflow-hidden border-2 border-white dark:border-gray-600 shadow-sm">
                    {employee.photo_url ? <img src={employee.photo_url} alt="" className="w-full h-full object-cover"/> : employee.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{employee.full_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{employee.subject || 'Staff'}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Phone className="w-3 h-3" /> {employee.phone || 'N/A'}
                    </div>
                  </div>
               </div>
            </div>
          ))}
          {filteredEmployees.length === 0 && <div className="col-span-full text-center text-gray-500 py-12 dark:text-gray-400">No {showInactive ? 'inactive' : 'active'} employees found.</div>}
        </div>
      )}

      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setProfileModalOpen(false)}>
           <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                 <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    {formData.id ? 'Edit Employee Profile' : 'Add New Employee'}
                 </h3>
                 <button onClick={() => setProfileModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500"/></button>
              </div>

              <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <button onClick={() => setActiveTab('personal')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'personal' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                      <User className="w-4 h-4" /> Personal Details
                  </button>
                  <button onClick={() => setActiveTab('financial')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'financial' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                      <Banknote className="w-4 h-4" /> Financial Info
                  </button>
                  <button onClick={() => setActiveTab('documents')} className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'documents' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                      <FileText className="w-4 h-4" /> Documents
                  </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                 <form id="employee-form" onSubmit={handleSaveProfile} className="space-y-6">
                    {activeTab === 'personal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 flex justify-center mb-4">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                                        {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-gray-400" />}
                                    </div>
                                    <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-6 h-6 text-white" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name <span className="text-red-500">*</span></label><input name="full_name" value={formData.full_name || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" required /></div>
                            
                            <div className="space-y-1.5">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Designation</label>
                              <div className="relative">
                                <select 
                                  name="subject" 
                                  value={formData.subject || ''} 
                                  onChange={handleInputChange} 
                                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none appearance-none"
                                >
                                  <option value="">Select Designation</option>
                                  {designations.length > 0 ? (
                                    designations.map(d => <option key={d} value={d}>{d}</option>)
                                  ) : (
                                    <option value="Staff">Staff (Default)</option>
                                  )}
                                </select>
                                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
                              </div>
                            </div>

                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label><input name="phone" value={formData.phone || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><input name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Qualification</label><input name="qualification" value={formData.qualification || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</label><input name="address" value={formData.address || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                        </div>
                    )}
                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name</label><input name="bank_name" value={formData.bank_name || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account No</label><input name="bank_account_no" value={formData.bank_account_no || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">IFSC Code</label><input name="bank_ifsc_code" value={formData.bank_ifsc_code || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">UPI ID</label><input name="upi_id" value={formData.upi_id || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                            <div className="md:col-span-2 space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Salary</label><input type="number" name="salary_amount" value={formData.salary_amount || 0} onChange={handleInputChange} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none" /></div>
                        </div>
                    )}
                    {activeTab === 'documents' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderDocumentCard("Resume / CV")}
                            {renderDocumentCard("ID Proof (Aadhar/PAN)")}
                            {renderDocumentCard("Educational Certificates")}
                            {renderDocumentCard("Experience Letters")}
                        </div>
                    )}
                 </form>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                 {formData.id && (
                     <button type="button" onClick={() => initiateStatusToggle(formData as Employee)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${formData.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20' : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-900/50 dark:hover:bg-green-900/20'}`}>
                         {formData.status === 'active' ? 'Deactivate Employee' : 'Activate Employee'}
                     </button>
                 )}
                 <div className="flex gap-2 ml-auto">
                     <button onClick={() => setProfileModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                     <button onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20">
                       {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} Save
                     </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isEditorOpen && selectedImageSrc && (
        <ImageEditor imageSrc={selectedImageSrc} onClose={() => setIsEditorOpen(false)} onSave={handleEditorSave} />
      )}

      {statusToggleModalOpen && employeeToToggle && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{employeeToToggle.status === 'active' ? 'Deactivate Employee?' : 'Activate Employee?'}</h3>
                  <div className="flex gap-3 justify-center mt-4">
                      <button onClick={() => setStatusToggleModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">Cancel</button>
                      <button onClick={confirmStatusToggle} disabled={isTogglingStatus} className={`px-4 py-2 rounded-lg text-white ${employeeToToggle.status === 'active' ? 'bg-red-600' : 'bg-green-600'}`}>{isTogglingStatus ? 'Processing...' : 'Confirm'}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
