
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { 
  Student, Employee, AdmissionEnquiry, StudentRegistration, 
  DashboardStats, AttendanceRecord, StudentDemographic, 
  NavItem, StudentDocument, EmployeeDocument, AdminPanelConfig, DashboardLayoutConfig, SystemUser, SystemPermissions, UserFieldConfig, UserLog
} from '../types';

// Initialize Supabase Client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://vslbpndyjbmlwggnrjze.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzbGJwbmR5amJtbHdnZ25yanplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDUyMjksImV4cCI6MjA4MDc4MTIyOX0.yWJa537hHxfaVi51M0Q1jWsaS17pNQeSeyJ2UpPrVYg';
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Helper for error messages
const getErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  return JSON.stringify(error);
};

class DBService {
  async checkConnection(): Promise<boolean> {
    try {
      if (supabaseKey === 'placeholder-key') return false;
      const { error } = await supabase.from('system_settings').select('count', { count: 'exact', head: true });
      return !error;
    } catch (e) {
      console.log("DB Connection Check Failed:", e);
      return false;
    }
  }

  // --- AUTHENTICATION ---
  async login(email: string, password: string): Promise<{ user?: User; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Log the login activity
      if(data.user) {
        this.logActivity('Login', `User logged in: ${email}`);
      }
      
      return { user: data.user };
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  }

  async register(email: string, password: string, fullName: string): Promise<{ user?: User; error?: string }> {
    try {
      // 1. Sign up in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) throw error;
      
      // Note: data.user might be null if email confirmation is required and auto-confirm is off
      // But typically Supabase returns the user object with an 'identities' array.
      
      if (data.user) {
        // 2. Create entry in system_users table
        // We default to 'Viewer' role for safety, admin can upgrade later
        const systemUser: Partial<SystemUser> = {
          full_name: fullName,
          email: email,
          role: 'Viewer', 
          status: 'active',
          created_at: new Date().toISOString()
        };

        const { error: dbError } = await supabase.from('system_users').insert([systemUser]);
        
        if (dbError) {
          console.error("Failed to create system user record:", dbError);
          // We don't throw here to avoid blocking auth, but it's a data consistency issue
        } else {
          this.logActivity('Register', `New user registered: ${email}`);
        }
        
        return { user: data.user };
      } else {
         // Should rarely happen unless signup is disabled
         return { error: "Registration failed. Please try again." };
      }

    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  }

  async resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async logout(): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return {};
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  }

