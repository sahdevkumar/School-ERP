
import * as React from 'react';
import { Menu, Sun, Moon, Bell, Search, LogOut } from 'lucide-react';
import { UserProfile } from '../types';

interface TopBarProps {
  toggleMobileSidebar: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  isCollapsed: boolean;
  user?: UserProfile;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ toggleMobileSidebar, isDark, toggleTheme, isCollapsed, user, onLogout }) => {
  return (
    <header className={`fixed top-0 right-0 z-20 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-all duration-300
      ${isCollapsed ? 'lg:left-20' : 'lg:left-72'} left-0
    `}>
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMobileSidebar}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            title="Toggle Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="hidden md:flex items-center relative">
            <Search className="w-5 h-5 absolute left-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search students, classes..." 
              className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/50 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64 dark:text-white transition-all focus:w-80"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 relative" title="Notifications">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          </button>
          
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-6 h-6 text-yellow-500" /> : <Moon className="w-6 h-6 text-gray-600" />}
          </button>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

          <button 
            onClick={onLogout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors ml-1"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
