
import * as React from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './components/Dashboard';
import { StudentManagement } from './components/StudentManagement';
import { Employees } from './components/Employees'; // Import Employees
import { Settings } from './components/Settings';
import { AdmissionEnquiry } from './components/AdmissionEnquiry';
import { Registration } from './components/Registration';
import { RecycleBin } from './components/RecycleBin';
import { GeminiChatWidget } from './components/GeminiChatWidget';
import { Admission } from './components/Admission';
import { DepartmentSettings } from './components/DepartmentSettings';
import { UserManagement } from './components/UserManagement'; // Import UserManagement
import { ToastProvider } from './context/ToastContext';
import { UserProfile } from './types';
import { dbService } from './services/supabase';

// Mock User Data
const user: UserProfile = {
  name: 'Admin User',
  role: 'Super Admin',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  email: 'admin@edusphere.com'
};

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [activePage, setActivePage] = React.useState('dashboard');
  const [pageData, setPageData] = React.useState<any>(null);

  // Core System: Load Title
  React.useEffect(() => {
    const initSystem = async () => {
      try {
        const settings = await dbService.getSystemSettings();
        if (settings.system_title) {
          document.title = `${settings.system_title} | Admin Panel`;
        } else if (settings.school_name) {
          document.title = `${settings.school_name} | Admin Panel`;
        }
      } catch (e) {
        console.warn("Failed to load system settings for title");
      }
    };
    initSystem();
  }, []);

  React.useEffect(() => {
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

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
        
      // Student Management Routes
      case 'students':
        return <StudentManagement initialStudentSearch={pageData?.search} pageTitle="Student Management" />;
        
      // Employee Management Routes
      case 'employees': // Updated route
      case 'teachers': // Keep for backward compatibility
      case 'employee-list':
        return <Employees />;
      case 'add-employee':
        return <Employees initialAction="add" />;
      case 'login-deactivate':
        return <Employees />; 
      case 'add-department':
      case 'add-designation':
        return <DepartmentSettings />;

      // User Management Routes
      case 'users':
        return <UserManagement />;

      // Admission Routes
      case 'admission-enquiry':
        return <AdmissionEnquiry onNavigate={handleNavigate} />;
      case 'registration':
        return <Registration initialData={pageData} onNavigate={handleNavigate} />;
      case 'admission':
        return <Admission initialSearch={pageData?.search} />;

      // Settings Routes
      case 'global-settings':
      case 'school-settings':
      case 'role-permissions':
      case 'dashboard-layout':
      case 'system-student-field':
      case 'menu-layout':
      case 'settings-users':
        return <Settings activePage={activePage} />;

      // Other
      case 'recycle-bin':
        return <RecycleBin />;
        
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Sidebar 
          isOpen={sidebarOpen} 
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
          closeMobileSidebar={() => setSidebarOpen(false)}
          user={user}
          onNavigate={handleNavigate}
        />
        
        <TopBar 
          toggleMobileSidebar={toggleSidebar}
          isDark={isDark}
          toggleTheme={toggleTheme}
          isCollapsed={isCollapsed}
        />

        <main className={`transition-all duration-300 pt-20 px-4 md:px-6 pb-8 min-h-screen
          ${isCollapsed ? 'lg:ml-20' : 'lg:ml-72'}
        `}>
          {renderContent()}
        </main>

        <GeminiChatWidget />
      </div>
    </ToastProvider>
  );
};