  async getCurrentUserProfile(email: string): Promise<SystemUser | null> {
    try {
      const { data, error } = await supabase.from('system_users').select('*').eq('email', email).single();
      if (error) {
        // Fallback if not found in table but exists in Auth (e.g. just registered)
        return {
          id: 0,
          full_name: email.split('@')[0],
          email: email,
          role: 'Viewer',
          status: 'active'
        };
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  // --- MENU & LAYOUT ---
  async getMenuLayout(): Promise<NavItem[]> {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_menu_layout').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { /* ignore */ }
    
    // Default Layout
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

  async saveMenuLayout(layout: NavItem[]): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'config_menu_layout', value: JSON.stringify(layout) });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  // --- ACTIVITY & USER LOGS ---
  async getUserLogs(): Promise<UserLog[]> {
    try {
      const { data, error } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn("Could not fetch real logs (Table might be missing). Returning mock data.");
      // Mock data for UI demonstration
      return [
        { id: 1, user_email: 'admin@edusphere.com', action: 'Login', details: 'Successful login', ip_address: '192.168.1.1', created_at: new Date().toISOString() },
        { id: 2, user_email: 'admin@edusphere.com', action: 'Update Student', details: 'Updated profile for Amit Kumar', ip_address: '192.168.1.1', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, user_email: 'staff@edusphere.com', action: 'Add Enquiry', details: 'New enquiry for Class 10', ip_address: '10.0.0.5', created_at: new Date(Date.now() - 7200000).toISOString() },
      ];
    }
  }

  async logActivity(action: string, details: string = ''): Promise<void> {
    try {
      // 1. Get IP Address
      let ip = 'Unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch (e) {
        console.warn("Failed to fetch IP", e);
      }

      // 2. Insert Log
      // Assuming a 'system_logs' table exists. 
      // SQL: create table system_logs (id bigint generated by default as identity primary key, user_email text, action text, details text, ip_address text, created_at timestamptz default now());
      
      // Get current user if possible
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || 'system';

      await supabase.from('system_logs').insert([{
        user_email: email, 
        action,
        details,
        ip_address: ip
      }]);
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  }

  // --- DASHBOARD ---
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('student_status', 'active');
      const { count: employeeCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active');
      
      return { 
        totalStudents: studentCount || 0, 
        totalEmployees: employeeCount || 0, 
        attendanceRate: 94.5, // Mock for now
        revenue: 450000 
      };
    } catch (e) {
      return { totalStudents: 0, totalEmployees: 0, attendanceRate: 0, revenue: 0 };
    }
  }
  async getAttendanceData(): Promise<AttendanceRecord[]> {
    return [
      { name: 'Mon', students: 1200, employees: 80 },
      { name: 'Tue', students: 1210, employees: 82 },
      { name: 'Wed', students: 1190, employees: 78 },
      { name: 'Thu', students: 1220, employees: 83 },
      { name: 'Fri', students: 1180, employees: 79 },
    ];
  }
  async getDemographics(): Promise<StudentDemographic[]> {
    return [{ name: 'Boys', value: 650 }, { name: 'Girls', value: 600 }];
  }
  async getRecentStudents(): Promise<Student[]> {
    const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false }).limit(5);
    return data || [];
  }
  async getDashboardLayout(): Promise<DashboardLayoutConfig> {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_dashboard_layout').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { }
    return {
      stats_students: true, stats_employees: true, stats_attendance: true, stats_revenue: true,
      chart_attendance: true, chart_demographics: true, recent_activity: true
    };
  }
  async saveDashboardLayout(config: DashboardLayoutConfig): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'config_dashboard_layout', value: JSON.stringify(config) });
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async getAdminPanelConfig(): Promise<AdminPanelConfig> {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_admin_panel').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { }
    return { sidebar_default_collapsed: false, table_compact_mode: false, enable_animations: true, show_breadcrumbs: true };
  }
  async saveAdminPanelConfig(config: AdminPanelConfig): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'config_admin_panel', value: JSON.stringify(config) });
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  // --- ROLE PERMISSIONS ---
  async getRolePermissions(): Promise<SystemPermissions> {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_role_permissions').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { }
    
    // Default Permissions
    const defaultModules = ['dashboard', 'admission', 'students', 'employees', 'users', 'settings'];
    const defaultPermissions: SystemPermissions = {
      'Admin': {},
      'Editor': {},
      'Viewer': {}
    };

    defaultModules.forEach(module => {
      defaultPermissions['Admin'][module] = { view: true, edit: true, delete: true };
      defaultPermissions['Editor'][module] = { view: true, edit: true, delete: false };
      defaultPermissions['Viewer'][module] = { view: true, edit: false, delete: false };
    });

    return defaultPermissions;
  }

  async saveRolePermissions(permissions: SystemPermissions): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'config_role_permissions', value: JSON.stringify(permissions) });
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  // --- USER CONFIGURATION (Types & Custom Fields) ---
  async getUserConfiguration() {
    try {
      const { data } = await supabase.from('system_settings').select('key, value').in('key', ['config_user_types', 'config_user_fields']);
      const config: { userTypes: string[]; userFields: UserFieldConfig[] } = { userTypes: [], userFields: [] };
      data?.forEach(row => {
        if (row.key === 'config_user_types') config.userTypes = JSON.parse(row.value);
        if (row.key === 'config_user_fields') config.userFields = JSON.parse(row.value);
      });
      
      // Ensure defaults if empty or not set
      if (!config.userTypes || config.userTypes.length === 0) {
        config.userTypes = ['Super Admin', 'Admin', 'Editor', 'Viewer'];
      }
      
      return config;
    } catch (e) { 
      // Return defaults on error
      return { userTypes: ['Super Admin', 'Admin', 'Editor', 'Viewer'], userFields: [] }; 
    }
  }

  async saveUserConfiguration(config: { userTypes?: string[], userFields?: UserFieldConfig[] }): Promise<{ success: boolean; error?: any }> {
    try {
      const updates = [];
      if (config.userTypes) updates.push({ key: 'config_user_types', value: JSON.stringify(config.userTypes) });
      if (config.userFields) updates.push({ key: 'config_user_fields', value: JSON.stringify(config.userFields) });
      
      const { error } = await supabase.from('system_settings').upsert(updates);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  async ensureCustomFieldsSchema(): Promise<{ success: boolean; error?: any }> {
    try {
      // Calls a Postgres function 'ensure_custom_fields_column'
      // SQL: create or replace function ensure_custom_fields_column() returns void as $$ begin execute 'alter table system_users add column if not exists custom_fields jsonb default ''{}''::jsonb'; end; $$ language plpgsql security definer;
      const { error } = await supabase.rpc('ensure_custom_fields_column');
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  // --- SETTINGS (Fields, Departments) ---
  async getStudentFields() {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_student_fields').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { }
    return {
      classes: ['Class 1', 'Class 2', 'Class 3'],
      sections: ['A', 'B', 'C'],
      subjects: ['Math', 'Science', 'English']
    };
  }
  async saveStudentFields(fields: any): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'config_student_fields', value: JSON.stringify(fields) });
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async getDepartments(): Promise<string[]> {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_departments').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { }
    return ['Science', 'Arts', 'Commerce', 'Sports'];
  }
  async saveDepartments(depts: string[]): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'config_departments', value: JSON.stringify(depts) });
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async getDesignations(): Promise<string[]> {
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'config_designations').single();
      if (data?.value) return JSON.parse(data.value);
    } catch (e) { }
    return ['Senior Teacher', 'Junior Teacher', 'Lab Assistant', 'Clerk'];
  }
  async saveDesignations(desigs: string[]): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('system_settings').upsert({ key: 'config_designations', value: JSON.stringify(desigs) });
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async getSystemSettings(): Promise<any> {
    try {
      const { data } = await supabase.from('system_settings').select('*');
      const settings: any = {};
      data?.forEach(row => { settings[row.key] = row.value; });
      return settings;
    } catch (e) { return {}; }
  }
  async saveSystemSettings(settings: any): Promise<{ success: boolean; error?: any }> {
    try {
      const updates = Object.keys(settings).map(key => ({ key, value: settings[key] }));
      const { error } = await supabase.from('system_settings').upsert(updates);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async uploadSystemAsset(file: File, bucket: string): Promise<{ publicUrl?: string; error?: any }> {
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return { publicUrl: data.publicUrl };
    } catch (error: any) {
      return { error: getErrorMessage(error) };
    }
  }

  // --- SYSTEM USERS ---
  async getSystemUsers(): Promise<SystemUser[]> {
    try {
      const { data, error } = await supabase.from('system_users').select('*').order('id', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching users:", getErrorMessage(error));
      return [];
    }
  }
  
  async createSystemUser(user: Partial<SystemUser>): Promise<{ success: boolean; error?: any; warning?: string }> {
    try {
      const { error } = await supabase.from('system_users').insert([user]);
      if (error) {
        // Fallback for missing 'custom_fields' column
        if (user.custom_fields && (JSON.stringify(error).includes('column') || JSON.stringify(error).includes('custom_fields'))) {
           const { custom_fields, ...safeUser } = user;
           const { error: retryError } = await supabase.from('system_users').insert([safeUser]);
           if (retryError) throw retryError;
           return { success: true, warning: "User created, but custom fields were not saved due to database limitations." };
        }
        throw error;
      }
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  async updateSystemUser(user: Partial<SystemUser>): Promise<{ success: boolean; error?: any; warning?: string }> {
    try {
      const { error } = await supabase.from('system_users').update(user).eq('id', user.id);
      if (error) {
        // Fallback for missing 'custom_fields' column
        if (user.custom_fields && (JSON.stringify(error).includes('column') || JSON.stringify(error).includes('custom_fields'))) {
           const { custom_fields, ...safeUser } = user;
           const { error: retryError } = await supabase.from('system_users').update(safeUser).eq('id', user.id);
           if (retryError) throw retryError;
           return { success: true, warning: "User updated, but custom fields were not saved due to database limitations." };
        }
        throw error;
      }
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  async deleteSystemUser(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('system_users').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  // --- EMPLOYEES (Formerly Teachers) ---
  async getEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase.from('employees').select('*').order('id', { ascending: false });
      if (error) {
        console.error("Error fetching employees:", getErrorMessage(error));
        return [];
      }
      return data || [];
    } catch (error) {
      console.error("Unexpected error fetching employees:", getErrorMessage(error));
      return [];
    }
  }
  
  async addEmployee(employee: Employee): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('employees').insert([employee]);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  
  async updateEmployee(employee: Employee): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('employees').update(employee).eq('id', employee.id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  
  async deleteEmployee(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('employees').update({ status: 'inactive' }).eq('id', id); // Soft delete logic
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  
  async uploadEmployeeDocument(file: File, employeeId: number, type: string): Promise<{ success: boolean; error?: any }> {
    try {
      const fileName = `${employeeId}_${type.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      // Ensure the bucket exists on Supabase side: 'employee-documents'
      const { error: uploadError } = await supabase.storage.from('employee-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('employee-documents').getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from('employee_documents').upsert({
        employee_id: employeeId, document_type: type, file_url: urlData.publicUrl
      }, { onConflict: 'employee_id, document_type' });
      
      if (dbError) throw dbError;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  
  async getEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]> {
    try {
      const { data, error } = await supabase.from('employee_documents').select('*').eq('employee_id', employeeId);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching documents:", getErrorMessage(error));
      return [];
    }
  }

  // --- ADMISSION & REGISTRATION ---
  async getAdmissionEnquiries(): Promise<AdmissionEnquiry[]> {
    const { data } = await supabase.from('admission_enquiries').select('*').eq('is_deleted', false).order('created_at', { ascending: false });
    return data || [];
  }
  async createAdmissionEnquiry(data: AdmissionEnquiry): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('admission_enquiries').insert([{ ...data, is_deleted: false }]);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async updateAdmissionEnquiry(data: AdmissionEnquiry): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('admission_enquiries').update(data).eq('id', data.id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async deleteAdmissionEnquiry(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('admission_enquiries').update({ is_deleted: true }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async getRecycleBinItems(): Promise<AdmissionEnquiry[]> {
    const { data } = await supabase.from('admission_enquiries').select('*').eq('is_deleted', true);
    return data || [];
  }
  async restoreAdmissionEnquiry(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('admission_enquiries').update({ is_deleted: false }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async permanentDeleteAdmissionEnquiry(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('admission_enquiries').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }

  async getRegistrations(): Promise<StudentRegistration[]> {
    const { data } = await supabase.from('student_registrations').select('*').order('created_at', { ascending: false });
    return data || [];
  }
  async checkRegistrationExists(phone: string): Promise<boolean> {
    const { data } = await supabase.from('student_registrations').select('id').eq('phone', phone).single();
    return !!data;
  }
  async createRegistration(data: StudentRegistration): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('student_registrations').insert([data]);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async deleteRegistration(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('student_registrations').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async approveRegistration(id: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { data: reg, error: fetchError } = await supabase.from('student_registrations').select('*').eq('id', id).single();
      if (fetchError || !reg) throw new Error("Registration not found");

      // Generate Admission No
      const admissionNo = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
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
        admission_no: admissionNo,
        student_status: 'provisional'
      };

      const { error: insertError } = await supabase.from('students').insert([studentData]);
      if (insertError) throw insertError;

      await supabase.from('student_registrations').update({ status: 'approved' }).eq('id', id);
      
      // Update linked enquiry
      if (reg.phone) {
         await supabase.from('admission_enquiries').update({ response_status: 'In Admission' }).eq('mobile_no', reg.phone);
      }

      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async updateRegistrationStatus(id: number, status: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('student_registrations').update({ status }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async markRegistrationAsCompleted(id: number): Promise<{ success: boolean; error?: any }> {
    return this.updateRegistrationStatus(id, 'Admission Done');
  }

  // --- STUDENTS ---
  async getAllStudents(): Promise<Student[]> {
    const { data } = await supabase.from('students').select('*').eq('student_status', 'active').order('id', { ascending: false });
    return data || [];
  }
  async getAllStudentsRaw(): Promise<Student[]> {
    try {
      const { data, error } = await supabase.from('students').select('*').order('id', { ascending: false });
      if (error) {
        console.error("Error fetching all students raw:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("Exception in getAllStudentsRaw:", e);
      return [];
    }
  }
  async getProvisionalStudents(): Promise<Student[]> {
    const { data } = await supabase.from('students').select('*').eq('student_status', 'provisional').order('id', { ascending: false });
    return data || [];
  }
  async getInactiveStudents(): Promise<Student[]> {
    const { data } = await supabase.from('students').select('*').eq('student_status', 'inactive').order('id', { ascending: false });
    return data || [];
  }
  async toggleStudentStatus(id: number, status: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('students').update({ student_status: status }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async updateStudent(data: Student): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('students').update(data).eq('id', data.id);
      if (error) throw error;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async uploadProfilePhoto(file: File): Promise<{ publicUrl?: string; error?: any }> {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await supabase.storage.from('student-photos').upload(fileName, file);
      
      if (uploadError) {
        if (uploadError.message.includes("row-level security")) {
           console.error("SQL TO FIX RLS: CREATE POLICY \"Public Access\" ON storage.objects FOR ALL USING ( bucket_id = 'student-photos' ) WITH CHECK ( bucket_id = 'student-photos' );");
        }
        throw uploadError;
      }
      
      const { data } = supabase.storage.from('student-photos').getPublicUrl(fileName);
      return { publicUrl: data.publicUrl };
    } catch (error) { return { error: getErrorMessage(error) }; }
  }
  async uploadStudentDocument(file: File, studentId: number, type: string): Promise<{ success: boolean; error?: any }> {
    try {
      const fileName = `${studentId}_${type.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('student-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('student-documents').getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from('student_documents').upsert({
        student_id: studentId,
        document_type: type,
        file_url: urlData.publicUrl
      }, { onConflict: 'student_id, document_type' });
      
      if (dbError) throw dbError;
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async getStudentDocuments(studentId: number): Promise<StudentDocument[]> {
    const { data } = await supabase.from('student_documents').select('*').eq('student_id', studentId);
    return data || [];
  }
  async finalizeStudentAdmission(student: Student): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('students').update({ student_status: 'active' }).eq('id', student.id);
      if (error) throw error;
      
      // Update registration if possible
      if (student.phone) {
         await supabase.from('student_registrations').update({ status: 'Admission Done' }).eq('phone', student.phone);
      } else {
         // Fallback by name
         await supabase.from('student_registrations').update({ status: 'Admission Done' }).eq('full_name', student.full_name).eq('status', 'approved');
      }
      return { success: true };
    } catch (error) { return { success: false, error: getErrorMessage(error) }; }
  }
  async bulkCreateStudents(students: Partial<Student>[]): Promise<{ success: boolean; count: number; error?: any }> {
    try {
      const studentsWithAdmNo = students.map((s, index) => ({
        ...s,
        admission_no: `ADM-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        created_at: new Date().toISOString(),
        student_status: 'active'
      }));
      
      const { error } = await supabase.from('students').insert(studentsWithAdmNo); // .select() removed to avoid argument count error
      if (error) throw error;
      return { success: true, count: students.length };
    } catch (error) { return { success: false, count: 0, error: getErrorMessage(error) }; }
  }
}

export const dbService = new DBService();
