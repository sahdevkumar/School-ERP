
// ... existing imports
import * as React from 'react';
import { 
  User, 
  School, 
  Save, 
  Loader2, 
  List, 
  Plus, 
  Search, 
  Check, 
  X, 
  Phone, 
  ArrowRight, 
  AlertTriangle, 
  UserCheck, 
  Trash2, 
  History, 
  Filter, 
  CheckCircle 
} from 'lucide-react';
import { StudentRegistration } from '../types';
import { dbService } from '../services/supabase';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateFormatter';

interface RegistrationProps {
  initialData?: any | null;
  onNavigate?: (page: string, data?: any) => void;
}

export const Registration: React.FC<RegistrationProps> = ({ initialData, onNavigate }) => {
  const [activeTab, setActiveTab] = React.useState<'add' | 'list'>('list');
  const { showToast } = useToast();
  
  // Form State
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<StudentRegistration>({
    full_name: '',
    gender: '',
    dob: '',
    email: '',
    phone: '',
    address: '',
    father_name: '',
    mother_name: '',
    class_enrolled: '',
    previous_school: '',
    admission_date: new Date().toISOString().split('T')[0],
    status: 'pending'
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // List State
  const [registrationList, setRegistrationList] = React.useState<StudentRegistration[]>([]);
  const [isLoadingList, setIsLoadingList] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isProcessingId, setIsProcessingId] = React.useState<number | null>(null);
  const [showHistory, setShowHistory] = React.useState(false); 

  // Settings State
  const [availableClasses, setAvailableClasses] = React.useState<string[]>([]);

  // Modal State
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);
  const [selectedAction, setSelectedAction] = React.useState<{id: number, status: 'approved' | 'rejected'} | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (initialData) {
      if (initialData.view === 'list') {
        setActiveTab('list');
      } else if (initialData.full_name) {
        setActiveTab('add'); 
        setFormData(prev => ({
          ...prev,
          full_name: initialData.full_name,
          gender: initialData.gender || '',
          dob: initialData.dob || '',
          phone: initialData.mobile_no || '',
          email: initialData.email || '',
          address: initialData.address || '',
          father_name: initialData.father_name || '',
          mother_name: initialData.mother_name || '',
          class_enrolled: initialData.class_applying_for || '',
          previous_school: initialData.previous_school || ''
        }));
      }
    }
    // Load Settings
    const loadSettings = async () => {
      const { classes } = await dbService.getClassesAndSections();
      setAvailableClasses(classes);
    };
    loadSettings();
  }, [initialData]);

  React.useEffect(() => {
    if (activeTab === 'list') {
      fetchRegistrations();
    }
  }, [activeTab]);

  const fetchRegistrations = async () => {
    setIsLoadingList(true);
    try {
      const data = await dbService.getRegistrations();
      setRegistrationList(data);
    } catch (error) {
      console.error("Failed to load registrations", error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.full_name?.trim()) newErrors.full_name = "Full Name is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.dob) newErrors.dob = "Date of Birth is required";
    if (!formData.class_enrolled) newErrors.class_enrolled = "Class is required";
    if (!formData.father_name.trim()) newErrors.father_name = "Father Name is required";
    if (!formData.mother_name.trim()) newErrors.mother_name = "Mother Name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";

    if (!formData.phone) {
      newErrors.phone = "Mobile Number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Mobile Number must be 10 digits";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid Email Address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Please fix the validation errors.", 'error');
      return;
    }

    setIsSubmitting(true);
    const exists = await dbService.checkRegistrationExists(formData.phone);
    if (exists) {
      showToast("A registration with this phone number already exists.", 'error');
      setIsSubmitting(false);
      return;
    }

    const result = await dbService.createRegistration(formData);
    setIsSubmitting(false);

    if (result.success) {
      showToast("Student Registration Submitted Successfully!");
      setFormData({
        full_name: '', gender: '', dob: '', email: '', phone: '',
        address: '', father_name: '', mother_name: '', class_enrolled: '',
        previous_school: '', admission_date: new Date().toISOString().split('T')[0], status: 'pending'
      });
      setErrors({});
      setActiveTab('list');
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to register: " + errorMsg, 'error');
    }
  };

  const initiateStatusAction = (id: number, status: 'approved' | 'rejected') => {
    setSelectedAction({ id, status });
    setStatusModalOpen(true);
  };

  const initiateDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null) return;
    const result = await dbService.deleteRegistration(itemToDelete);
    if (result.success) {
      setRegistrationList(prev => prev.filter(item => item.id !== itemToDelete));
      showToast("Registration deleted successfully.");
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to delete registration: " + errorMsg, 'error');
    }
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const confirmStatusAction = async () => {
    if (!selectedAction) return;
    const { id, status } = selectedAction;
    setIsProcessingId(id);
    try {
      let result;
      if (status === 'approved') {
        result = await dbService.approveRegistration(id);
      } else {
        result = await dbService.updateRegistrationStatus(id, status);
      }
      if (result.success) {
        setRegistrationList(prev => prev.map(item => 
          item.id === id ? { ...item, status: status } : item
        ));
        showToast(`Registration ${status} successfully!`);
        setStatusModalOpen(false);
      } else {
        console.error("Approval error: ", result.error);
        const errString = typeof result.error === 'object' ? JSON.stringify(result.error) : result.error;
        if (typeof errString === 'string' && (errString.includes("SCHEMA_ERROR") || errString.includes("column") || errString.includes("PGRST204"))) {
          showToast("DATABASE ERROR: Missing columns in 'students' table. Run SQL script.", 'error');
        } else {
          showToast(`Action failed: ${errString}`, 'error');
        }
        setStatusModalOpen(false);
      }
    } catch (error) {
      console.error(error);
      showToast("An unexpected error occurred.", 'error');
      setStatusModalOpen(false);
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleFinalSubmit = (reg: StudentRegistration) => {
    if (onNavigate) {
      const searchTerm = reg.phone || reg.full_name;
      onNavigate('admission', { search: searchTerm });
    }
  };

  const handleManualComplete = async (id: number) => {
    if (!window.confirm("Mark this registration as completed? This will move it to history.")) return;
    const result = await dbService.markRegistrationAsCompleted(id);
    if (result.success) {
      setRegistrationList(prev => prev.map(item => 
        item.id === id ? { ...item, status: 'Admission Done' } : item
      ));
      showToast("Marked as completed.");
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to mark as completed: " + errorMsg, 'error');
    }
  };

  // ... (render logic same as previous) ...
  const filteredRegistrations = registrationList.filter(item => {
    const matchesSearch = item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.class_enrolled.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.phone.includes(searchTerm);
    const isCompleted = item.status === 'Admission Done' || item.status === 'admitted';
    if (!showHistory && isCompleted) return false;
    return matchesSearch;
  });

  const getInputClass = (fieldName: string) => {
    return `w-full px-4 py-2.5 rounded-xl border ${
      errors[fieldName] 
        ? 'border-red-500 focus:ring-red-200' 
        : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
    } bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 outline-none`;
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
       {/* ... (JSX identical to existing) ... */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Student Registration
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Manage student registrations and approvals.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm inline-flex">
            <button onClick={() => setActiveTab('list')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              <List className="w-4 h-4" /> Registration List
            </button>
            <button onClick={() => setActiveTab('add')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'add' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              <Plus className="w-4 h-4" /> Add Registration
            </button>
          </div>
        </div>

      {activeTab === 'add' ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Student Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={getInputClass('full_name')}
                  placeholder="Student Full Name"
                />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
              </div>
              
               <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender <span className="text-red-500">*</span></label>
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={getInputClass('gender')}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
              </div>
               <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={getInputClass('dob')}
                />
                {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
              </div>
               <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Class Enrolled <span className="text-red-500">*</span></label>
                <select 
                  name="class_enrolled"
                  value={formData.class_enrolled}
                  onChange={handleChange}
                  className={getInputClass('class_enrolled')}
                >
                    <option value="">Select Class</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.class_enrolled && <p className="text-xs text-red-500">{errors.class_enrolled}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700 pt-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                <School className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Parent Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Father Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleChange}
                  className={getInputClass('father_name')}
                />
                {errors.father_name && <p className="text-xs text-red-500">{errors.father_name}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mother Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="mother_name"
                  value={formData.mother_name}
                  onChange={handleChange}
                  className={getInputClass('mother_name')}
                />
                {errors.mother_name && <p className="text-xs text-red-500">{errors.mother_name}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile No <span className="text-red-500">*</span></label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={getInputClass('phone')}
                  placeholder="10 digit number"
                  maxLength={10}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
               <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={getInputClass('address')}
                />
                {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
                <button 
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
                <button 
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Confirm Registration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
             <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by name, class or mobile..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
             </div>
             <div className="flex gap-2">
                <button onClick={() => setShowHistory(!showHistory)} className={`p-2 rounded-lg transition-colors flex items-center gap-2 px-3 text-sm font-medium ${showHistory ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                  <History className="w-5 h-5" /> <span className="hidden sm:inline">{showHistory ? 'Hide History' : 'Show History'}</span>
                </button>
                <button onClick={fetchRegistrations} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Refresh">
                  <Loader2 className={`w-5 h-5 ${isLoadingList ? 'animate-spin' : ''}`} />
                </button>
             </div>
          </div>
           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Parent Details</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {isLoadingList ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />Loading registrations...</td></tr>
                  ) : filteredRegistrations.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">{showHistory ? "No registrations found." : "No active registrations found. (Completed items are hidden)"}</td></tr>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">{reg.full_name}</div>
                          <div className="text-xs text-gray-500 capitalize">{reg.gender}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{reg.class_enrolled}</span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-sm text-gray-900 dark:text-gray-200">{reg.father_name}</div>
                           <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {reg.phone}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(reg.admission_date)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${reg.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : reg.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : reg.status === 'Admission Done' || reg.status === 'admitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                            {reg.status ? reg.status.charAt(0).toUpperCase() + reg.status.slice(1) : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center justify-end gap-2">
                             {reg.status === 'pending' && (
                               <>
                                  <button onClick={() => initiateStatusAction(reg.id!, 'approved')} disabled={isProcessingId === reg.id} className="p-1.5 text-white bg-green-500 hover:bg-green-600 rounded shadow-sm transition-colors disabled:opacity-50" title="Approve">
                                    {isProcessingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => initiateStatusAction(reg.id!, 'rejected')} disabled={isProcessingId === reg.id} className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded shadow-sm transition-colors disabled:opacity-50" title="Reject"><X className="w-4 h-4" /></button>
                                </>
                             )}
                             {reg.status === 'approved' && (
                                 <>
                                   <button 
                                     onClick={() => handleFinalSubmit(reg)} 
                                     className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors shadow-sm"
                                     title="Proceed to Admission Section to Finalize"
                                   >
                                     Finalize Admission <ArrowRight className="w-3 h-3" />
                                   </button>
                                   <button onClick={() => handleManualComplete(reg.id!)} className="p-1.5 text-blue-600 hover:text-white border border-blue-600 hover:bg-blue-600 rounded transition-colors" title="Mark as Completed"><CheckCircle className="w-4 h-4" /></button>
                                 </>
                             )}
                             {reg.status === 'rejected' && <div className="text-xs text-red-500 font-medium">Rejected</div>}
                             {(reg.status === 'Admission Done' || reg.status === 'admitted') && <div className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Completed</div>}
                             <button onClick={() => initiateDelete(reg.id!)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Delete Registration"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
           </div>
        </div>
      )}

      {statusModalOpen && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-scale-in">
            {/* ... Modal content same as before ... */}
            <div className="p-6 text-center">
               <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedAction.status === 'approved' ? 'Approve Application?' : 'Reject Application?'}</h3>
               <p className="text-gray-500 dark:text-gray-400 mb-6">{selectedAction.status === 'approved' ? 'This will approve the registration and automatically create a new Student Profile. Are you sure?' : 'This will mark the registration as rejected.'}</p>
               <div className="flex gap-3 justify-center">
                <button onClick={() => setStatusModalOpen(false)} disabled={isProcessingId !== null} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button onClick={confirmStatusAction} disabled={isProcessingId !== null} className={`px-5 py-2.5 rounded-xl text-white font-medium shadow-lg transition-colors flex items-center gap-2 ${selectedAction.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {isProcessingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedAction.status === 'approved' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {isProcessingId !== null ? 'Processing...' : selectedAction.status === 'approved' ? 'Yes, Approve' : 'Yes, Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500"><Trash2 className="w-8 h-8" /></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Registration?</h3>
              <div className="flex gap-3 justify-center mt-6">
                <button onClick={() => setDeleteModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
                <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-red-600 text-white">Delete</button>
              </div>
            </div>
           </div>
        </div>
      )}
    </div>
  );
};
