

import * as React from 'react';
import { 
  User, 
  Search, 
  Phone, 
  Users, 
  Upload, 
  FileText, 
  Bus, 
  Save, 
  CheckCircle, 
  Loader2, 
  X, 
  BookOpen,
  Camera,
  AlertTriangle,
  Clock,
  Briefcase,
  MapPin, 
  CreditCard,
  Home,
  MessageCircle,
  Eye,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Settings2,
  Download,
  FileSpreadsheet,
  File as FileIcon,
  Table as TableIcon,
  GraduationCap,
  UploadCloud,
  ArrowRight,
  Info
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { Student, StudentDocument } from '../types';
import { ImageEditor } from './ImageEditor';
import { compressImageFile } from '../utils/imageProcessor';
import { exportData } from '../utils/exportUtils';
import { useToast } from '../context/ToastContext';

interface AdmissionProps {
  initialSearch?: string;
}

export const Admission: React.FC<AdmissionProps> = ({ initialSearch }) => {
  const [listTab, setListTab] = React.useState<'pending' | 'all'>('pending');
  const [students, setStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedClass, setSelectedClass] = React.useState(''); // Class Filter State
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'thumbnail'>('grid');
  
  // Custom Column State
  const [visibleColumns, setVisibleColumns] = React.useState({
    admNo: true,
    profile: true,
    status: true,
    action: true
  });
  const [showColumnMenu, setShowColumnMenu] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  // Settings State
  const [availableClasses, setAvailableClasses] = React.useState<string[]>([]);
  const [availableSections, setAvailableSections] = React.useState<string[]>([]);

  // Modal State
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'personal' | 'academic' | 'parents' | 'facilities' | 'documents'>('personal');
  const [isSaving, setIsSaving] = React.useState(false);
  const [successModalOpen, setSuccessModalOpen] = React.useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = React.useState(false);
  const [isWhatsappSame, setIsWhatsappSame] = React.useState(false);
  
  // Bulk Import State
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [parsedImportData, setParsedImportData] = React.useState<Partial<Student>[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);

  // Photo Upload State
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = React.useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);

  // Document Upload State
  const [uploadingDocType, setUploadingDocType] = React.useState<string | null>(null);
  const [studentDocuments, setStudentDocuments] = React.useState<StudentDocument[]>([]);

  // Form State
  const [formData, setFormData] = React.useState<Student | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { showToast } = useToast();

  React.useEffect(() => {
    fetchStudents();
    // Load settings
    const loadSettings = async () => {
      const fields = await dbService.getStudentFields();
      setAvailableClasses(fields.classes);
      setAvailableSections(fields.sections);
    };
    loadSettings();
  }, [listTab]);

  React.useEffect(() => {
    if (initialSearch && students.length > 0) {
      const match = students.find(s => 
        s.full_name.toLowerCase().includes(initialSearch.toLowerCase()) || 
        s.phone === initialSearch
      );
      if (match) {
        openProfile(match);
      } else {
        setSearchTerm(initialSearch);
      }
    }
  }, [initialSearch, students]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = listTab === 'pending' 
        ? await dbService.getProvisionalStudents() 
        : await dbService.getAllStudentsRaw(); // Use raw to show all statuses in "All" tab
      setStudents(data);
    } catch (error) {
      console.error("Failed to load students", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openProfile = async (student: Student) => {
    setSelectedStudent(student);
    setIsWhatsappSame(false); // Reset Checkbox
    setPhotoPreview(student.photo_url || null);
    setSelectedImageSrc(null);
    
    // Fetch docs
    const docs = await dbService.getStudentDocuments(student.id);
    setStudentDocuments(docs);

    setFormData({ 
      ...student,
      section: student.section || '',
      blood_group: student.blood_group || '',
      aadhar_no: student.aadhar_no || '',
      identification_mark: student.identification_mark || '',
      father_qualification: student.father_qualification || '',
      mother_qualification: student.mother_qualification || '',
      whatsapp_no: student.whatsapp_no || '',
      transport_route: student.transport_route || '',
      hostel_room: student.hostel_room || '',
      fee_category: student.fee_category || '',
      class_section: student.class_section || '',
    }); 
    setErrors({});
    setActiveTab('personal');
    setProfileModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev!, [name]: value };
      if (name === 'phone' && isWhatsappSame) {
        newData.whatsapp_no = value;
      }
      return newData;
    });

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSameAsMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsWhatsappSame(isChecked);
    if (isChecked && formData) {
      setFormData(prev => ({ ...prev!, whatsapp_no: prev!.phone }));
      if (errors.whatsapp_no) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.whatsapp_no;
          return newErrors;
        });
      }
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
      // Reset input to allow selecting same file again
      e.target.value = '';
    }
  };

  const handleEditorSave = async (blob: Blob) => {
    setIsEditorOpen(false);
    
    const objectUrl = URL.createObjectURL(blob);
    setPhotoPreview(objectUrl);
    setIsUploadingPhoto(true);

    const file = new File([blob], "profile_photo.jpg", { type: "image/jpeg" });

    const result = await dbService.uploadProfilePhoto(file);
    setIsUploadingPhoto(false);

    if (result.publicUrl) {
       setFormData(prev => ({ ...prev!, photo_url: result.publicUrl }));
       showToast("Profile photo uploaded successfully!");
    } else {
       showToast("Failed to upload photo: " + result.error, 'error');
    }
  };

  const handleDocumentUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData?.id) return;

    setUploadingDocType(docType);
    try {
      const compressedFile = await compressImageFile(file);
      const result = await dbService.uploadStudentDocument(compressedFile, formData.id, docType);

      if (result.success) {
        // Refresh docs
        const docs = await dbService.getStudentDocuments(formData.id);
        setStudentDocuments(docs);
        showToast(`${docType} uploaded successfully!`);
      } else {
        showToast("Upload failed: " + result.error, 'error');
      }
    } catch (error) {
      console.error(error);
      showToast("An unexpected error occurred during upload.", 'error');
    } finally {
      setUploadingDocType(null);
      e.target.value = ''; // Reset input
    }
  };

  const validateProfile = () => {
    if (!formData) return false;
    const newErrors: Record<string, string> = {};

    // Personal Tab Validation - using full_name
    if (!formData.full_name?.trim()) newErrors.full_name = "Full Name is required";
    if (!formData.dob) newErrors.dob = "Date of Birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.aadhar_no) {
       newErrors.aadhar_no = "Aadhar Number is required";
    } else if (!/^\d{12}$/.test(formData.aadhar_no)) {
       newErrors.aadhar_no = "Aadhar Number must be 12 digits";
    }

    // Academic Tab Validation
    if (!formData.class_section) newErrors.class_section = "Class is required";
    if (!formData.section) newErrors.section = "Section is required";

    // Parents Tab Validation
    if (!formData.father_name?.trim()) newErrors.father_name = "Father Name is required";
    if (!formData.mother_name?.trim()) newErrors.mother_name = "Mother Name is required";
    if (!formData.address?.trim()) newErrors.address = "Address is required";
    
    if (!formData.phone) {
      newErrors.phone = "Mobile Number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Mobile Number must be 10 digits";
    }

    if (formData.whatsapp_no && !/^\d{10}$/.test(formData.whatsapp_no)) {
       newErrors.whatsapp_no = "Whatsapp Number must be 10 digits";
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid Email Address";
    }

    // Facilities Tab Validation
    if (!formData.fee_category) newErrors.fee_category = "Fee Category is required";

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.full_name || newErrors.dob || newErrors.gender || newErrors.aadhar_no) {
        setActiveTab('personal');
      } else if (newErrors.class_section || newErrors.section) {
        setActiveTab('academic');
      } else if (newErrors.father_name || newErrors.mother_name || newErrors.phone || newErrors.whatsapp_no || newErrors.address || newErrors.email) {
        setActiveTab('parents');
      } else if (newErrors.fee_category) {
        setActiveTab('facilities');
      }
      return false;
    }

    return true;
  };
  
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    
    if (!validateProfile()) {
      showToast("Please fix the validation errors before saving.", 'error');
      return;
    }

    setIsSaving(true);
    
    const result = await dbService.updateStudent(formData);
    
    if (result.success) {
      // Update local list
      const updatedStudent = { ...formData } as Student;
      setStudents(prev => prev.map(s => s.id === formData.id ? updatedStudent : s));
      setSelectedStudent(updatedStudent); // Keep modal data updated
      showToast("Profile updated successfully!");
    } else {
      showToast("Failed to update profile: " + result.error, 'error');
    }
    setIsSaving(false);
  };
  
  const handleFinalizeAdmission = async () => {
    if (!formData) return;

    setIsSaving(true);
    setConfirmationModalOpen(false);

    const result = await dbService.finalizeStudentAdmission(formData);

    if (result.success) {
      // Refresh list and close modal
      fetchStudents();
      setProfileModalOpen(false);
      setSuccessModalOpen(true);
    } else {
      showToast("Admission finalization failed: " + result.error, 'error');
    }
    setIsSaving(false);
  };
  
  // Bulk Import
  const downloadTemplate = () => {
    const headers = [
      "full_name", "gender", "dob", "phone", "whatsapp_no", "email", 
      "class_section", "section", "father_name", "father_qualification", 
      "mother_name", "mother_qualification", "address", "fee_category", 
      "aadhar_no", "blood_group", "identification_mark", "transport_route", "hostel_room"
    ];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bulk_admission_template.csv';
    link.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      showToast("CSV file must have headers and at least one data row.", "error");
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim());
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      const student: Partial<Student> = {};
      headers.forEach((header, index) => {
        (student as any)[header] = values[index]?.trim() || '';
      });
      return student;
    });
    setParsedImportData(data);
  };

  const handleImport = async () => {
    if (parsedImportData.length === 0) {
      showToast("No data to import.", "error");
      return;
    }
    setIsImporting(true);
    const result = await dbService.bulkCreateStudents(parsedImportData);
    setIsImporting(false);
    if (result.success) {
      showToast(`${result.count} students imported successfully!`, "success");
      setImportModalOpen(false);
      fetchStudents();
    } else {
      showToast("Import failed: " + result.error, "error");
    }
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf' | 'text') => {
    // FIX: Added 'admission_data' as the fourth argument to match the function signature.
    exportData(filteredStudents, format, 'admission_data', 'admission_data');
    setShowExportMenu(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.admission_no || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass ? s.class_section === selectedClass : true;
    return matchesSearch && matchesClass;
  });

  const getInputClass = (fieldName: string) => {
    return `input-field ${errors[fieldName] ? 'border-red-500 focus:ring-red-200' : ''}`;
  };

  const renderDocumentCard = (docType: string) => {
    const existingDoc = studentDocuments.find(d => d.document_type === docType);
    const docUrl = existingDoc?.file_url;
    const isUploading = uploadingDocType === docType;

    return (
      <div className={`border-2 border-dashed ${docUrl ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600'} p-6 text-center rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 relative transition-colors group`}>
        <input type="file" accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleDocumentUpload(docType, e)} disabled={isUploading}/>
        {isUploading ? (
          <div className="flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-2" /><span className="text-sm font-medium text-gray-500">Compressing & Uploading...</span></div>
        ) : docUrl ? (
           <div className="flex flex-col items-center justify-center"><CheckCircle className="w-10 h-10 text-green-500 mb-2" /><h4 className="font-medium text-gray-900 dark:text-white">{docType} Uploaded</h4><div className="flex gap-2 mt-2 z-20"><a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Eye className="w-3 h-3" /> View</a><span className="text-xs text-gray-400">•</span><span className="text-xs text-indigo-600">Click box to replace</span></div></div>
        ) : (
          <div className="flex flex-col items-center justify-center"><Upload className="mx-auto mb-3 text-gray-400 group-hover:text-indigo-500 w-10 h-10" /><h4 className="font-medium text-gray-900 dark:text-white">Upload {docType}</h4><p className="text-xs text-gray-500 mt-1">PDF or JPG (Compressed automatically)</p></div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto" onClick={() => { setShowColumnMenu(false); setShowExportMenu(false); }}>
      {/* Header & Tabs */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-indigo-600" /> Admission
          </h1>
          <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
            <button onClick={() => setListTab('pending')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${listTab === 'pending' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600' : 'text-gray-500'}`}>
              <Clock className="w-4 h-4" /> Pending
            </button>
            <button onClick={() => setListTab('all')} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${listTab === 'all' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600' : 'text-gray-500'}`}>
              <Users className="w-4 h-4" /> All Students
            </button>
            <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap text-gray-500">
              <UploadCloud className="w-4 h-4" /> Bulk Admission
            </button>
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{listTab === 'pending' ? 'Review and finalize new student admissions.' : 'View all active and provisional students.'}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row gap-4 justify-between items-center">
        {/* Search and Filters */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search by name, admission no..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end w-full lg:w-auto">
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">All Classes</option>
            {availableClasses.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          {/* Column/Export/View Toggles */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowColumnMenu(!showColumnMenu); setShowExportMenu(false); }} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600/80 transition-colors shadow-sm"><Settings2 className="w-4 h-4" /> Columns</button>
            {showColumnMenu && (<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30 p-2 animate-scale-in"><div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">Show/Hide Columns</div><label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.admNo} onChange={() => setVisibleColumns(prev => ({...prev, admNo: !prev.admNo}))} className="rounded text-indigo-600 focus:ring-indigo-500" /><span className="text-sm text-gray-700 dark:text-gray-300">Admission No</span></label><label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.profile} onChange={() => setVisibleColumns(prev => ({...prev, profile: !prev.profile}))} className="rounded text-indigo-600 focus:ring-indigo-500" /><span className="text-sm text-gray-700 dark:text-gray-300">Student Profile</span></label><label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.status} onChange={() => setVisibleColumns(prev => ({...prev, status: !prev.status}))} className="rounded text-indigo-600 focus:ring-indigo-500" /><span className="text-sm text-gray-700 dark:text-gray-300">Status</span></label><label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"><input type="checkbox" checked={visibleColumns.action} onChange={() => setVisibleColumns(prev => ({...prev, action: !prev.action}))} className="rounded text-indigo-600 focus:ring-indigo-500" /><span className="text-sm text-gray-700 dark:text-gray-300">Action</span></label></div>)}
          </div>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setShowExportMenu(!showExportMenu); setShowColumnMenu(false); }} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"><Download className="w-4 h-4" /> Export</button>
            {showExportMenu && (<div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-30 overflow-hidden animate-scale-in"><button onClick={() => handleExport('pdf')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><FileIcon className="w-4 h-4 text-red-500" /> PDF</button><button onClick={() => handleExport('excel')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel</button><button onClick={() => handleExport('csv')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><TableIcon className="w-4 h-4 text-blue-500" /> CSV</button><button onClick={() => handleExport('text')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><FileText className="w-4 h-4 text-gray-500" /> Text</button></div>)}
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg"><button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}><LayoutGrid className="w-4 h-4" /></button><button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}><List className="w-4 h-4" /></button><button onClick={() => setViewMode('thumbnail')} className={`p-2 rounded-md transition-all ${viewMode === 'thumbnail' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}><ImageIcon className="w-4 h-4" /></button></div>
          <button onClick={fetchStudents} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><Loader2 className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {isLoading ? (<div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>) : filteredStudents.length === 0 ? (<div className="text-center py-12 text-gray-500 dark:text-gray-400">{listTab === 'pending' ? 'No pending admissions.' : 'No students found.'}</div>) : 
        viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student) => (<div key={student.id} onClick={() => openProfile(student)} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer overflow-hidden"><div className={`h-24 bg-gradient-to-r ${student.student_status === 'provisional' ? 'from-amber-400 to-orange-500' : 'from-indigo-500 to-purple-600'}`}></div><div className="px-5 pb-5"><div className="relative -mt-10 mb-3"><div className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-400 overflow-hidden">{student.photo_url ? (<img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />) : (student.full_name.charAt(0))}</div></div><h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{student.full_name}</h3><p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{student.admission_no} • {student.class_section}</p><div className="flex items-center gap-1 text-xs text-gray-400"><Phone className="w-3 h-3" /> {student.phone || 'N/A'}</div></div></div>))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
           <div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">{visibleColumns.admNo && <th className="px-6 py-4 w-32">Adm No</th>}{visibleColumns.profile && <th className="px-6 py-4">Student Profile</th>}{visibleColumns.status && <th className="px-6 py-4">Status</th>}{visibleColumns.action && <th className="px-6 py-4 text-right">Action</th>}</tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{filteredStudents.map((student) => (<tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">{visibleColumns.admNo && <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 align-top">{student.admission_no}</td>}{visibleColumns.profile && (<td className="px-6 py-4"><div className="flex items-start gap-4"><div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex-shrink-0 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm">{student.photo_url ? (<img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />) : (student.full_name.charAt(0))}</div><div><div className="font-bold text-gray-900 dark:text-white text-base">{student.full_name}</div><div className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">{student.class_section} {student.section ? `(${student.section})` : ''}</div><div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 mt-1"><Phone className="w-3 h-3" /> {student.phone || 'N/A'}</div></div></div></td>)}{visibleColumns.status && (<td className="px-6 py-4 align-top"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.student_status === 'provisional' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>{student.student_status === 'provisional' ? 'Pending' : 'Active'}</span></td>)}{visibleColumns.action && (<td className="px-6 py-4 text-right align-top"><div className="flex items-center justify-end gap-2">{student.student_status === 'provisional' ? (<button onClick={() => openProfile(student)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors shadow-sm">Finalize Admission <ArrowRight className="w-3 h-3" /></button>) : (<button onClick={() => openProfile(student)} className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors">View</button>)}</div></td>)}</tr>))}</tbody></table></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredStudents.map((student) => (<div key={student.id} onClick={() => openProfile(student)} className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden flex flex-col relative"><div className="aspect-[3/4] w-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden">{student.photo_url ? (<img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />) : (<div className={`w-full h-full flex items-center justify-center font-bold text-4xl bg-gradient-to-br ${student.student_status === 'provisional' ? 'from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 text-amber-500 dark:text-amber-400' : 'from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 text-indigo-500 dark:text-indigo-400'}`}>{student.full_name.charAt(0)}</div>)}<div className={`absolute top-3 right-3 px-2 py-1 backdrop-blur-md text-white text-xs font-bold rounded-md shadow-lg ${student.student_status === 'provisional' ? 'bg-amber-500/90' : 'bg-green-500/90'}`}>{student.student_status === 'provisional' ? 'Pending' : 'Active'}</div></div><div className="p-4 flex flex-col flex-1"><h3 className="font-bold text-gray-900 dark:text-white truncate text-lg mb-1">{student.full_name}</h3><p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">{student.admission_no}</p><div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm"><span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><Phone className="w-3.5 h-3.5" /> {student.phone || 'N/A'}</span><div className="flex gap-1"><div className="p-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Eye className="w-4 h-4" /></div></div></div></div></div>))}
        </div>
      )}

      {/* Profile Modal, Confirmation Modals etc. */}
      {profileModalOpen && formData && (<div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={(e) => e.stopPropagation()}><div className="bg-white dark:bg-gray-800 w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in"><div className="w-full md:w-64 bg-gray-50 dark:bg-gray-900/50 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0 md:h-full"><div className="p-3 md:p-6 flex flex-row md:flex-col items-center gap-3 md:gap-0 border-b border-gray-200 dark:border-gray-700 md:border-b-0 shrink-0"><div className="w-10 h-10 md:w-24 md:h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-lg md:text-3xl font-bold text-indigo-600 dark:text-indigo-400 md:mb-3 relative group cursor-pointer border-2 border-dashed border-indigo-300 dark:border-indigo-700 shrink-0 overflow-hidden">{photoPreview ? (<img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />) : (formData.full_name.charAt(0))}<label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"><Camera className="w-6 h-6 text-white" /><input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} disabled={isUploadingPhoto} /></label></div><div className="text-left md:text-center overflow-hidden flex-1 md:flex-none"><h3 className="font-bold text-gray-900 dark:text-white truncate text-sm md:text-base">{formData.full_name}</h3><p className="text-xs text-gray-500 truncate">{formData.admission_no}</p></div><button onClick={() => setProfileModalOpen(false)} className="md:hidden ml-auto p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><X className="w-5 h-5" /></button></div><nav className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 md:p-4 gap-2 border-b md:border-b-0 border-gray-200 dark:border-gray-700 shrink-0 md:flex-1 min-h-0">{[{ id: 'personal', label: 'Personal', icon: User }, { id: 'academic', label: 'Academic', icon: BookOpen }, { id: 'parents', label: 'Parents', icon: Users }, { id: 'facilities', label: 'Facilities', icon: Bus }, { id: 'documents', label: 'Documents', icon: FileText }].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-shrink-0 flex items-center justify-center md:justify-start gap-2 px-3 py-2 md:py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}><tab.icon className="w-5 h-5 md:w-4 md:h-4" /> <span className={`${activeTab === tab.id ? 'inline' : 'hidden'} md:inline`}>{tab.label}</span></button>))}</nav>{formData.student_status === 'provisional' && (<div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700"><button onClick={() => setConfirmationModalOpen(true)} className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"><CheckCircle className="w-5 h-5" /> Approve Admission</button></div>)}</div><div className="flex-1 flex flex-col h-full overflow-hidden min-h-0"><div className="hidden md:flex p-4 border-b border-gray-200 dark:border-gray-700 justify-between items-center bg-white dark:bg-gray-800"><h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{activeTab.replace('-', ' ')}</h2><div className="flex gap-3"><button onClick={() => setProfileModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><X className="w-5 h-5" /></button></div></div><div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-800"><form id="profile-form" onSubmit={handleSaveProfile} className="space-y-6">{activeTab === 'personal' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1.5 md:col-span-2"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name <span className="text-red-500">*</span></label><input name="full_name" value={formData.full_name} onChange={handleInputChange} className={getInputClass('full_name')} placeholder="Student Full Name" required />{errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth <span className="text-red-500">*</span></label><input type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} className={getInputClass('dob')} />{errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender <span className="text-red-500">*</span></label><select name="gender" value={formData.gender} onChange={handleInputChange} className={getInputClass('gender')}><option value="male">Male</option><option value="female">Female</option></select>{errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Aadhar Number <span className="text-red-500">*</span></label><input name="aadhar_no" value={formData.aadhar_no || ''} onChange={handleInputChange} className={getInputClass('aadhar_no')} placeholder="12-digit number" maxLength={12} />{errors.aadhar_no && <p className="text-xs text-red-500">{errors.aadhar_no}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Blood Group</label><select name="blood_group" value={formData.blood_group || ''} onChange={handleInputChange} className="input-field"><option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option></select></div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Identification Mark</label><input name="identification_mark" value={formData.identification_mark || ''} onChange={handleInputChange} className="input-field" placeholder="Mole on right cheek..." /></div></div>)}{activeTab === 'academic' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Admission No</label><input name="admission_no" value={formData.admission_no || ''} className="input-field bg-gray-100 dark:bg-gray-700 cursor-not-allowed" readOnly /></div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Class <span className="text-red-500">*</span></label><select name="class_section" value={formData.class_section || ''} onChange={handleInputChange} className={getInputClass('class_section')}><option value="">Select</option>{availableClasses.map(c => (<option key={c} value={c}>{c}</option>))}</select>{errors.class_section && <p className="text-xs text-red-500">{errors.class_section}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Section <span className="text-red-500">*</span></label><select name="section" value={formData.section || ''} onChange={handleInputChange} className={getInputClass('section')}><option value="">Select</option>{availableSections.map(s => (<option key={s} value={s}>{s}</option>))}</select>{errors.section && <p className="text-xs text-red-500">{errors.section}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Admission Date</label><input type="date" value={new Date(formData.created_at).toISOString().split('T')[0]} className="input-field bg-gray-100 dark:bg-gray-700 cursor-not-allowed" readOnly /></div></div>)}{activeTab === 'parents' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Father Name <span className="text-red-500">*</span></label><input name="father_name" value={formData.father_name || ''} onChange={handleInputChange} className={getInputClass('father_name')} />{errors.father_name && <p className="text-xs text-red-500">{errors.father_name}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Father Qualification</label><input name="father_qualification" value={formData.father_qualification || ''} onChange={handleInputChange} className="input-field" /></div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mother Name <span className="text-red-500">*</span></label><input name="mother_name" value={formData.mother_name || ''} onChange={handleInputChange} className={getInputClass('mother_name')} />{errors.mother_name && <p className="text-xs text-red-500">{errors.mother_name}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mother Qualification</label><input name="mother_qualification" value={formData.mother_qualification || ''} onChange={handleInputChange} className="input-field" /></div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile No <span className="text-red-500">*</span></label><div className="relative"><Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" /><input name="phone" value={formData.phone || ''} onChange={handleInputChange} className={`!pl-10 ${getInputClass('phone')}`} maxLength={10} placeholder="10-digit number" /></div>{errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}</div><div className="space-y-1.5"><div className="flex justify-between items-center"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Whatsapp No</label><div className="flex items-center gap-2"><input type="checkbox" id="sameAsMobileAdm" checked={isWhatsappSame} onChange={handleSameAsMobileChange} className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" /><label htmlFor="sameAsMobileAdm" className="text-xs text-gray-500 cursor-pointer select-none">Same as Mobile</label></div></div><div className="relative"><MessageCircle className="absolute left-3 top-2.5 h-5 w-5 text-green-500" /><input name="whatsapp_no" value={formData.whatsapp_no || ''} onChange={handleInputChange} className={`!pl-10 ${getInputClass('whatsapp_no')}`} maxLength={10} placeholder="10-digit number" /></div>{errors.whatsapp_no && <p className="text-xs text-red-500">{errors.whatsapp_no}</p>}</div><div className="space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label><div className="relative"><div className="absolute left-3 top-2.5 text-gray-400">@</div><input name="email" value={formData.email || ''} onChange={handleInputChange} className={`!pl-10 ${getInputClass('email')}`} placeholder="email@example.com" /></div>{errors.email && <p className="text-xs text-red-500">{errors.email}</p>}</div><div className="col-span-1 md:col-span-2 space-y-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Residential Address <span className="text-red-500">*</span></label><div className="relative"><MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" /><textarea name="address" value={formData.address || ''} onChange={handleInputChange} className={`!pl-10 ${getInputClass('address')}`} rows={3} /></div>{errors.address && <p className="text-xs text-red-500">{errors.address}</p>}</div></div>)}{activeTab === 'facilities' && (<div className="space-y-4"><div className={`p-4 border rounded-xl bg-gray-50 dark:bg-gray-700/30 ${errors.fee_category ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}><div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400"><CreditCard className="w-5 h-5" /><h3 className="font-bold">Fee Category <span className="text-red-500">*</span></h3></div><select name="fee_category" value={formData.fee_category || ''} onChange={handleInputChange} className={getInputClass('fee_category')}><option value="">Select Fee Category</option><option value="Standard Fee">Standard Fee</option><option value="Scholarship">Scholarship</option><option value="Staff Child">Staff Child</option><option value="Sibling Discount">Sibling Discount</option></select>{errors.fee_category && <p className="text-xs text-red-500 mt-1">{errors.fee_category}</p>}</div><div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30"><div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400"><Bus className="w-5 h-5" /><h3 className="font-bold">Transport Route</h3></div><select name="transport_route" value={formData.transport_route || ''} onChange={handleInputChange} className="input-field"><option value="">No Transport Required</option><option value="Route 1">Route 1</option><option value="Route 2">Route 2</option></select></div><div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30"><div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400"><Home className="w-5 h-5" /><h3 className="font-bold">Hostel Accommodation</h3></div><select name="hostel_room" value={formData.hostel_room || ''} onChange={handleInputChange} className="input-field"><option value="">Day Scholar</option><option value="Block A - Boys">Block A - Boys</option><option value="Block B - Girls">Block B - Girls</option></select></div></div>)}{activeTab === 'documents' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderDocumentCard('Aadhar Card')}{renderDocumentCard('Transfer Certificate')}{renderDocumentCard('Birth Certificate')}{renderDocumentCard('Previous Report Card')}</div>)}</form></div><div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 shrink-0 pb-6 md:pb-4 z-10 relative"><button onClick={() => setProfileModalOpen(false)} className="md:hidden px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-xl">Close</button><button onClick={handleSaveProfile} disabled={isSaving} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20">{isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Changes</button></div></div></div></div>)}{isEditorOpen && selectedImageSrc && (<ImageEditor imageSrc={selectedImageSrc} onClose={() => setIsEditorOpen(false)} onSave={handleEditorSave} />)}{successModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center transform transition-all scale-100 animate-scale-in"><div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-500"><CheckCircle className="w-8 h-8" /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Admission Finalized!</h3><p className="text-gray-500 dark:text-gray-400 mb-6">The student profile is now active and has been moved to the Student Management list.</p><button onClick={() => setSuccessModalOpen(false)} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700">Continue</button></div></div>)}{confirmationModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-scale-in"><div className="p-6 text-center"><div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-500"><AlertTriangle className="w-8 h-8" /></div><h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Finalize Admission?</h3><p className="text-gray-500 dark:text-gray-400 mb-6">This will mark the student as 'Active' and finalize their admission process. This action cannot be undone. Are you sure?</p><div className="flex gap-3 justify-center"><button onClick={() => setConfirmationModalOpen(false)} disabled={isSaving} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button><button onClick={handleFinalizeAdmission} disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-green-600 text-white flex items-center gap-2">{isSaving && <Loader2 className="w-4 h-4 animate-spin" />}Confirm & Finalize</button></div></div></div></div>)}{importModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 animate-scale-in flex flex-col max-h-[90vh]"><div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center"><h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><UploadCloud className="w-6 h-6 text-indigo-500" /> Bulk Student Admission</h3><button onClick={() => setImportModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"><X className="w-5 h-5" /></button></div><div className="p-6 overflow-y-auto space-y-4"><div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 flex items-start gap-3"><Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-indigo-700 dark:text-indigo-300">Download the CSV template, fill in the student details, and upload the file. The system will automatically generate admission numbers and import the students.</p></div><div className="flex gap-3"><button onClick={downloadTemplate} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600"><Download className="w-4 h-4" /> Download Template</button><label className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700"><Upload className="w-4 h-4" /> Upload CSV<input type="file" className="hidden" accept=".csv" onChange={handleFileChange} /></label></div>{parsedImportData.length > 0 && (<div className="pt-4"><h4 className="font-semibold mb-2">Data Preview ({parsedImportData.length} records)</h4><div className="max-h-60 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg"><table className="w-full text-xs"><thead><tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-gray-500"><th className="p-2">Name</th><th className="p-2">Class</th><th className="p-2">Phone</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-700">{parsedImportData.slice(0, 10).map((s, i) => (<tr key={i}><td className="p-2">{s.full_name}</td><td className="p-2">{s.class_section}</td><td className="p-2">{s.phone}</td></tr>))}</tbody></table></div>{parsedImportData.length > 10 && <p className="text-xs text-gray-500 mt-1">...and {parsedImportData.length - 10} more records.</p>}</div>)}</div><div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3"><button onClick={() => setImportModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button><button onClick={handleImport} disabled={isImporting || parsedImportData.length === 0} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white flex items-center gap-2 disabled:opacity-50">{isImporting && <Loader2 className="w-4 h-4 animate-spin" />}Process Import</button></div></div></div>)}
      <style>{`.input-field { width: 100%; padding: 10px 16px; border-radius: 0.75rem; border: 1px solid #d1d5db; background-color: #f9fafb; outline: none; transition: all 0.2s; } .dark .input-field { border-color: #4b5563; background-color: rgba(17, 24, 39, 0.5); color: white; } .input-field:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); }`}</style>
    </div>
  );
};