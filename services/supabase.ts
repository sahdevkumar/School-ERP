
import { createClient } from '@supabase/supabase-js';
import { 
  Student, 
  Employee, 
  SystemUser, 
  DashboardStats, 
  AttendanceRecord, 
  StudentDemographic, 
  DashboardLayoutConfig, 
  AdminPanelConfig, 
  NavItem, 
  RolePermissions, 
  UserFieldConfig, 
  AdmissionEnquiry, 
  StudentRegistration,
  StudentDocument,
  EmployeeDocument,
  UserLog,
  FeeStructure,
  StudentFeeDue,
  FeePayment,
  Expense,
  SystemPermissions
} from '../types';

// Safe environment variable access
const getEnvVar = (key: string): string => {
  try {
    // Check import.meta.env (Vite standard)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  try {
    // Check process.env (Node/Compat)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  return '';
};

// Provide fallback to prevent crash on initialization if env vars are missing
const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getErrorMessage = (error: any) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return JSON.stringify(error);
};

const isMockMode = () => {
  return SUPABASE_URL === 'https://placeholder.supabase.co' || localStorage.getItem('mock_session') === 'true';
};

class DBService {
  async checkConnection(): Promise<boolean> {
      try {
        // If using placeholder, connection is definitely false
        if (SUPABASE_URL === 'https://placeholder.supabase.co') return false;
        
        const { error } = await supabase.from('system_settings').select('count', { count: 'exact', head: true });
        return !error;
      } catch {
        return false;
      }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return { totalStudents: 0, totalEmployees: 0, attendanceRate: 0, revenue: 0 }; 
  }
  async getAttendanceData(): Promise<AttendanceRecord[]> { return []; }
  async getDemographics(): Promise<StudentDemographic[]> { return []; }
  async getRecentStudents(): Promise<Student[]> { return []; }
  async getDashboardLayout(): Promise<DashboardLayoutConfig> { return {} as any; }
  
