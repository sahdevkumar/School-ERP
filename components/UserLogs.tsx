
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  Loader2, 
  Clock, 
  Globe, 
  User, 
  Filter,
  GraduationCap,
  Briefcase,
  Shield,
  UserCog
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { UserLog, SystemUser, Employee, Student } from '../types';

export const UserLogs: React.FC = () => {
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<string>(''); // '' | 'system_user' | 'employee' | 'student'
  const [selectedUserEmail, setSelectedUserEmail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Use getAllStudentsRaw to ensure we get inactive/provisional students too
      const [logsData, usersData, employeesData, studentsData] = await Promise.all([
        dbService.getUserLogs(),
        dbService.getSystemUsers(),
        dbService.getEmployees(),
        dbService.getAllStudentsRaw() 
      ]);
      setLogs(logsData);
      setUsers(usersData);
      setEmployees(employeesData);
      setStudents(studentsData);
    } catch (error) {
      console.error("Failed to load user logs or entity data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper Maps for fast lookup - KEYS ARE NORMALIZED (lowercase, trimmed)
  const userMap = useMemo(() => {
    const map = new Map<string, { name: string, type: string, role: string }>();
    
    const normalize = (email?: string) => email ? email.toLowerCase().trim() : '';

    users.forEach(u => {
      if(u.email) map.set(normalize(u.email), { name: u.full_name, type: 'system_user', role: u.role });
    });
    
    employees.forEach(e => {
      if (e.email) map.set(normalize(e.email), { name: e.full_name, type: 'employee', role: e.subject || 'Employee' });
    });
    
    students.forEach(s => {
      if (s.email) map.set(normalize(s.email), { name: s.full_name, type: 'student', role: 'Student' });
    });
    
    return map;
  }, [users, employees, students]);

  const getUserDisplayInfo = (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    const info = userMap.get(normalizedEmail);
    
    if (info) {
      let Icon = User;
      let colorClass = 'text-gray-600 bg-gray-100';
      let typeLabel = 'User';

      if (info.type === 'system_user') {
        Icon = Shield;
        colorClass = 'text-indigo-600 bg-indigo-50';
        typeLabel = 'System User';
      } else if (info.type === 'employee') {
        Icon = Briefcase;
        colorClass = 'text-emerald-600 bg-emerald-50';
        typeLabel = 'Employee';
      } else if (info.type === 'student') {
        Icon = GraduationCap;
        colorClass = 'text-blue-600 bg-blue-50';
        typeLabel = 'Student';
      }

      return { ...info, Icon, colorClass, typeLabel };
    }
    return { name: email, type: 'unknown', role: 'Unknown', Icon: User, colorClass: 'text-gray-500 bg-gray-100', typeLabel: 'Unknown' };
  };

  // Generate Filter Options based on selected Type
  const filterOptions = useMemo(() => {
    const options: { email: string, name: string, typeLabel: string }[] = [];
    const addedEmails = new Set<string>();

    const addOption = (email: string | undefined, name: string, typeLabel: string) => {
      if (!email) return;
      const normalizedEmail = email.toLowerCase().trim();
      
      if (normalizedEmail && !addedEmails.has(normalizedEmail)) {
        // We store the original email for display/key, but check duplicates with normalized
        options.push({ email: email, name, typeLabel });
        addedEmails.add(normalizedEmail);
      }
    };

    if (selectedUserType === '' || selectedUserType === 'system_user') {
      users.forEach(u => addOption(u.email, u.full_name, 'System User'));
    }
    if (selectedUserType === '' || selectedUserType === 'employee') {
      employees.forEach(e => addOption(e.email, e.full_name, 'Employee'));
    }
    if (selectedUserType === '' || selectedUserType === 'student') {
      students.forEach(s => addOption(s.email, s.full_name, 'Student'));
    }

    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, employees, students, selectedUserType]);

  const filteredLogs = logs.filter(log => {
    const logEmail = log.user_email.toLowerCase().trim();
    
    // 1. Text Search
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      logEmail.includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      (log.details || '').toLowerCase().includes(searchLower);
    
    // 2. User Type Filter
    let matchesType = true;
    const userInfo = userMap.get(logEmail);
    
    if (selectedUserType) {
      if (selectedUserType === 'system_user') matchesType = userInfo?.type === 'system_user';
      else if (selectedUserType === 'employee') matchesType = userInfo?.type === 'employee';
      else if (selectedUserType === 'student') matchesType = userInfo?.type === 'student';
      else matchesType = false;
    }

    // 3. Specific User Filter (Normalize both sides)
    const matchesUser = selectedUserEmail ? logEmail === selectedUserEmail.toLowerCase().trim() : true;

    return matchesSearch && matchesType && matchesUser;
  });

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setIsFiltering(true);
    // Simulate processing time for better UX feedback
    setTimeout(() => {
      setSelectedUserType(newValue);
      setSelectedUserEmail(''); // Reset specific user selection when type changes
      setIsFiltering(false);
    }, 500); // Increased slightly to make the red blink noticeable
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setIsFiltering(true);
    setTimeout(() => {
      setSelectedUserEmail(newValue);
      setIsFiltering(false);
    }, 500);
  };

  // Logic for the Next Dropdown (User Name) green border
  const isUserDropdownReady = !isFiltering && selectedUserType !== '' && filterOptions.length > 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-8 h-8 text-indigo-600" /> User Logs
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Monitor system activity, user actions, and security events.
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64 lg:w-72">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search action, details..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          
          {/* User Type Filter */}
          <div className="relative w-full sm:w-48">
            <Filter className={`absolute left-3 top-2.5 h-5 w-5 ${isFiltering ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
            <select
              value={selectedUserType}
              onChange={handleTypeChange}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white outline-none appearance-none cursor-pointer transition-all duration-200 ${
                isFiltering 
                  ? 'border-red-500 ring-2 ring-red-500/20 animate-pulse' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500'
              }`}
            >
              <option value="">All Types</option>
              <option value="system_user">System Users</option>
              <option value="employee">Employees</option>
              <option value="student">Students</option>
            </select>
          </div>

          {/* User Name Filter */}
          <div className="relative w-full sm:w-64">
            <UserCog className={`absolute left-3 top-2.5 h-5 w-5 ${isFiltering ? 'text-red-500 animate-pulse' : isUserDropdownReady ? 'text-green-600' : 'text-gray-400'}`} />
            <select
              value={selectedUserEmail}
              onChange={handleUserChange}
              disabled={isFiltering}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white outline-none appearance-none cursor-pointer transition-all duration-200 ${
                isFiltering 
                  ? 'border-red-500 ring-2 ring-red-500/20 animate-pulse' 
                  : isUserDropdownReady
                    ? 'border-green-500 ring-2 ring-green-500/20' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500'
              }`}
            >
              <option value="">All Users</option>
              {filterOptions.map(option => (
                <option key={option.email} value={option.email}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={loadData} 
          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center gap-2 shrink-0"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium sm:hidden">Refresh</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {isFiltering ? 'Filtering...' : 'No activity logs found matching your filters.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const { name, Icon, colorClass, typeLabel } = getUserDisplayInfo(log.user_email);
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${colorClass} bg-opacity-20`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {name}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{log.user_email}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 uppercase font-semibold border border-gray-200 dark:border-gray-600">
                                {typeLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.action.toLowerCase().includes('delete') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          log.action.toLowerCase().includes('add') || log.action.toLowerCase().includes('create') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          log.action.toLowerCase().includes('update') || log.action.toLowerCase().includes('edit') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Globe className="w-4 h-4" />
                          {log.ip_address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate block max-w-xs" title={log.details}>
                          {log.details || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && filteredLogs.length > 0 && (
           <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
             Showing {filteredLogs.length} recent activities.
           </div>
        )}
      </div>
    </div>
  );
};
