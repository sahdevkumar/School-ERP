import { createClient } from '@supabase/supabase-js';
import { 
  Student, Employee, AdmissionEnquiry, StudentRegistration, 
  SystemUser, UserLog, DashboardStats, AttendanceRecord, 
  StudentDemographic, DashboardLayoutConfig, NavItem, 
  AdminPanelConfig, SystemPermissions, UserProfile,
  StudentDocument, EmployeeDocument
} from '../types';

// Initialize Supabase with environment variables
// Use placeholders if env vars are missing to prevent 'createClient' from throwing immediately
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://vslbpndyjbmlwggnrjze.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbGJwbmR5amJtbHdnZ25yanplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDUyMjksImV4cCI6MjA4MDc4MTIyOX0.yWJa537hHxfaVi51M0Q1jWsaS17pNQeSeyJ2UpPrVYg';

export const supabase = createClient(supabaseUrl, supabaseKey);

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'An unknown error occurred';
};

export class DBService {
  
  // Auth
  async login(email: string, password: string): Promise<{ user?: any; error?: string }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { user: data.user };
  }

  async register(email: string, password: string, fullName: string): Promise<{ user?: any; error?: string }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) return { error: error.message };
    
    // Create system user entry if signup successful
    if (data.user) {
        await this.createSystemUser({
            full_name: fullName,
            email: email,
            role: 'Viewer', // Default role
            status: 'active'
        } as SystemUser);
    }
    return { user: data.user };
  }

  async logout(): Promise<{ error?: string }> {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    return {};
  }

  async resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: string }> {
     const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
     });
     if (error) return { success: false, error: error.message };
     return { success: true };
  }
  
  async getCurrentUserProfile(email: string): Promise<SystemUser | null> {
      const { data } = await supabase.from('system_users').select('*').eq('email', email).single();
      return data;
  }
  
  // Dashboard
  async checkConnection(): Promise<boolean> {
      try {
          if (supabaseUrl === 'https://placeholder.supabase.co') return false;
          // Simple query to check connectivity
          const { error } = await supabase.from('system_settings').select('count', { count: 'exact', head: true });
          return !error;
      } catch {
          return false;
      }
  }

  async getDashboardStats(): Promise<DashboardStats> {
      // These would typically be RPC calls or aggregated queries
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('student_status', 'active');
      const { count: empCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active');
      
      return {
          totalStudents: studentCount || 0,
          totalEmployees: empCount || 0,
          attendanceRate: 85, // Mock or calculate
          revenue: 150000 // Mock or calculate
      };
  }

  async getAttendanceData(): Promise<AttendanceRecord[]> {
      // Mock data for chart
      return [
        { name: 'Mon', students: 400, employees: 30 },
        { name: 'Tue', students: 410, employees: 32 },
        { name: 'Wed', students: 390, employees: 29 },
        { name: 'Thu', students: 420, employees: 31 },
        { name: 'Fri', students: 405, employees: 30 },
      ];
  }

  async getDemographics(): Promise<StudentDemographic[]> {
      const { count: male } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('gender', 'male');
      const { count: female } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('gender', 'female');
      return [
          { name: 'Boys', value: male || 0 },
          { name: 'Girls', value: female || 0 }
      ];
  }

  async getRecentStudents(): Promise<Student[]> {
      const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false }).limit(5);
      return data || [];
  }
  
  // Settings
  async getSystemSettings(): Promise<any> {
      const { data } = await supabase.from('system_settings').select('*').single();
      return data || {};
  }
  async saveSystemSettings(settings: any): Promise<{ success: boolean; error?: string }> {
      // Assuming a single settings row with ID 1
      const { error } = await supabase.from('system_settings').upsert({ id: 1, ...settings });
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  
  async uploadSystemAsset(file: File, bucket: string = 'system-assets'): Promise<{ publicUrl?: string; error?: string }> {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) return { error: uploadError.message };

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return { publicUrl: data.publicUrl };
  }
  
  // Layouts
  async getDashboardLayout(): Promise<DashboardLayoutConfig> {
      const { data } = await supabase.from('layout_config').select('dashboard_config').single();
      return data?.dashboard_config || {
        stats_students: true, stats_employees: true, stats_attendance: true, stats_revenue: true,
        chart_attendance: true, chart_demographics: true, recent_activity: true
      };
  }
  async saveDashboardLayout(config: DashboardLayoutConfig): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('layout_config').upsert({ id: 1, dashboard_config: config });
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  
  async getAdminPanelConfig(): Promise<AdminPanelConfig> {
      const { data } = await supabase.from('layout_config').select('admin_config').single();
      return data?.admin_config || {
          sidebar_default_collapsed: false, table_compact_mode: false, enable_animations: true, show_breadcrumbs: true
      };
  }
  async saveAdminPanelConfig(config: AdminPanelConfig): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('layout_config').upsert({ id: 1, admin_config: config });
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  
  async getMenuLayout(): Promise<NavItem[]> {
      const { data } = await supabase.from('layout_config').select('menu_layout').single();
      if (!data?.menu_layout) {
          // Default menu
          return [
              { label: 'Dashboard', icon: 'LayoutDashboard', href: 'dashboard' },
              { label: 'Students', icon: 'GraduationCap', href: 'students' },
              { label: 'Employees', icon: 'Users', href: 'employees' },
          ];
      }
      return data.menu_layout;
  }
  async saveMenuLayout(layout: NavItem[]): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('layout_config').upsert({ id: 1, menu_layout: layout });
       if (error) return { success: false, error: error.message };
       return { success: true };
  }

  async getRolePermissions(): Promise<SystemPermissions> {
      const { data } = await supabase.from('role_permissions').select('*').single();
      return data?.permissions || {};
  }
  async saveRolePermissions(permissions: SystemPermissions): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('role_permissions').upsert({ id: 1, permissions: permissions });
       if (error) return { success: false, error: error.message };
       return { success: true };
  }

  async getUserConfiguration(): Promise<{ userTypes: string[]; userFields: any[] }> {
      const { data } = await supabase.from('user_config').select('*').single();
      return data || { userTypes: ['Admin', 'Teacher', 'Staff'], userFields: [] };
  }
  async saveUserConfiguration(config: any): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('user_config').upsert({ id: 1, ...config });
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async ensureCustomFieldsSchema(): Promise<{ success: boolean; error?: any }> {
      // This is a placeholder for schema sync logic
      return { success: true }; 
  }

  async getStudentFields(): Promise<{ classes: string[], sections: string[], subjects: string[] }> {
      const { data } = await supabase.from('student_fields').select('*').single();
      return data || { classes: [], sections: [], subjects: [] };
  }
  async saveStudentFields(fields: any): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('student_fields').upsert({ id: 1, ...fields });
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  
  async getDepartments(): Promise<string[]> {
      const { data } = await supabase.from('organization_settings').select('departments').single();
      return data?.departments || [];
  }
  async saveDepartments(depts: string[]): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('organization_settings').upsert({ id: 1, departments: depts });
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  async getDesignations(): Promise<string[]> {
      const { data } = await supabase.from('organization_settings').select('designations').single();
      return data?.designations || [];
  }
  async saveDesignations(desigs: string[]): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('organization_settings').upsert({ id: 1, designations: desigs });
       if (error) return { success: false, error: error.message };
       return { success: true };
  }

  // Students
  async getAllStudents(): Promise<Student[]> {
      const { data, error } = await supabase.from('students').select('*').eq('student_status', 'active');
      if (error) throw error;
      return data;
  }
  async getAllStudentsRaw(): Promise<Student[]> {
      const { data, error } = await supabase.from('students').select('*');
      if (error) throw error;
      return data;
  }
  async getInactiveStudents(): Promise<Student[]> {
      const { data, error } = await supabase.from('students').select('*').eq('student_status', 'inactive');
      if (error) throw error;
      return data;
  }
  async getProvisionalStudents(): Promise<Student[]> {
       const { data, error } = await supabase.from('students').select('*').eq('student_status', 'provisional');
       if (error) throw error;
       return data;
  }
  async updateStudent(student: Partial<Student>): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('students').update(student).eq('id', student.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async deleteStudent(id: number): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async toggleStudentStatus(id: number, status: string): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('students').update({ student_status: status }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async finalizeStudentAdmission(student: Student): Promise<{ success: boolean; error?: string }> {
      return this.updateStudent({ ...student, student_status: 'active' });
  }
  async bulkCreateStudents(students: Partial<Student>[]): Promise<{ success: boolean; count?: number; error?: string }> {
      const { data, error } = await supabase.from('students').insert(students).select();
      if (error) return { success: false, error: error.message };
      return { success: true, count: data.length };
  }

  async uploadProfilePhoto(file: File): Promise<{ publicUrl?: string; error?: string }> {
      return this.uploadSystemAsset(file, 'student-photos');
  }

  async getStudentDocuments(id: number): Promise<StudentDocument[]> {
      const { data } = await supabase.from('student_documents').select('*').eq('student_id', id);
      return data || [];
  }
  async uploadStudentDocument(file: File, studentId: number, type: string): Promise<{ success: boolean; error?: string }> {
      const { publicUrl, error } = await this.uploadSystemAsset(file, 'student-docs');
      if (error) return { success: false, error };
      
      const { error: dbError } = await supabase.from('student_documents').insert({
          student_id: studentId,
          document_type: type,
          file_url: publicUrl,
          uploaded_at: new Date().toISOString()
      });
      if (dbError) return { success: false, error: dbError.message };
      return { success: true };
  }

  // Admission Enquiry
  async getAdmissionEnquiries(): Promise<AdmissionEnquiry[]> {
      const { data } = await supabase.from('admission_enquiries').select('*').eq('is_deleted', false);
      return data || [];
  }
  async createAdmissionEnquiry(data: AdmissionEnquiry): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('admission_enquiries').insert(data);
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async updateAdmissionEnquiry(data: AdmissionEnquiry): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('admission_enquiries').update(data).eq('id', data.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async deleteAdmissionEnquiry(id: number): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('admission_enquiries').update({ is_deleted: true }).eq('id', id);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  
  // Recycle Bin
  async getRecycleBinItems(): Promise<AdmissionEnquiry[]> {
      const { data } = await supabase.from('admission_enquiries').select('*').eq('is_deleted', true);
      return data || [];
  }
  async restoreAdmissionEnquiry(id: number): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('admission_enquiries').update({ is_deleted: false }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async permanentDeleteAdmissionEnquiry(id: number): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('admission_enquiries').delete().eq('id', id);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }

  // Registration
  async getRegistrations(): Promise<StudentRegistration[]> {
      const { data } = await supabase.from('student_registrations').select('*');
      return data || [];
  }
  async createRegistration(data: Partial<StudentRegistration>): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('student_registrations').insert(data);
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async checkRegistrationExists(phone: string): Promise<boolean> {
      const { data } = await supabase.from('student_registrations').select('id').eq('phone', phone);
      return (data?.length || 0) > 0;
  }
  async deleteRegistration(id: number): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('student_registrations').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
  }
  async approveRegistration(id: number): Promise<{ success: boolean; error?: string }> {
      const { data: reg, error: fetchError } = await supabase.from('student_registrations').select('*').eq('id', id).single();
      if (fetchError || !reg) return { success: false, error: fetchError?.message || 'Registration not found' };
      
      const studentData: Partial<Student> = {
          full_name: reg.full_name,
          gender: reg.gender,
          dob: reg.dob,
          email: reg.email,
          phone: reg.phone,
          address: reg.address,
          father_name: reg.father_name,
          mother_name: reg.mother_name,
          class_section: reg.class_enrolled,
          student_status: 'provisional',
          created_at: new Date().toISOString()
      };
      
      const { error: createError } = await supabase.from('students').insert(studentData);
      if (createError) return { success: false, error: createError.message };
      
      return this.updateRegistrationStatus(id, 'approved');
  }
  async updateRegistrationStatus(id: number, status: string): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('student_registrations').update({ status }).eq('id', id);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  async markRegistrationAsCompleted(id: number): Promise<{ success: boolean; error?: string }> {
      return this.updateRegistrationStatus(id, 'Admission Done');
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
      const { data } = await supabase.from('employees').select('*');
      return data || [];
  }
  async addEmployee(employee: Partial<Employee>): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('employees').insert(employee);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  async updateEmployee(employee: Partial<Employee>): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('employees').update(employee).eq('id', employee.id);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  async deleteEmployee(id: number): Promise<{ success: boolean; error?: string }> {
      return this.toggleEmployeeStatus(id, 'inactive');
  }
  async permanentDeleteEmployee(id: number): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase.from('employees').delete().eq('id', id);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  async toggleEmployeeStatus(id: number, status: string): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('employees').update({ status }).eq('id', id);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  async uploadEmployeePhoto(file: File): Promise<{ publicUrl?: string; error?: string }> {
      return this.uploadSystemAsset(file, 'employee-photos');
  }
  async getEmployeeDocuments(id: number): Promise<EmployeeDocument[]> {
      const { data } = await supabase.from('employee_documents').select('*').eq('employee_id', id);
      return data || [];
  }

  // System Users
  async getSystemUsers(): Promise<SystemUser[]> {
      const { data } = await supabase.from('system_users').select('*');
      return data || [];
  }
  async createSystemUser(user: Partial<SystemUser>): Promise<{ success: boolean; error?: string; warning?: string }> {
      const { error } = await supabase.from('system_users').insert(user);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  async updateSystemUser(user: Partial<SystemUser>): Promise<{ success: boolean; error?: string; warning?: string }> {
       const { error } = await supabase.from('system_users').update(user).eq('id', user.id);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }
  async deleteSystemUser(id: number): Promise<{ success: boolean; error?: string }> {
       const { error } = await supabase.from('system_users').delete().eq('id', id);
       if (error) return { success: false, error: error.message };
       return { success: true };
  }

  // Logs
  async getUserLogs(): Promise<UserLog[]> {
      const { data } = await supabase.from('user_logs').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
  }
}

export const dbService = new DBService();