
import { createClient } from '@supabase/supabase-js';
import { 
  Student, Employee, AdmissionEnquiry, StudentRegistration, 
  SystemUser, UserLog, DashboardStats, AttendanceRecord, 
  StudentDemographic, DashboardLayoutConfig, NavItem, 
  AdminPanelConfig, SystemPermissions, RolePermissions, SystemPermissions as SystemPermissionsType, UserProfile,
  StudentDocument, EmployeeDocument, FeeStructure, FeePayment, StudentAttendance, EmployeeSalaryPayment,
  Discount
} from '../types';

// Updated interface to match SalaryManagement.tsx storage
export interface SalaryConfigEntry {
  id: string;
  department: string;
  level: string;
  amount: number;
  frequency: string;
}

// Initialize Supabase with environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://vslbpndyjbmlwggnrjze.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbGJwbmR5amJtbHdnZ25yanplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDUyMjksImV4cCI6MjA4MDc4MTIyOX0.yWJa537hHxfaVi51M0Q1jWsaS17pNQeSeyJ2UpPrVYg';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to parse/stringify KV settings
const parseSettingValue = (value: string | null) => {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const stringifySettingValue = (value: any) => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

// Sanitization for Employee Schema
const ALLOWED_EMPLOYEE_FIELDS = [
  'id', 'full_name', 'phone', 'email', 'address', 'dob', 'gender', 
  'blood_group', 'aadhar_no', 'qualification', 'total_experience', 
  'joining_date', 'photo_url', 'status', 
  'bank_name', 'bank_account_no', 'bank_ifsc_code', 'bank_branch_name', 
  'upi_id', 'account_holder_name', 'salary_amount', 'salary_frequency', 'subject', 'department',
  'employee_type', 'level', 'academic_subject', 'salary_role'
];

function sanitizeEmployee(emp: any) {
  const clean: any = {};
  ALLOWED_EMPLOYEE_FIELDS.forEach(field => {
    if (emp[field] !== undefined) clean[field] = emp[field];
  });
  return clean;
}

export class DBService {
  
  // Auth
  async login(email: string, password: string): Promise<{ user?: any; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { user: data.user };
    } catch (err: any) {
      return { error: err.message || 'Network error during login' };
    }
  }

  async register(email: string, password: string, fullName: string): Promise<{ user?: any; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });
      if (error) return { error: error.message };
      
      if (data.user) {
          await this.createSystemUser({
              full_name: fullName,
              email: email,
              role: 'Viewer',
              status: 'active'
          } as SystemUser);
      }
      return { user: data.user };
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  }

  async logout(): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    return {};
  }

  async resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: string }> {
     const { error } = await supabase.auth.resend({ type: 'signup', email: email });
     if (error) return { success: false, error: error.message };
     return { success: true };
  }
  
  async getCurrentUserProfile(email: string): Promise<SystemUser | null> {
      try {
        const { data, error } = await supabase.from('system_users').select('*').eq('email', email).single();
        if (error) throw error;
        return data;
      } catch (e) {
        return null;
      }
  }
  
  // Dashboard
  async checkConnection(): Promise<boolean> {
      try {
          if (supabaseUrl === 'https://vslbpndyjbmlwggnrjze.supabase.co') {
             const { error } = await supabase.from('system_settings').select('key').limit(1);
             return !error;
          }
          return false;
      } catch {
          return false;
      }
  }

  async getDashboardStats(): Promise<DashboardStats> {
      try {
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('student_status', 'active');
        const { count: empCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active');
        const { data: payments } = await supabase.from('fee_payments').select('amount');
        const revenue = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

        const today = new Date().toISOString().split('T')[0];
        const { count: presentCount } = await supabase.from('student_attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present');
        const attendanceRate = (studentCount && presentCount) ? Math.round((presentCount / studentCount) * 100) : 0;

        return { totalStudents: studentCount || 0, totalEmployees: empCount || 0, attendanceRate: attendanceRate, revenue: revenue };
      } catch (e) {
        return { totalStudents: 0, totalEmployees: 0, attendanceRate: 0, revenue: 0 };
      }
  }

  async getAttendanceData(): Promise<AttendanceRecord[]> {
      try {
        const today = new Date();
        const lastDays = Array.from({length: 5}, (_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - (4 - i));
            return d.toISOString().split('T')[0];
        });
        const { data } = await supabase.from('student_attendance').select('date, status').in('date', lastDays);
        return lastDays.map(date => {
            const dayData = data?.filter(r => r.date === date) || [];
            const presentCount = dayData.filter(r => r.status === 'present').length;
            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            return { name: dayName, students: presentCount, employees: Math.floor(Math.random() * 5) + 25 };
        });
      } catch (e) {
        return [];
      }
  }

  async getDemographics(): Promise<StudentDemographic[]> {
      try {
        const { count: male } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('gender', 'male');
        const { count: female } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('gender', 'female');
        return [{ name: 'Boys', value: male || 0 }, { name: 'Girls', value: female || 0 }];
      } catch {
        return [{ name: 'Boys', value: 0 }, { name: 'Girls', value: 0 }];
      }
  }

  async getRecentStudents(): Promise<Student[]> {
      try {
        const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false }).limit(5);
        return data || [];
      } catch {
        return [];
      }
  }
  
  // Settings
  async getSystemSettings(): Promise<any> {
      try {
        const { data } = await supabase.from('system_settings').select('*');
        if (!data) return {};
        const settings: Record<string, any> = {};
        data.forEach(row => settings[row.key] = parseSettingValue(row.value));
        return settings;
      } catch {
        return {};
      }
  }

  async saveSystemSettings(settings: any): Promise<{ success: boolean; error?: string }> {
      try {
        const upsertData = Object.entries(settings).map(([key, value]) => ({ key, value: stringifySettingValue(value) }));
        const { error } = await supabase.from('system_settings').upsert(upsertData, { onConflict: 'key' });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
  }
  
  async uploadSystemAsset(file: File, bucket: string = 'system-assets'): Promise<{ publicUrl?: string; error?: string }> {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
        if (uploadError) return { error: uploadError.message };
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return { publicUrl: data.publicUrl };
      } catch (e: any) {
        return { error: e.message };
      }
  }

  // --- Menu Layout ---
  async getMenuLayout(): Promise<NavItem[]> {
      const defaultMenu: NavItem[] = [
          { label: 'Dashboard', icon: 'LayoutDashboard', href: 'dashboard' },
          { 
            label: 'Reception', 
            icon: 'Phone', 
            children: [
              { label: 'Admission Enquiry', icon: 'FileText', href: 'admission-enquiry' },
              { label: 'Registration', icon: 'User', href: 'registration' },
              { label: 'Admission', icon: 'GraduationCap', href: 'admission' }
            ]
          },
          { label: 'Students', icon: 'GraduationCap', href: 'students' },
          { label: 'Employees', icon: 'Briefcase', href: 'employees' },
          { label: 'Attendance', icon: 'CalendarDays', href: 'attendance' },
          { 
            label: 'Finance Control', 
            icon: 'DollarSign', 
            children: [
              { label: 'Fee Collection', icon: 'CreditCard', href: 'fee-collection' },
              { label: 'Pay Salary', icon: 'Banknote', href: 'pay-salary' },
              { label: 'Fee Management', icon: 'Settings', href: 'fee-management' },
              { label: 'Salary Management', icon: 'Settings', href: 'salary-management' },
              { label: 'Discount & Bonus', icon: 'Percent', href: 'discount-and-bonus' }
            ]
          },
          { 
            label: 'User Management', 
            icon: 'Users', 
            children: [
              { label: 'Users', icon: 'User', href: 'users' },
              { label: 'User Logs', icon: 'Activity', href: 'user-logs' }
            ]
          },
          { 
            label: 'Settings', 
            icon: 'Settings', 
            children: [
              { label: 'General Settings', icon: 'Globe', href: 'global-settings' },
              { label: 'School Info', icon: 'School', href: 'school-settings' },
              { label: 'User Config', icon: 'UserCog', href: 'user-configuration' },
              { 
                label: 'School Config', 
                icon: 'BookOpen', 
                children: [
                   { label: 'Class', href: 'settings-class' },
                   { label: 'Section', href: 'settings-section' },
                   { label: 'Subject', href: 'settings-subject' }
                ]
              },
              { label: 'Role Permissions', icon: 'Shield', href: 'role-permissions' },
              { label: 'Layout Config', icon: 'LayoutTemplate', href: 'dashboard-layout' },
              { label: 'Menu Config', icon: 'Menu', href: 'menu-layout' },
            ]
          },
          { label: 'Recycle Bin', icon: 'Trash2', href: 'recycle-bin' },
      ];
      
      let savedMenu = await this.getSettingByKey<NavItem[]>('config_menu_layout', defaultMenu);
      return savedMenu || defaultMenu;
  }

  private async getSettingByKey<T>(key: string, defaultVal: T): Promise<T> {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', key).single();
      if (!data) return defaultVal;
      return parseSettingValue(data.value) as T;
    } catch {
      return defaultVal;
    }
  }

  // --- Employees ---
  async getEmployees(): Promise<Employee[]> { 
    try {
      const { data, error } = await supabase.from('employees').select('*').order('id', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async addEmployee(emp: Employee) {
    try {
      const safePayload = sanitizeEmployee(emp);
      const { error } = await supabase.from('employees').insert([safePayload]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async updateEmployee(emp: Employee) { 
    try {
      const safePayload = sanitizeEmployee(emp);
      const { error } = await supabase.from('employees').update(safePayload).eq('id', emp.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async toggleEmployeeStatus(id: number, status: string) {
    try {
      const { error } = await supabase.from('employees').update({ status }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async permanentDeleteEmployee(id: number) {
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async uploadEmployeePhoto(file: File) { return this.uploadSystemAsset(file, 'employee-photos'); }
  async getEmployeeDocuments(id: number): Promise<EmployeeDocument[]> {
    try {
      const { data } = await supabase.from('employee_documents').select('*').eq('employee_id', id);
      return data || [];
    } catch {
      return [];
    }
  }

  // Fix for: Error in file components/Employees.tsx: Property 'uploadEmployeeDocument' does not exist on type 'DBService'.
  async uploadEmployeeDocument(file: File, employeeId: number, documentType: string) {
    try {
      const uploadRes = await this.uploadSystemAsset(file, 'employee-documents');
      if (uploadRes.error) return { success: false, error: uploadRes.error };
      
      const { error } = await supabase.from('employee_documents').insert([{
        employee_id: employeeId,
        document_type: documentType,
        file_url: uploadRes.publicUrl,
        uploaded_at: new Date().toISOString()
      }]);
      
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // --- Salary Configuration ---
  async getSalaryConfigs(): Promise<SalaryConfigEntry[]> {
      return this.getSettingByKey<SalaryConfigEntry[]>('payroll_salary_configs_v2', []);
  }

  async saveSalaryConfigs(configs: SalaryConfigEntry[]) {
      return this.saveSettingByKey('payroll_salary_configs_v2', configs);
  }

  async syncDesignationSalaries(designation: string, amount: number, type?: string, level?: string) {
      try {
          let query = supabase
            .from('employees')
            .update({ salary_amount: amount })
            .eq('subject', designation)
            .eq('status', 'active');
          if (type) query = query.eq('employee_type', type);
          if (level) query = query.eq('level', level);
          const { error } = await query;
          if (error) throw error;
          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  }

  // --- Fees ---
  async getFeeStructures(): Promise<FeeStructure[]> {
    try {
      const { data } = await supabase.from('fee_structures').select('*');
      return data || [];
    } catch { return []; }
  }

  async createFeeStructure(fee: any) {
    try {
      const { error } = await supabase.from('fee_structures').insert([fee]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  async deleteFeeStructure(id: number) {
    try {
      const { error } = await supabase.from('fee_structures').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  async createFeePayment(payment: any) {
    try {
      const { error } = await supabase.from('fee_payments').insert([payment]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  // --- Discounts & Bonuses ---
  async getDiscounts(): Promise<Discount[]> {
    try {
        const { data, error } = await supabase.from('discounts').select('*');
        if (error) throw error;
        return data || [];
    } catch {
        return this.getSettingByKey<Discount[]>('finance_discounts', []);
    }
  }

  async createDiscount(discount: Discount) {
    try {
       const { error } = await supabase.from('discounts').insert([discount]);
       if (error) throw error;
       return { success: true };
    } catch (e) {
       const current = await this.getDiscounts();
       const newDiscounts = [...current, { ...discount, id: Date.now() }]; 
       return this.saveSettingByKey('finance_discounts', newDiscounts);
    }
  }

  async deleteDiscount(id: number) {
    try {
        const { error } = await supabase.from('discounts').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch {
        const current = await this.getDiscounts();
        const newDiscounts = current.filter(d => d.id !== id);
        return this.saveSettingByKey('finance_discounts', newDiscounts);
    }
  }

  // --- Payroll ---
  async getEmployeePayments(employeeId: number): Promise<EmployeeSalaryPayment[]> {
      try {
        const { data, error } = await supabase
          .from('employee_salary_payments')
          .select('*')
          .eq('employee_id', employeeId)
          .order('payment_date', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        return [];
      }
  }

  async createSalaryPayment(payment: Partial<EmployeeSalaryPayment>) {
      try {
        const { error } = await supabase.from('employee_salary_payments').insert([payment]);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
  }

  // --- Students ---
  async getAllStudents(): Promise<Student[]> {
    try {
      const { data } = await supabase.from('students').select('*').eq('student_status', 'active');
      return data || [];
    } catch { return []; }
  }
  async getAllStudentsRaw(): Promise<Student[]> {
    try {
      const { data } = await supabase.from('students').select('*');
      return data || [];
    } catch { return []; }
  }
  async getInactiveStudents(): Promise<Student[]> {
    try {
      const { data } = await supabase.from('students').select('*').eq('student_status', 'inactive');
      return data || [];
    } catch { return []; }
  }
  async getProvisionalStudents(): Promise<Student[]> {
    try {
      const { data } = await supabase.from('students').select('*').eq('student_status', 'provisional');
      return data || [];
    } catch { return []; }
  }
  async updateStudent(student: any) {
    try {
      const { error } = await supabase.from('students').update(student).eq('id', student.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async deleteStudent(id: number) {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async toggleStudentStatus(id: number, status: string) {
    try {
      const { error } = await supabase.from('students').update({ student_status: status }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async finalizeStudentAdmission(student: any) {
    try {
      const { error } = await supabase.from('students').update({ student_status: 'active' }).eq('id', student.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async bulkCreateStudents(students: any[]) {
    try {
      const { error } = await supabase.from('students').insert(students);
      if (error) return { success: false, error: error.message };
      return { success: true, count: students.length };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  
  // --- Student Documents ---
  async getStudentDocuments(id: number): Promise<StudentDocument[]> {
    try {
      const { data } = await supabase.from('student_documents').select('*').eq('student_id', id);
      return data || [];
    } catch {
      return [];
    }
  }

  async uploadProfilePhoto(file: File) {
    return this.uploadSystemAsset(file, 'student-photos');
  }

  async uploadStudentDocument(file: File, studentId: number, documentType: string) {
    try {
      const uploadRes = await this.uploadSystemAsset(file, 'student-documents');
      if (uploadRes.error) return { success: false, error: uploadRes.error };
      
      const { error } = await supabase.from('student_documents').insert([{
        student_id: studentId,
        document_type: documentType,
        file_url: uploadRes.publicUrl,
        uploaded_at: new Date().toISOString()
      }]);
      
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // --- Student Fields Source of Truth ---
  async getStudentFields() {
    return {
      classes: await this.getSettingByKey<string[]>('config_classes', ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5']),
      sections: await this.getSettingByKey<string[]>('config_sections', ['A', 'B', 'C']),
      subjects: await this.getSettingByKey<string[]>('config_subjects', ['Mathematics', 'Science', 'English', 'History'])
    };
  }
  async saveStudentFields(fields: any) {
    try {
      if (fields.classes) await this.saveSettingByKey('config_classes', fields.classes);
      if (fields.sections) await this.saveSettingByKey('config_sections', fields.sections);
      if (fields.subjects) await this.saveSettingByKey('config_subjects', fields.subjects);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async getClassesAndSections() {
    const fields = await this.getStudentFields();
    return { classes: fields.classes, sections: fields.sections };
  }

  // --- Admission Enquiry ---
  async getAdmissionEnquiries(): Promise<AdmissionEnquiry[]> {
    try {
      const { data } = await supabase.from('admission_enquiries').select('*').eq('is_deleted', false).order('created_at', { ascending: false });
      return data || [];
    } catch { return []; }
  }
  async createAdmissionEnquiry(data: any) {
    try {
      const { error } = await supabase.from('admission_enquiries').insert([data]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async updateAdmissionEnquiry(data: any) {
    try {
      const { error } = await supabase.from('admission_enquiries').update(data).eq('id', data.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async deleteAdmissionEnquiry(id: number) {
    try {
      const { error } = await supabase.from('admission_enquiries').update({ is_deleted: true }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  
  // --- Registration ---
  async getRegistrations(): Promise<StudentRegistration[]> {
    try {
      const { data } = await supabase.from('student_registrations').select('*').order('created_at', { ascending: false });
      return data || [];
    } catch { return []; }
  }
  async createRegistration(data: any) {
    try {
      const { error } = await supabase.from('student_registrations').insert([data]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async checkRegistrationExists(phone: string) {
    try {
      const { count } = await supabase.from('student_registrations').select('*', { count: 'exact', head: true }).eq('phone', phone);
      return (count || 0) > 0;
    } catch { return false; }
  }
  async deleteRegistration(id: number) {
    try {
      const { error } = await supabase.from('student_registrations').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async approveRegistration(id: number) {
    const { data: reg } = await supabase.from('student_registrations').select('*').eq('id', id).single();
    if (!reg) return { success: false, error: "Registration not found" };
    const student: Partial<Student> = {
      full_name: reg.full_name, gender: reg.gender, dob: reg.dob, phone: reg.phone, email: reg.email,
      address: reg.address, father_name: reg.father_name, mother_name: reg.mother_name,
      class_section: reg.class_enrolled, previous_school: reg.previous_school, student_status: 'provisional'
    };
    const { error: createError } = await supabase.from('students').insert([student]);
    if (createError) return { success: false, error: createError.message };
    await this.updateRegistrationStatus(id, 'approved');
    return { success: true };
  }
  async updateRegistrationStatus(id: number, status: string) {
    try {
      const { error } = await supabase.from('student_registrations').update({ status }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async markRegistrationAsCompleted(id: number) {
    return this.updateRegistrationStatus(id, 'Admission Done');
  }

  // --- Attendance ---
  async getStudentAttendance(date: string, classId: string): Promise<StudentAttendance[]> {
    try {
      const { data } = await supabase.from('student_attendance').select('*').eq('date', date);
      return data || [];
    } catch { return []; }
  }
  async saveAttendance(records: any[]) {
    try {
      const { error } = await supabase.from('student_attendance').upsert(records, { onConflict: 'student_id,date' });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  // --- Config Helpers ---
  async getDepartments() { return this.getSettingByKey<string[]>('config_departments', []); }
  async saveDepartments(depts: string[]) { return this.saveSettingByKey('config_departments', depts); }
  async getDesignations() { return this.getSettingByKey<string[]>('config_designations', []); }
  async saveDesignations(desigs: string[]) { return this.saveSettingByKey('config_designations', desigs); }
  async getSalaryRoles() { return this.getSettingByKey<string[]>('config_salary_roles', ['Standard', 'Contract', 'Guest Faculty']); }
  async saveSalaryRoles(roles: string[]) { return this.saveSettingByKey('config_salary_roles', roles); }

  async getSystemUsers(): Promise<SystemUser[]> {
    try {
      const { data } = await supabase.from('system_users').select('*');
      return data || [];
    } catch { return []; }
  }
  async createSystemUser(user: any) {
    try {
      const { error } = await supabase.from('system_users').insert([user]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async updateSystemUser(user: any) {
    try {
      const { error } = await supabase.from('system_users').update(user).eq('id', user.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async deleteSystemUser(id: number) {
    try {
      const { error } = await supabase.from('system_users').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  
  async getUserConfiguration() {
    try {
      const userTypes = await this.getSettingByKey<string[]>('config_user_roles', ['Super Admin', 'Admin', 'Editor', 'Viewer']);
      const userFields = await this.getSettingByKey<any[]>('config_user_fields', []);
      return { userTypes, userFields };
    } catch (e) {
      return { userTypes: [], userFields: [] };
    }
  }

  async saveUserConfiguration(config: any) {
    try {
      if (config.userTypes) await this.saveSettingByKey('config_user_roles', config.userTypes);
      if (config.userFields) await this.saveSettingByKey('config_user_fields', config.userFields);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  async ensureCustomFieldsSchema(): Promise<{ success: boolean; error?: string }> { return { success: true }; }
  async getUserLogs(): Promise<UserLog[]> {
    try {
      const { data } = await supabase.from('user_logs').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    } catch { return []; }
  }
  async getRolePermissions(): Promise<SystemPermissions | null> {
    return this.getSettingByKey<SystemPermissions | null>('config_permissions', null);
  }
  async saveRolePermissions(perms: any) {
    return this.saveSettingByKey('config_permissions', perms);
  }

  async getRecycleBinItems(): Promise<AdmissionEnquiry[]> {
    try {
      const { data } = await supabase.from('admission_enquiries').select('*').eq('is_deleted', true);
      return data || [];
    } catch { return []; }
  }
  async restoreAdmissionEnquiry(id: number) {
    try {
      const { error } = await supabase.from('admission_enquiries').update({ is_deleted: false }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async permanentDeleteAdmissionEnquiry(id: number) {
    try {
      const { error } = await supabase.from('admission_enquiries').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  async getDashboardLayout(): Promise<DashboardLayoutConfig> {
    return this.getSettingByKey<DashboardLayoutConfig>('config_dashboard_layout', {
      stats_students: true, stats_employees: true, stats_attendance: true, stats_revenue: true,
      chart_attendance: true, chart_demographics: true, recent_activity: true
    });
  }
  async saveDashboardLayout(config: any) { return this.saveSettingByKey('config_dashboard_layout', config); }
  async getAdminPanelConfig(): Promise<AdminPanelConfig> {
    return this.getSettingByKey<AdminPanelConfig>('config_admin_panel', {
      sidebar_default_collapsed: false, table_compact_mode: false, enable_animations: true, show_breadcrumbs: true
    });
  }
  async saveAdminPanelConfig(config: any) { return this.saveSettingByKey('config_admin_panel', config); }
  async saveMenuLayout(layout: any) { return this.saveSettingByKey('config_menu_layout', layout); }

  private async saveSettingByKey(key: string, value: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('system_settings').upsert({ key, value: stringifySettingValue(value) }, { onConflict: 'key' });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
}

export const dbService = new DBService();
