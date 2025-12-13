
import React, { useState, useEffect } from 'react';
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
import { UserLogs } from './components/UserLogs'; // Import UserLogs
import { ToastProvider } from './context/ToastContext';
import { PermissionProvider } from './context/PermissionContext'; // Import PermissionProvider
import { UserProfile } from './types';
import { dbService, supabase } from './services/supabase';
import { LoginPage } from './components/LoginPage';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [pageData, setPageData] = useState<any>(null);
  
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Admin User',
    role: 'Viewer',
    avatarUrl: '',
    email: ''
  });

  // Check Session on Mount
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        // 1. Race Supabase Auth Check against a 5s timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 5000)
        );

        const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (mounted) {
          setSession(data?.session);
          
          // 2. If authenticated, try loading profile with a separate timeout
          if (data?.session?.user?.email) {
            const profilePromise = loadUserProfile(data.session.user.email);
            const profileTimeout = new Promise((resolve) => setTimeout(resolve, 5000));
            await Promise.race([profilePromise, profileTimeout]);
          }
        }
      } catch (error) {
        console.error("Session initialization error:", error);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setIsLoadingSession(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        if (session?.user?.email) {
          loadUserProfile(session.user.email);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (email: string) => {
    try {
      const profile = await dbService.getCurrentUserProfile(email);
      if (profile) {
        setUserProfile({
          name: profile.full_name,
          role: profile.role,
          email: profile.email,
          avatarUrl: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=6366f1&color=fff`
        });
      } else {
        setUserProfile({
          name: email.split('@')[0],
          role: 'Viewer',
          email: email,
          avatarUrl: `https://ui-avatars.com/api/?name=${email}&background=random`
        });
      }
    } catch (e) {
      console.warn("Failed to load user profile", e);
    }
  };

  // Core System: Load Title & Theme
  useEffect(() => {
    const initSystem = async () => {
      try {
        const settingsPromise = dbService.getSystemSettings();
        const timeout = new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000));
        const settings: any = await Promise.race([settingsPromise, timeout]);
        
        if (settings && (settings.system_title || settings.school_name)) {
          document.title = `${settings.system_title || settings.school_name} | Admin Panel`;
        }
      } catch (e) {
        console.warn("Failed to load system settings for title");
      }
    };
    initSystem();
  }, []);

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
        // Aggressively clear storage to prevent stuck sessions
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
        return <Employees />;
      case 'add-employee':
        return <Employees initialAction="add" />;
      case 'login-deactivate':
        return <Employees />; 
      case 'add-department':
      case 'add-designation':
        return <DepartmentSettings />;

      case 'users':
        return <UserManagement />;

      case 'user-logs':
        return <UserLogs />;

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
        <LoginPage onLoginSuccess={() => { /* State updates via onAuthStateChange */ }} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
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
            {renderContent()}
          </main>

          <GeminiChatWidget />
        </div>
      </PermissionProvider>
    </ToastProvider>
  );
};