  async getSystemSettings(): Promise<any> { return {}; }
  async saveSystemSettings(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  
  async getMenuLayout(): Promise<NavItem[]> {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_menu_layout').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { /* ignore */ }
    
    // Default Layout with Finance Added
    return [
        { label: 'Dashboard', icon: 'LayoutDashboard', href: 'dashboard' },
        { 
          label: 'Reception', icon: 'Phone', 
          children: [
             { label: 'Admission Enquiry', href: 'admission-enquiry', icon: 'Circle' },
             { label: 'Registration', href: 'registration', icon: 'Circle' },
             { label: 'Admission', href: 'admission', icon: 'Circle' }
          ]
        },
        { label: 'Students', icon: 'GraduationCap', href: 'students' },
        { label: 'Employee', icon: 'Users', href: 'employees' },
        {
          label: 'Finance', icon: 'Banknote',
          children: [
             { label: 'Overview', href: 'finance-overview', icon: 'Circle' },
             { label: 'Collect Fees', href: 'finance-collection', icon: 'Circle' },
             { label: 'Fee Structures', href: 'finance-structures', icon: 'Circle' },
             { label: 'Expenses', href: 'finance-expenses', icon: 'Circle' }
          ]
        },
        { 
          label: 'Activity Control', icon: 'Activity', 
          children: [
             { label: 'User Log', href: 'user-logs', icon: 'Circle' },
          ]
        },
        { label: 'Recycle Bin', icon: 'Trash2', href: 'recycle-bin' },
        { 
          label: 'Settings', icon: 'Settings', 
          children: [
             { label: 'Global Settings', href: 'global-settings', icon: 'Circle' },
             { label: 'School Settings', href: 'school-settings', icon: 'Circle' },
             { label: 'Layout Configuration', href: 'dashboard-layout', icon: 'Circle' },
             { label: 'Role & Permissions', href: 'role-permissions', icon: 'Circle' },
             { label: 'User Management', href: 'settings-users', icon: 'Circle' },
             { label: 'User Configuration', href: 'user-configuration', icon: 'Circle' },
             { label: 'Student Fields', href: 'system-student-field', icon: 'Circle' },
             { label: 'Menu Layout', href: 'menu-layout', icon: 'Circle' }
          ]
        },
      ];
  }

  async saveMenuLayout(data: NavItem[]): Promise<{success: boolean, error?: any}> { return { success: true }; }
  
  async getCurrentUserProfile(email: string): Promise<SystemUser | null> { 
    if (isMockMode()) {
      return {
        id: 0,
        full_name: 'Demo Admin',
        email: email,
        role: 'Super Admin',
        status: 'active',
        created_at: new Date().toISOString()
      };
    }
    
    try {
      const { data } = await supabase.from('system_users').select('*').eq('email', email).single();
      return data;
    } catch (e) {
      return null;
    }
  }

  async logout() { 
    localStorage.removeItem('mock_session');
    return supabase.auth.signOut(); 
  }
  
  async getStudentFields(): Promise<{ classes: string[], sections: string[], subjects: string[] }> { 
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_student_fields').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { }
    return { 
      classes: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'], 
      sections: ['A', 'B', 'C'], 
      subjects: ['Math', 'Science', 'English'] 
    }; 
  }
  async saveStudentFields(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }

  async getAdmissionEnquiries(): Promise<AdmissionEnquiry[]> { return []; }
  async updateAdmissionEnquiry(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async createAdmissionEnquiry(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async deleteAdmissionEnquiry(id: number): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async getRecycleBinItems(): Promise<AdmissionEnquiry[]> { return []; }
  async restoreAdmissionEnquiry(id: number): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async permanentDeleteAdmissionEnquiry(id: number): Promise<{success: boolean, error?: any}> { return { success: true }; }

  async getRegistrations(): Promise<StudentRegistration[]> { return []; }
  async createRegistration(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async checkRegistrationExists(phone: string): Promise<boolean> { return false; }
  async approveRegistration(id: number): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async updateRegistrationStatus(id: number, status: string): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async markRegistrationAsCompleted(id: number): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async deleteRegistration(id: number): Promise<{success: boolean, error?: any}> { return { success: true }; }

  async getProvisionalStudents(): Promise<Student[]> { return []; }
  async getAllStudentsRaw(): Promise<Student[]> { 
    try {
      const { data } = await supabase.from('students').select('*').order('id', { ascending: false });
      return data || [];
    } catch { return []; }
  }
  async getInactiveStudents(): Promise<Student[]> {
    const { data } = await supabase.from('students').select('*').eq('student_status', 'inactive').order('id', { ascending: false });
    return data || [];
  }
  async getAllStudents(): Promise<Student[]> {
    const { data } = await supabase.from('students').select('*').eq('student_status', 'active').order('id', { ascending: false });
    return data || [];
  }
  
  async updateStudent(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async finalizeStudentAdmission(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async getStudentDocuments(id: number): Promise<StudentDocument[]> { return []; }
  async uploadStudentDocument(file: File, id: number, type: string): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async uploadProfilePhoto(file: File): Promise<{publicUrl?: string, error?: any}> { return { publicUrl: '' }; }
  async toggleStudentStatus(id: number, status: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('students').update({ student_status: status }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  async getEmployees(): Promise<Employee[]> { return []; }
  async addEmployee(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async updateEmployee(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async getEmployeeDocuments(id: number): Promise<EmployeeDocument[]> { return []; }
  
  async getDepartments(): Promise<string[]> { return []; }
  async getDesignations(): Promise<string[]> { return []; }
  async saveDepartments(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async saveDesignations(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }

  async getSystemUsers(): Promise<SystemUser[]> { return []; }
  async createSystemUser(data: any): Promise<{success: boolean, error?: any, warning?: string}> { return { success: true }; }
  async updateSystemUser(data: any): Promise<{success: boolean, error?: any, warning?: string}> { return { success: true }; }
  async deleteSystemUser(id: number): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async getUserConfiguration(): Promise<{ userTypes: string[], userFields: UserFieldConfig[] }> { return { userTypes: [], userFields: [] }; }
  async saveUserConfiguration(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async ensureCustomFieldsSchema(): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async uploadSystemAsset(file: File, bucket: string): Promise<{publicUrl?: string, error?: any}> { return { publicUrl: '' }; }
  
  async getUserLogs(): Promise<UserLog[]> { return []; }
  
  async getAdminPanelConfig(): Promise<AdminPanelConfig> { return {} as any; }
  async saveAdminPanelConfig(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async getRolePermissions(): Promise<SystemPermissions> { return {}; }
  async saveRolePermissions(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }
  async saveDashboardLayout(data: any): Promise<{success: boolean, error?: any}> { return { success: true }; }

  async login(email: string, password: string): Promise<{error?: any}> {
    // 1. Try Real Supabase Auth (if configured)
    if (SUPABASE_URL !== 'https://placeholder.supabase.co') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return { error: null };
        // If it's a legitimate auth error (wrong password), return it
        if (error.message !== 'FetchError: Failed to fetch' && error.status !== 500) {
             return { error: error.message };
        }
    }

    // 2. Mock Fallback (for demo/placeholder/offline)
    // Accept standard demo credentials
    if (email === 'admin@school.com') { // Allow any password for demo ease
        localStorage.setItem('mock_session', 'true');
        return { error: null };
    }

    return { error: 'Invalid credentials. (Demo: Use admin@school.com)' };
  }

  async register(email: string, password: string, fullName: string): Promise<{error?: any}> {
    if (SUPABASE_URL !== 'https://placeholder.supabase.co') {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        return { error: error ? error.message : null };
    }
    return { error: "Registration is not available in demo mode." };
  }

  async resendConfirmationEmail(email: string): Promise<{success: boolean, error?: any}> {
     if (SUPABASE_URL !== 'https://placeholder.supabase.co') {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });
        return { success: !error, error: error?.message };
     }
     return { success: true };
  }

  async bulkCreateStudents(students: Partial<Student>[]): Promise<{ success: boolean; count: number; error?: any }> {
    try {
      const studentsWithAdmNo = students.map((s) => ({
        ...s,
        admission_no: `ADM-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        created_at: new Date().toISOString(),
        student_status: 'active'
      }));
      
      const { error } = await supabase.from('students').insert(studentsWithAdmNo);
      if (error) throw error;
      return { success: true, count: students.length };
    } catch (error) { return { success: false, count: 0, error: getErrorMessage(error) }; }
  }

  async seedDummyStudents(): Promise<{ success: boolean; count: number; error?: any }> {
    try {
      const dummyStudents: Partial<Student>[] = [];
      const classes = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
      const sections = ['A', 'B', 'C'];
      const genders = ['male', 'female'];
      const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Anaya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Myra', 'Pari', 'Riya', 'Anvi', 'Aaradhya', 'Rohan', 'Priya', 'Rahul', 'Sneha', 'Amit', 'Pooja', 'Suresh', 'Neame'];
      const lastNames = ['Sharma', 'Verma', 'Gupta', 'Mehta', 'Singh', 'Patel', 'Kumar', 'Das', 'Chopra', 'Reddy', 'Nair', 'Jain', 'Agarwal', 'Bhat', 'Rao', 'Saxena', 'Iyer', 'Khan', 'Mishra'];

      for (let i = 0; i < 100; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const gender = genders[Math.floor(Math.random() * genders.length)];
        const cls = classes[Math.floor(Math.random() * classes.length)];
        const sec = sections[Math.floor(Math.random() * sections.length)];
        const uniqueId = Math.floor(Math.random() * 1000000);
        
        dummyStudents.push({
          full_name: `${firstName} ${lastName}`,
          gender: gender,
          dob: new Date(2005 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${uniqueId}@example.com`,
          phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
          address: `${Math.floor(Math.random() * 100)} Block ${String.fromCharCode(65 + Math.floor(Math.random() * 6))}, ${['Street 1', 'MG Road', 'Park Avenue', 'Civil Lines'][Math.floor(Math.random()*4)]}, City`,
          father_name: `Mr. ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${lastName}`,
          mother_name: `Mrs. ${lastNames[Math.floor(Math.random() * lastNames.length)]} ${lastName}`,
          class_section: cls,
          section: sec,
          admission_no: `ADM-${new Date().getFullYear()}-${uniqueId}`,
          student_status: 'active',
          created_at: new Date().toISOString(),
          fee_category: ['Standard Fee', 'Scholarship', 'Sibling Discount'][Math.floor(Math.random() * 3)]
        });
      }

      const { error } = await supabase.from('students').insert(dummyStudents);
      if (error) throw error;
      return { success: true, count: 100 };
    } catch (error) {
      return { success: false, count: 0, error: getErrorMessage(error) };
    }
  }

  // --- FINANCE METHODS ---
  async getFeeStructures(): Promise<FeeStructure[]> {
    const { data } = await supabase.from('fee_structures').select('*');
    return data || [];
  }

  async saveFeeStructure(fee: FeeStructure): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('fee_structures').upsert(fee);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  async deleteFeeStructure(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('fee_structures').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  async getExpenses(): Promise<Expense[]> {
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    return data || [];
  }

  async addExpense(expense: Expense): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('expenses').insert([expense]);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  async deleteExpense(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  // Mocking detailed student dues logic as complex SQL logic is usually needed
  async getStudentFeeDues(studentId: number): Promise<StudentFeeDue[]> {
    try {
      // In a real app, this would query a joined table or view
      // For now, we'll return mock data based on existing structures if table is missing
      const { data, error } = await supabase.from('student_fee_dues').select('*').eq('student_id', studentId);
      if (!error && data) return data;
      
      return [];
    } catch (e) { return []; }
  }

  async collectFee(payment: FeePayment): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('fee_payments').insert([payment]);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
}

export const dbService = new DBService();
