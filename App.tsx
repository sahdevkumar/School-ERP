
import React, { useState, useEffect, Suspense } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ToastProvider } from './context/ToastContext';
import { PermissionProvider } from './context/PermissionContext';
import { SettingsProvider } from './context/SettingsContext';
import { UserProfile } from './types';
import { dbService, supabase } from './services/supabase';
import { LoginPage } from './components/LoginPage';
import { Loader2 } from 'lucide-react';
import { GeminiChatWidget } from './components/GeminiChatWidget';

// Lazy Load Components
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const StudentManagement = React.lazy(() => import('./components/StudentManagement').then(module => ({ default: module.StudentManagement })));
const Employees = React.lazy(() => import('./components/Employees').then(module => ({ default: module.Employees })));
const Settings = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const AdmissionEnquiry = React.lazy(() => import('./components/AdmissionEnquiry').then(module => ({ default: module.AdmissionEnquiry })));
const Registration = React.lazy(() => import('./components/Registration').then(module => ({ default: module.Registration })));
const RecycleBin = React.lazy(() => import('./components/RecycleBin').then(module => ({ default: module.RecycleBin })));
const Admission = React.lazy(() => import('./components/Admission').then(module => ({ default: module.Admission })));
const UserManagement = React.lazy(() => import('./components/UserManagement').then(module => ({ default: module.UserManagement })));
const UserLogs = React.lazy(() => import('./components/UserLogs').then(module => ({ default: module.UserLogs })));
const Fees = React.lazy(() => import('./components/Fees').then(module => ({ default: module.Fees })));
const Payroll = React.lazy(() => import('./components/Payroll').then(module => ({ default: module.Payroll })));
const SalaryManagement = React.lazy(() => import('./components/SalaryManagement').then(module => ({ default: module.SalaryManagement })));
const Attendance = React.lazy(() => import('./components/Attendance').then(module => ({ default: module.Attendance })));
const FinanceDiscounts = React.lazy(() => import('./components/FinanceDiscounts').then(module => ({ default: module.FinanceDiscounts })));

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [pageData, setPageData] = useState<any>(null);
  
  // Auth State
  const [session, setSession] = useState<any>({ user: { email: 'admin@dev.com' } });
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Dev Admin',
    role: 'Super Admin',
    avatarUrl: 'https://ui-avatars.com/api/?name=Dev+Admin&background=6366f1&color=fff',
    email: 'admin@dev.com'
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleNavigate = (page: string, data?: any) => {
    setActivePage(page);
    if (data) {
      setPageData(data);
    }
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await dbService.logout();
      } catch (error) {
        console.error("Logout API error:", error);
      } finally {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
        setSession(null);
        window.location.replace('/');
      }
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
        
      case 'students':
        return <StudentManagement initialStudentSearch={pageData?.search} pageTitle="Student Management" />;
        
      case 'employees':
      case 'teachers':
      case 'employee-list':
        return <Employees onNavigate={handleNavigate} />;
      case 'add-employee':
        return <Employees initialAction="add" onNavigate={handleNavigate} />;

      case 'users':
        return <UserManagement />;

      case 'user-logs':
        return <UserLogs />;

      case 'fees':
      case 'fee-collection':
        return <Fees initialTab="collection" />;
      case 'fee-management':
      case 'fee-structure':
        return <Fees initialTab="structure" />;
      case 'discount-bonus':
        return <FinanceDiscounts />;
      
      case 'payroll':
      case 'pay-salary':
        return <Payroll />;
        
      case 'payroll-management':
      case 'salary-management':
        return <SalaryManagement />;
        
      case 'attendance':
        return <Attendance />;

      case 'admission-enquiry':
        return <AdmissionEnquiry onNavigate={handleNavigate} />;
      case 'registration':
        return <Registration initialData={pageData} onNavigate={handleNavigate} />;
      case 'admission':
        return <Admission initialSearch={pageData?.search} />;

      case 'global-settings':
      case 'school-settings':
      case 'role-permissions':
      case 'dashboard-layout':
      case 'system-student-field':
      case 'menu-layout':
      case 'settings-users':
      case 'user-configuration':
        return <Settings activePage={activePage} />;

      case 'recycle-bin':
        return <RecycleBin />;
        
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <p className="text-gray-500 font-medium">Loading System...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <ToastProvider>
        <LoginPage onLoginSuccess={() => { }} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <SettingsProvider>
        <PermissionProvider role={userProfile.role}>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Sidebar 
              isOpen={sidebarOpen} 
              isCollapsed={isCollapsed}
              toggleCollapse={toggleCollapse}
              closeMobileSidebar={() => setSidebarOpen(false)}
              user={userProfile}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
            
            <TopBar 
              toggleMobileSidebar={toggleSidebar}
              isDark={isDark}
              toggleTheme={toggleTheme}
              isCollapsed={isCollapsed}
              user={userProfile}
              onLogout={handleLogout}
            />

            <main className={`transition-all duration-300 pt-20 px-4 md:px-6 pb-8 min-h-screen
              ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'}
            `}>
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[50vh]">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                </div>
              }>
                {renderContent()}
              </Suspense>
            </main>

            <GeminiChatWidget />
          </div>
        </PermissionProvider>
      </SettingsProvider>
    </ToastProvider>
  );
};
