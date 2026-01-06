
import * as React from 'react';
import { StatCard } from './StatCard';
import { Users, GraduationCap, CalendarCheck, DollarSign, RefreshCw, Database, CheckCircle2, AlertCircle, LayoutTemplate, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dbService } from '../services/supabase';
import { DashboardStats, AttendanceRecord, StudentDemographic, Student, DashboardLayoutConfig } from '../types';
import { useSettings } from '../context/SettingsContext';

const COLORS = ['#6366f1', '#ec4899'];

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currencySymbol } = useSettings();
  const [loading, setLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(false);
  const [stats, setStats] = React.useState<DashboardStats>({
    totalStudents: 0,
    totalEmployees: 0,
    attendanceRate: 0,
    revenue: 0
  });
  const [attendanceData, setAttendanceData] = React.useState<AttendanceRecord[]>([]);
  const [genderData, setGenderData] = React.useState<StudentDemographic[]>([]);
  const [recentStudents, setRecentStudents] = React.useState<Student[]>([]);
  
  // Layout Config
  const [layout, setLayout] = React.useState<DashboardLayoutConfig>({
    stats_students: true,
    stats_employees: true, // Renamed from stats_teachers
    stats_attendance: true,
    stats_revenue: true,
    chart_attendance: true,
    chart_demographics: true,
    recent_activity: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Check DB connection first
      const connected = await dbService.checkConnection();
      setIsConnected(connected);

      const [statsData, attData, demData, studentsData, layoutConfig] = await Promise.all([
        dbService.getDashboardStats(),
        dbService.getAttendanceData(),
        dbService.getDemographics(),
        dbService.getRecentStudents(),
        dbService.getDashboardLayout()
      ]);
      
      setStats(statsData);
      setAttendanceData(attData);
      setGenderData(demData);
      setRecentStudents(studentsData);
      setLayout(layoutConfig);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500">Connecting to PostgreSQL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome back, Admin. Here's what's happening today.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
            isConnected 
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
          }`}>
            {isConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">PostgreSQL Connected</span>
                <span className="sm:hidden">DB On</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Using Mock Data</span>
                <span className="sm:hidden">Mock</span>
              </>
            )}
          </div>

          <button 
            onClick={() => onNavigate?.('dashboard-layout')}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <LayoutTemplate className="w-4 h-4" />
            <span className="hidden sm:inline">Customize</span>
          </button>

          <button 
            onClick={loadData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {layout.stats_students && (
          <StatCard 
            title="Total Students" 
            value={stats.totalStudents.toLocaleString()} 
            change="12%" 
            isPositive={true} 
            icon={GraduationCap} 
            color="bg-indigo-600" 
          />
        )}
        {layout.stats_employees && ( // Changed key
          <StatCard 
            title="Total Employees" 
            value={stats.totalEmployees.toLocaleString()} 
            change="3%" 
            isPositive={true} 
            icon={Users} 
            color="bg-emerald-500" 
          />
        )}
        {layout.stats_attendance && (
          <StatCard 
            title="Attendance" 
            value={`${stats.attendanceRate}%`} 
            change="0.8%" 
            isPositive={false} 
            icon={CalendarCheck} 
            color="bg-amber-500" 
          />
        )}
        {layout.stats_revenue && (
          <StatCard 
            title="Revenue" 
            value={`${currencySymbol}${(stats.revenue / 1000).toFixed(0)}k`} 
            change="8.2%" 
            isPositive={true} 
            icon={DollarSign} 
            color="bg-purple-600" 
          />
        )}
      </div>

      {/* Charts Section */}
      {(layout.chart_attendance || layout.chart_demographics) && (
        <div className={`grid grid-cols-1 ${layout.chart_attendance && layout.chart_demographics ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
          {/* Attendance Chart */}
          {layout.chart_attendance && (
            <div className={`${layout.chart_demographics ? 'lg:col-span-2' : ''} bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm`}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Attendance Overview</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceData}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorStudents)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Demographics Pie Chart */}
          {layout.chart_demographics && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Student Demographics</h3>
              <div className="h-64 relative">
                 <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {genderData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">Students</span>
                </div>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Boys</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Girls</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity List */}
      {layout.recent_activity && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Enrollments</h3>
            <button 
              onClick={() => onNavigate?.('students')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentStudents.length > 0 ? (
              recentStudents.map((student, i) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold overflow-hidden border border-indigo-200 dark:border-indigo-800 text-sm">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                      ) : (
                        (student.full_name || '?').charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {student.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className="bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-[10px]">{student.class_section}</span> 
                        <span>•</span>
                        <span className="capitalize">{student.gender}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    {new Date(student.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No recent enrollments found or database not connected.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
