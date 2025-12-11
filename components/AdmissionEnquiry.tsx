import * as React from 'react';
import { 
  Save, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  School, 
  FileText, 
  List, 
  Plus,
  Users,
  Briefcase,
  MessageSquare,
  ChevronRight,
  Loader2,
  Trash2,
  Edit,
  Eye,
  Search,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Send,
  MessageCircle,
  X,
  Check
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { AdmissionEnquiry as AdmissionEnquiryType, StudentRegistration } from '../types';
import { useToast } from '../context/ToastContext';

interface AdmissionEnquiryProps {
  onNavigate?: (page: string, data?: any) => void;
}

export const AdmissionEnquiry: React.FC<AdmissionEnquiryProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = React.useState<'list' | 'add'>('list');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { showToast } = useToast();
  
  // List View State
  const [enquiryList, setEnquiryList] = React.useState<AdmissionEnquiryType[]>([]);
  const [isLoadingList, setIsLoadingList] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Settings State
  const [availableClasses, setAvailableClasses] = React.useState<string[]>([]);

  // Modals State
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [successPopupOpen, setSuccessPopupOpen] = React.useState(false);
  const [messageModalOpen, setMessageModalOpen] = React.useState(false);
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [isProcessingAdmission, setIsProcessingAdmission] = React.useState(false);
  
  const [itemToDelete, setItemToDelete] = React.useState<number | null>(null);
  const [currentMessageItem, setCurrentMessageItem] = React.useState<AdmissionEnquiryType | null>(null);
  const [previewItem, setPreviewItem] = React.useState<AdmissionEnquiryType | null>(null);

  // Form State
  const initialFormState: AdmissionEnquiryType = {
    full_name: '',
    gender: '',
    dob: '',
    class_applying_for: '',
    no_of_child: 1,
    previous_school: '',
    father_name: '',
    mother_name: '',
    mobile_no: '',
    email: '',
    address: '',
    assigned_to: '',
    reference: '',
    enquiry_date: new Date().toISOString().split('T')[0],
    next_follow_up: '',
    response_status: 'Enquiry',
    internal_notes: ''
  };

  const [formData, setFormData] = React.useState<AdmissionEnquiryType>(initialFormState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (activeTab === 'list') {
      fetchEnquiries();
    }
    // Fetch classes settings
    const loadSettings = async () => {
      const fields = await dbService.getStudentFields();
      setAvailableClasses(fields.classes);
    };
    loadSettings();
  }, [activeTab]);

  const fetchEnquiries = async () => {
    setIsLoadingList(true);
    try {
      const data = await dbService.getAdmissionEnquiries();
      setEnquiryList(data);
    } catch (error) {
      console.error("Error loading enquiries", error);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
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
    
    if (!formData.full_name.trim()) newErrors.full_name = "Full Name is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.dob) newErrors.dob = "Date of Birth is required";
    if (!formData.class_applying_for) newErrors.class_applying_for = "Class is required";
    if (!formData.father_name.trim()) newErrors.father_name = "Father Name is required";
    if (!formData.mother_name.trim()) newErrors.mother_name = "Mother Name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.enquiry_date) newErrors.enquiry_date = "Enquiry Date is required";

    // Phone Validation
    if (!formData.mobile_no) {
      newErrors.mobile_no = "Mobile Number is required";
    } else if (!/^\d{10}$/.test(formData.mobile_no)) {
      newErrors.mobile_no = "Mobile Number must be 10 digits";
    }

    // Email Validation (Optional but must be valid if present)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid Email Address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (enquiry: AdmissionEnquiryType) => {
    setFormData({
      ...enquiry,
      dob: enquiry.dob || '',
      next_follow_up: enquiry.next_follow_up || '',
      enquiry_date: enquiry.enquiry_date || new Date().toISOString().split('T')[0],
      internal_notes: enquiry.internal_notes || '',
      response_status: enquiry.response_status || 'Enquiry',
      email: enquiry.email || '',
      previous_school: enquiry.previous_school || '',
      reference: enquiry.reference || '',
      assigned_to: enquiry.assigned_to || ''
    });
    setErrors({});
    setActiveTab('add');
  };

  const openPreview = (enquiry: AdmissionEnquiryType) => {
    setPreviewItem(enquiry);
    setPreviewModalOpen(true);
  };

  const initiateDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const openMessageModal = (enquiry: AdmissionEnquiryType) => {
    setCurrentMessageItem(enquiry);
    setMessageModalOpen(true);
  };

  const handleSendMessage = async (type: 'admission' | 'visit') => {
    if (!currentMessageItem) return;

    if (type === 'admission') {
      setIsProcessingAdmission(true);
      try {
        const newReg: StudentRegistration = {
            full_name: currentMessageItem.full_name || '',
            gender: currentMessageItem.gender || '',
            dob: currentMessageItem.dob || '',
            email: currentMessageItem.email || '',
            phone: currentMessageItem.mobile_no || '',
            address: currentMessageItem.address || '',
            father_name: currentMessageItem.father_name || '',
            mother_name: currentMessageItem.mother_name || '',
            class_enrolled: currentMessageItem.class_applying_for || '',
            previous_school: currentMessageItem.previous_school || '',
            admission_date: new Date().toISOString().split('T')[0],
            status: 'pending'
        };

        const regResult = await dbService.createRegistration(newReg);
        if (!regResult.success) throw new Error(regResult.error);

        const updResult = await dbService.updateAdmissionEnquiry({
            ...currentMessageItem,
            response_status: 'In Registration'
        });
        if (!updResult.success) throw new Error(updResult.error);

        setMessageModalOpen(false);
        if (onNavigate) {
          onNavigate('registration', { view: 'list' });
        }
      } catch (error: any) {
        showToast("Error processing admission: " + error.message, 'error');
      } finally {
        setIsProcessingAdmission(false);
      }
      return;
    }

    if (!currentMessageItem.mobile_no) return;
    
    const name = currentMessageItem.full_name;
    const parentName = currentMessageItem.father_name || "Parent";
    const message = `Dear ${parentName}, We would like to invite you and ${name} for a school campus visit. Please let us know a convenient time for you. - EduSphere Admin`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = currentMessageItem.mobile_no.replace(/\D/g, ''); 
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setMessageModalOpen(false);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null) return;

    const result = await dbService.deleteAdmissionEnquiry(itemToDelete);
    if (result.success) {
      setEnquiryList(prev => prev.filter(item => item.id !== itemToDelete));
      showToast("Enquiry moved to Recycle Bin");
    } else {
      showToast("Failed to delete: " + result.error, 'error');
    }
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast("Please fix the validation errors.", 'error');
      return;
    }

    setIsSubmitting(true);
    
    let result;
    if (formData.id) {
      result = await dbService.updateAdmissionEnquiry(formData);
    } else {
      result = await dbService.createAdmissionEnquiry(formData);
    }
    
    setIsSubmitting(false);
    
    if (result.success) {
      setSuccessPopupOpen(true);
      setFormData(initialFormState);
      if (formData.id) {
        setActiveTab('list');
      }
    } else {
      const msg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to save: " + msg, 'error');
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setErrors({});
  };

  const filteredEnquiries = enquiryList.filter(item => 
    item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.mobile_no.includes(searchTerm) ||
    item.class_applying_for.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStepStatus = (status: string | undefined) => {
    const s = (status || '').toLowerCase();
    let currentStep = 1;
    if (s.includes('registration') || s.includes('registered')) currentStep = 2;
    if (s.includes('admission') || s.includes('admitted')) currentStep = 3;
    if (s.includes('done') || s.includes('completed')) currentStep = 4;
    return currentStep;
  };

  const getInputClass = (fieldName: string) => {
    return `w-full px-4 py-2.5 rounded-xl border ${
      errors[fieldName] 
        ? 'border-red-500 focus:ring-red-200' 
        : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
    } bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 outline-none transition-all`;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Admission Enquiry
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage student leads and enquiry details.</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm inline-flex">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'list'
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <List className="w-4 h-4" />
            Enquiry List
          </button>
          <button
            onClick={() => {
              setActiveTab('add');
              handleReset();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'add'
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {formData.id ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {formData.id ? 'Edit Enquiry' : 'Add Enquiry'}
          </button>
        </div>
      </div>

      {activeTab === 'add' ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            {/* Header in Form */}
             <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {formData.id ? 'Edit Enquiry Details' : 'New Admission Enquiry'}
              </h3>
              {formData.id && (
                <button 
                  type="button" 
                  onClick={() => { handleReset(); setActiveTab('list'); }}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" /> Cancel Edit
                </button>
              )}
            </div>

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                  <User className="w-5 h-5" />
                </div>
                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">Student Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Student's Name"
                      className={`${getInputClass('full_name')} pl-10`}
                    />
                  </div>
                  {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select 
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={getInputClass('gender')}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                   {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date Of Birth <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="date" 
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className={`${getInputClass('dob')} pl-10`}
                    />
                  </div>
                  {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Class Applying For <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                     <select 
                      name="class_applying_for"
                      value={formData.class_applying_for}
                      onChange={handleChange}
                      className={getInputClass('class_applying_for')}
                     >
                      <option value="">Select Class</option>
                      {availableClasses.length > 0 ? (
                        availableClasses.map(c => <option key={c} value={c}>{c}</option>)
                      ) : (
                        <option value="Nursery">Nursery (Default)</option>
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                  {errors.class_applying_for && <p className="text-xs text-red-500">{errors.class_applying_for}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    No. of Child <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number" 
                    name="no_of_child"
                    value={formData.no_of_child}
                    onChange={handleChange}
                    placeholder="1"
                    min="1"
                    className={getInputClass('no_of_child')}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Previous School</label>
                  <div className="relative group">
                    <School className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      name="previous_school"
                      value={formData.previous_school}
                      onChange={handleChange}
                      placeholder="School Name"
                      className={`${getInputClass('previous_school')} pl-10`}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">Parent & Contact Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Father Name <span className="text-red-500">*</span>
                  </label>
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mother Name <span className="text-red-500">*</span>
                  </label>
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mobile No <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="tel" 
                      name="mobile_no"
                      value={formData.mobile_no}
                      onChange={handleChange}
                      placeholder="10 digit number"
                      maxLength={10}
                      className={`${getInputClass('mobile_no')} pl-10`}
                    />
                  </div>
                  {errors.mobile_no && <p className="text-xs text-red-500">{errors.mobile_no}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@mail.com"
                      className={`${getInputClass('email')} pl-10`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <textarea 
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Full residential address"
                      className={`${getInputClass('address')} pl-10 resize-none`}
                    ></textarea>
                  </div>
                  {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                </div>
              </div>
            </section>

             <section className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300">Office Use & Status</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Assigned To
                  </label>
                  <select 
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleChange}
                    className={getInputClass('assigned_to')}
                  >
                    <option value="">Select Staff</option>
                    <option value="Admin">Admin</option>
                    <option value="Receptionist">Receptionist</option>
                    <option value="Principal">Principal</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reference
                  </label>
                  <select 
                    name="reference"
                    value={formData.reference}
                    onChange={handleChange}
                    className={getInputClass('reference')}
                  >
                    <option value="">Select Source</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Friend">Friend</option>
                    <option value="Newspaper">Newspaper</option>
                    <option value="Walk-in">Walk-in</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enquiry Date <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    name="enquiry_date"
                    value={formData.enquiry_date}
                    onChange={handleChange}
                    className={getInputClass('enquiry_date')}
                  />
                  {errors.enquiry_date && <p className="text-xs text-red-500">{errors.enquiry_date}</p>}
                </div>
                 
                 <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Next Follow Up
                  </label>
                  <input 
                    type="date" 
                    name="next_follow_up"
                    value={formData.next_follow_up}
                    onChange={handleChange}
                    className={getInputClass('next_follow_up')}
                  />
                </div>
              </div>

              {/* Response & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Response / Status
                  </label>
                  <div className="relative group">
                    <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <textarea 
                      name="response_status"
                      value={formData.response_status}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Enter response details..."
                      className={`${getInputClass('response_status')} pl-10 resize-none`}
                    ></textarea>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Internal Notes
                  </label>
                  <div className="relative group">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <textarea 
                      name="internal_notes"
                      value={formData.internal_notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Private notes for staff..."
                      className={`${getInputClass('internal_notes')} pl-10 resize-none`}
                    ></textarea>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
               <button 
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                disabled={isSubmitting}
              >
                Reset
              </button>
               <button 
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {formData.id ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {formData.id ? 'Update Enquiry' : 'Save Enquiry'}
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* List View */}
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
             <button onClick={fetchEnquiries} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Refresh">
               <Loader2 className={`w-5 h-5 ${isLoadingList ? 'animate-spin' : ''}`} />
             </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Parent / Contact</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Dates</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {isLoadingList ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                        Loading enquiries...
                      </td>
                    </tr>
                  ) : filteredEnquiries.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No enquiries found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredEnquiries.map((enquiry) => (
                      <tr key={enquiry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">{enquiry.full_name}</div>
                          <div className="text-xs text-gray-500 capitalize">{enquiry.gender}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-gray-200">{enquiry.father_name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {enquiry.mobile_no}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            {enquiry.class_applying_for}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-xs text-gray-500">
                            <span className="block mb-1">Enq: <span className="text-gray-700 dark:text-gray-300">{enquiry.enquiry_date}</span></span>
                            {enquiry.next_follow_up && (
                              <span className="block text-orange-600 dark:text-orange-400">Follow: {enquiry.next_follow_up}</span>
                            )}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           {enquiry.response_status ? (
                             <span className="text-sm text-gray-700 dark:text-gray-300 truncate block max-w-[150px]">
                               {enquiry.response_status}
                             </span>
                           ) : (
                             <span className="text-xs text-gray-400 italic">No Status</span>
                           )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                             {enquiry.response_status === 'In Registration' ? (
                               <button 
                                onClick={() => openPreview(enquiry)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" 
                                title="View Details"
                               >
                                 <Eye className="w-4 h-4" />
                               </button>
                             ) : (
                               <>
                                 <button 
                                  onClick={() => openMessageModal(enquiry)}
                                  className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors" 
                                  title="Send Message"
                                 >
                                   <Send className="w-4 h-4" />
                                 </button>
                                 <button 
                                  onClick={() => openPreview(enquiry)}
                                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" 
                                  title="View Details"
                                 >
                                   <Eye className="w-4 h-4" />
                                 </button>
                                 <button 
                                  onClick={() => handleEdit(enquiry)}
                                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" 
                                  title="Edit Details"
                                 >
                                   <Edit className="w-4 h-4" />
                                 </button>
                                 <button 
                                  onClick={() => initiateDelete(enquiry.id!)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" 
                                  title="Delete"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </>
                             )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!isLoadingList && filteredEnquiries.length > 0 && (
               <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>Showing {filteredEnquiries.length} entries</span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50" disabled>Prev</button>
                    <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50" disabled>Next</button>
                  </div>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button className="fixed bottom-6 right-20 bg-[#25D366] text-white p-3.5 rounded-full shadow-lg hover:bg-[#20bd5a] transition-all hover:scale-110 z-50 group">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-current">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          WhatsApp Support
        </span>
      </button>

      {/* Message Modal */}
      {messageModalOpen && currentMessageItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-500">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Send Message</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Choose a message template for <strong>{currentMessageItem.full_name}</strong>
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleSendMessage('admission')}
                  disabled={isProcessingAdmission}
                  className="w-full py-3 px-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessingAdmission ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                     <FileText className="w-4 h-4" />
                  )}
                  {isProcessingAdmission ? 'Processing...' : 'For Admission (Auto-Register)'}
                </button>
                <button
                  onClick={() => handleSendMessage('visit')}
                  disabled={isProcessingAdmission}
                  className="w-full py-3 px-4 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors flex items-center justify-center gap-2"
                >
                  <School className="w-4 h-4" />
                  For Visit (WhatsApp)
                </button>
              </div>

              <button
                onClick={() => setMessageModalOpen(false)}
                disabled={isProcessingAdmission}
                className="mt-6 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Enquiry?</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to move this enquiry to the Recycle Bin? You can restore it later if needed.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Move to Recycle Bin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup Modal */}
      {successPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all scale-100 animate-scale-in">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-500">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Success!</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              The admission enquiry has been saved successfully.
            </p>
            <button
              onClick={() => setSuccessPopupOpen(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Preview Details Modal with Progress Bar */}
      {previewModalOpen && previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-scale-in flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enquiry Details</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">ID: #{previewItem.id} • {previewItem.enquiry_date}</p>
              </div>
              <button 
                onClick={() => setPreviewModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="mb-8">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 z-0"></div>
                  {['Enquiry', 'Registration', 'Admission', 'Done'].map((step, index) => {
                    const currentStep = getStepStatus(previewItem.response_status);
                    const isCompleted = index + 1 <= currentStep;
                    const isCurrent = index + 1 === currentStep;
                    return (
                      <div key={step} className="relative z-10 flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                        }`}>
                          {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-xs">{index + 1}</span>}
                        </div>
                        <span className={`text-xs mt-2 font-medium ${
                          isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Student Name</span>
                  <p className="font-medium text-gray-900 dark:text-white text-lg">{previewItem.full_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Applying For</span>
                  <p className="font-medium text-gray-900 dark:text-white">{previewItem.class_applying_for}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Gender</span>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{previewItem.gender || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Date of Birth</span>
                  <p className="font-medium text-gray-900 dark:text-white">{previewItem.dob || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Parent Name</span>
                  <p className="font-medium text-gray-900 dark:text-white">{previewItem.father_name}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Contact No</span>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900 dark:text-white">{previewItem.mobile_no}</p>
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Address</span>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="font-medium text-gray-900 dark:text-white">{previewItem.address}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Reference</span>
                  <p className="font-medium text-gray-900 dark:text-white">{previewItem.reference || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Current Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    previewItem.response_status === 'In Registration' 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {previewItem.response_status || 'Pending'}
                  </span>
                </div>
              </div>

              {previewItem.internal_notes && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider block mb-2">Internal Notes</span>
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{previewItem.internal_notes}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
              <button 
                onClick={() => setPreviewModalOpen(false)}
                className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};