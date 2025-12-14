
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  icon?: string; // Changed to string for DB storage
  href?: string; // Optional for parent items with children
  children?: NavItem[]; // Array of submenu items
}

export interface UserProfile {
  name: string;
  role: string;
  avatarUrl: string;
  email: string;
}

export interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: LucideIcon;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Database Types
export interface DashboardStats {
  totalStudents: number;
  totalEmployees: number; // Renamed from totalTeachers
  attendanceRate: number;
  revenue: number;
}

export interface AttendanceRecord {
  name: string; // Day of week
  students: number;
  employees: number; // Renamed from teachers
  [key: string]: any;
}

export interface StudentDemographic {
  name: string;
  value: number;
  [key: string]: any;
}

export interface StudentDocument {
  id: number;
  student_id: number;
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

export interface EmployeeDocument { // Renamed from TeacherDocument
  id: number;
  employee_id: number; // Renamed from teacher_id
  document_type: string;
  file_url: string;
  uploaded_at: string;
}

export interface Employee { // Renamed from Teacher
  id: number;
  name?: string; // For backward compatibility if old data exists
  full_name: string;
  subject?: string; // Kept as subject/designation (Role)
  department?: string; // New field
  phone?: string;
  email?: string;
  address?: string;
  dob?: string;
  gender?: string;
  blood_group?: string; // New field
  qualification?: string;
  experience_details?: string; // New field
  total_experience?: string; // New field
  joining_date?: string;
  photo_url?: string;
  status?: 'active' | 'inactive';
  created_at: string;
  // Bank Details
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc_code?: string;
  bank_branch_name?: string;
  account_holder_name?: string;
  upi_id?: string;
  // Salary Details
  salary_amount?: number;
  custom_fields?: Record<string, any>;
}

export interface SystemUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  avatar_url?: string;
  last_login?: string;
  created_at?: string;
  custom_fields?: Record<string, any>; // Dynamic fields storage
}

export interface EmployeeSalaryPayment { // Renamed from TeacherSalaryPayment
  id?: number;
  employee_id: number; // Renamed from teacher_id
  amount_paid: number;
  payment_date: string;
  payment_for_month: string; // YYYY-MM-DD (usually 1st of month)
  payment_mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  transaction_details: string; // JSON string storing extra fields like Cheque No, Ref ID
  notes?: string;
  created_at?: string;
}


export interface Student {
  id: number;
  full_name: string; 
  gender: string;
  dob?: string;
  email?: string;
  phone?: string;
  whatsapp_no?: string;
  address?: string;
  father_name?: string;
  mother_name?: string;
  class_section?: string;
  section?: string;      
  admission_no?: string;
  
  // Profile Fields
  photo_url?: string;
  aadhar_no?: string;
  blood_group?: string;
  identification_mark?: string;
  father_qualification?: string;
  mother_qualification?: string;
  
  // Facilities
  transport_route?: string;
  hostel_room?: string;
  fee_category?: string;
  
  // Status
  student_status?: 'provisional' | 'active' | 'alumni' | 'inactive';

  created_at: string;
  is_deleted?: boolean;
}

export interface AdmissionEnquiry {
  id?: number;
  full_name: string;
  gender: string;
  dob: string;
  class_applying_for: string;
  no_of_child: number | string;
  previous_school: string;
  father_name: string;
  mother_name: string;
  mobile_no: string;
  email: string;
  address: string;
  assigned_to: string;
  reference: string;
  enquiry_date: string;
  next_follow_up: string;
  response_status: string;
  internal_notes: string;
  is_deleted?: boolean;
  created_at?: string;
}

export interface StudentRegistration {
  id?: number;
  full_name: string;
  gender: string;
  dob: string;
  email: string;
  phone: string;
  address: string;
  father_name: string;
  mother_name: string;
  class_enrolled: string;
  previous_school: string;
  admission_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'admitted' | 'Admission Done';
  created_at?: string;
}

// Fee Types
export interface FeeStructure {
  id?: number;
  name: string;
  class_id?: string; // Which class this fee applies to
  amount: number;
  frequency: 'Monthly' | 'Quarterly' | 'Yearly' | 'One Time';
  due_date_day?: number; // Day of month
  description?: string;
}

export interface StudentFeeDue {
  id: number;
  student_id: number;
  fee_structure_id: number;
  fee_name: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: 'pending' | 'paid' | 'partially_paid' | 'overdue';
}

export interface FeePayment {
  id?: number;
  student_id: number;
  amount: number;
  payment_date: string;
  payment_mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  transaction_ref?: string;
  remarks?: string;
  created_at?: string;
}

export interface Expense {
  id?: number;
  title: string;
  category: string;
  amount: number;
  date: string;
  payment_mode: string;
  recipient?: string;
  notes?: string;
  created_at?: string;
}

export interface DashboardLayoutConfig {
  stats_students: boolean;
  stats_employees: boolean; // Renamed from stats_teachers
  stats_attendance: boolean;
  stats_revenue: boolean;
  chart_attendance: boolean;
  chart_demographics: boolean;
  recent_activity: boolean;
}

export interface AdminPanelConfig {
  sidebar_default_collapsed: boolean;
  table_compact_mode: boolean;
  enable_animations: boolean;
  show_breadcrumbs: boolean;
}

// Permission Types
export interface ModulePermissions {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RolePermissions {
  [module: string]: ModulePermissions;
}

export interface SystemPermissions {
  [role: string]: RolePermissions;
}

export interface UserFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea';
  options?: string; // Comma separated for select
  required: boolean;
}

export interface UserLog {
  id: number;
  user_email: string;
  action: string; // e.g., 'Login', 'Update Student', 'Delete User'
  details?: string;
  ip_address: string;
  created_at: string;
}
