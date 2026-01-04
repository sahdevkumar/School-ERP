
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  School,
  ChevronDown,
  LogOut, 
} from 'lucide-react';
import { NavItem, UserProfile } from '../types';
import { dbService } from '../services/supabase';
import { getIcon } from '../utils/iconMap';
import { usePermissions } from '../context/PermissionContext';

interface SidebarProps {
  isOpen: boolean; // Mobile toggle state
  isCollapsed: boolean; // Desktop collapse state
  toggleCollapse: () => void;
  closeMobileSidebar: () => void;
  user: UserProfile;
  onNavigate: (page: string, data?: any) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  isCollapsed, 
  toggleCollapse, 
  closeMobileSidebar,
  user,
  onNavigate,
  onLogout
}) => {
  const { can, isLoading: isPermissionsLoading } = usePermissions();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [activeLink, setActiveLink] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  
  // Core System State
  const [systemTitle, setSystemTitle] = useState('EduSphere');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadCoreSystem = async () => {
      setIsMenuLoading(true);
      
      try {
        // Load Menu with timeout
        const menuPromise = dbService.getMenuLayout();
        const settingsPromise = dbService.getSystemSettings();
        
        // Use a Promise.all with a global timeout for sidebar data
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('Sidebar timeout'), 5000));
        
        const [menuLayout, settings] = await Promise.race([
          Promise.all([menuPromise, settingsPromise]),
          timeoutPromise
        ]) as [NavItem[], any];

        setNavItems(menuLayout || []);

        if (settings) {
          if (settings.system_title) setSystemTitle(settings.system_title);
          else if (settings.school_name) setSystemTitle(settings.school_name);
          
          if (settings.school_logo_url) setLogoUrl(settings.school_logo_url);
        }
      } catch (error) {
        console.warn("Sidebar data load failed/timed out, using defaults", error);
        // Fallback to default menu if fetch failed
        if (navItems.length === 0) {
           const defaults = await dbService.getMenuLayout(); // This gets defaults if DB fails anyway
           setNavItems(defaults);
        }
      } finally {
        setIsMenuLoading(false);
      }
    };
    loadCoreSystem();
  }, []);

  const handleParentClick = (label: string) => {
    if (isCollapsed) {
      toggleCollapse();
      if (!expandedMenus.includes(label)) {
        setExpandedMenus(prev => [...prev, label]);
      }
      return;
    }

    setExpandedMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label) 
        : [...prev, label]
    );
  };

  const handleLinkClick = (href: string) => {
    setActiveLink(href);
    onNavigate(href);
    if (window.innerWidth < 1024) {
      closeMobileSidebar();
    }
  };

  const checkAccess = (item: NavItem): boolean => {
    let module = '';

    // Map Sidebar Items to Permission Modules
    const label = item.label.toLowerCase();
    const href = (item.href || '').toLowerCase();

    // If item has children, it's a container.
    if (item.children && item.children.length > 0) {
      return item.children.some(child => checkAccess(child));
    }

    if (label === 'dashboard' || href === 'dashboard') module = 'dashboard';
    else if (label === 'students' || href === 'students') module = 'students';
    else if (label === 'employee' || href === 'employees' || href === 'teachers') module = 'employees';
    else if (label === 'attendance' || href === 'attendance') module = 'attendance';
    else if (label === 'fees' || href === 'fees') module = 'fees';
    else if (label === 'admission' || href.includes('admission') || href === 'registration' || href === 'admission-enquiry') module = 'admission';
    else if (label === 'reception') module = 'admission';
    else if (label.includes('settings') || href.includes('settings') || href.includes('configuration') || href.includes('config') || href === 'menu-layout' || href === 'role-permissions' || href === 'add-department' || href === 'system-student-field') module = 'settings';
    else if (label === 'user management' || href === 'users' || href === 'settings-users') module = 'users';
    else if (label === 'activity control' || href === 'user-logs') module = 'activity';
    else if (label === 'recycle bin' || href === 'recycle-bin') module = 'recycle_bin';

    // If mapped to a module, check 'view' permission
    if (module) {
      return can(module, 'view');
    }

    // Default allow if no restriction found (e.g. custom external links)
    return true; 
  };
  
  const renderNavItem = (item: NavItem) => {
    // Permission Check using Context
    if (!checkAccess(item)) return null;

    const isExpanded = expandedMenus.includes(item.label);
    const hasChildren = item.children && item.children.length > 0;
    
    // Filter children based on permissions
    const visibleChildren = hasChildren ? item.children!.filter(child => checkAccess(child)) : [];
    const hasVisibleChildren = visibleChildren.length > 0;

    const isActive = activeLink === item.href;
    const Icon = getIcon(item.icon);

    if (hasVisibleChildren) {
      return (
        <div key={item.label}>
          <button 
            onClick={() => handleParentClick(item.label)}
            className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors 
              ${isExpanded ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}
              ${isCollapsed ? 'justify-center' : ''}
              hover:bg-gray-100 dark:hover:bg-gray-700
            `}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            {!isCollapsed && <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
          </button>
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded && !isCollapsed ? 'max-h-96' : 'max-h-0'}`}
          >
            <div className="pl-8 pt-2 space-y-2">
              {visibleChildren.map(child => renderNavItem(child))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <a 
        key={item.label}
        href="#"
        onClick={(e) => { e.preventDefault(); handleLinkClick(item.href!); }}
        className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors
          ${isCollapsed ? 'justify-center' : ''}
          ${isActive 
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
      >
        <Icon className="w-5 h-5" />
        {!isCollapsed && <span>{item.label}</span>}
      </a>
    );
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobileSidebar}
      ></div>

      <aside className={`fixed top-0 left-0 z-40 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-72'}
        lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className={`flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-700 px-4 ${isCollapsed ? 'px-0 justify-center' : ''}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-2 bg-indigo-500 rounded-lg shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" />
              ) : (
                <School className="w-6 h-6 text-white" />
              )}
            </div>
            {!isCollapsed && <span className="text-xl font-bold text-gray-900 dark:text-white truncate">{systemTitle}</span>}
          </div>
          <button 
            onClick={toggleCollapse} 
            className="hidden lg:block p-2 text-gray-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {isMenuLoading || isPermissionsLoading ? (
            <div className="text-center text-gray-500 text-sm mt-4">Loading Menu...</div>
          ) : (
            navItems.map(item => renderNavItem(item))
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col justify-center' : ''}`}>
            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} alt={user.name} className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-200 dark:bg-gray-700" />
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
            )}
            <button 
              onClick={onLogout}
              className={`p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors ${isCollapsed ? 'mt-2' : ''}`}
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
