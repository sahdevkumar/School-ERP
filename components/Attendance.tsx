
import React, { useState, useEffect } from 'react';
import { CalendarCheck, Save, Loader2, Search, Check, X, Clock, AlertCircle } from 'lucide-react';
import { dbService } from '../services/supabase';
import { Student, StudentAttendance } from '../types';
import { useToast } from '../context/ToastContext';

export const Attendance: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent' | 'late' | 'half_day'>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;
    const loadClasses = async () => {
      // Strictly implement data from system_settings > config_classes
      const fields = await dbService.getStudentFields();
      const classList = fields.classes || [];

      if (mounted) {
        setClasses(classList);
        if (classList.length > 0 && !selectedClass) {
          setSelectedClass(classList[0]);
        }
      }
    };
    loadClasses();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (selectedClass && date) {
      fetchAttendanceData();
    }
  }, [selectedClass, date]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      // Fetch active students belonging to the selected class
      const allStudents = await dbService.getAllStudents();
      const classStudents = allStudents.filter(s => s.class_section === selectedClass);
      setStudents(classStudents);

      // Fetch existing attendance records for this date
      const existing = await dbService.getStudentAttendance(date, selectedClass);
      
      // Initialize state: use existing record or default to 'present'
      const newAttendance: Record<number, any> = {};
      classStudents.forEach(s => {
        const record = existing.find(r => r.student_id === s.id);
        newAttendance[s.id] = record ? record.status : 'present';
      });
      setAttendance(newAttendance);
    } catch (error) {
      console.error("Attendance fetch error:", error);
      showToast("Could not load attendance data", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedClass) {
      showToast("Please select a class first", 'error');
      return;
    }
    setSaving(true);
    const records: Partial<StudentAttendance>[] = students.map(s => ({
      student_id: s.id,
      date: date,
      status: attendance[s.id] || 'present'
    }));

    const result = await dbService.saveAttendance(records);
    setSaving(false);
    if (result.success) {
      showToast("Attendance saved successfully!");
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to save: " + errorMsg, 'error');
    }
  };

  const stats = {
    total: students.length,
    present: Object.values(attendance).filter(s => s === 'present').length,
    absent: Object.values(attendance).filter(s => s === 'absent').length,
    late: Object.values(attendance).filter(s => s === 'late').length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-8 h-8 text-indigo-600" /> Daily Attendance
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Class management powered by system configuration.</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none">
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all" 
            />
          </div>
          <div className="flex-1 md:flex-none">
            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Select Class</label>
            <select 
              value={selectedClass} 
              onChange={e => setSelectedClass(e.target.value)} 
              className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all min-w-[150px]"
            >
              <option value="">Choose Class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total Students</span>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-green-500 dark:border-green-600 shadow-sm text-center">
          <span className="text-green-600 text-xs uppercase font-bold tracking-wider">Present</span>
          <p className="text-2xl font-black text-green-700 dark:text-green-400">{stats.present}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-red-500 dark:border-red-600 shadow-sm text-center">
          <span className="text-red-600 text-xs uppercase font-bold tracking-wider">Absent</span>
          <p className="text-2xl font-black text-red-700 dark:text-red-400">{stats.absent}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-orange-500 dark:border-orange-600 shadow-sm text-center">
          <span className="text-orange-600 text-xs uppercase font-bold tracking-wider">Late</span>
          <p className="text-2xl font-black text-orange-700 dark:text-orange-400">{stats.late}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
          <p className="text-gray-500 font-medium">Fetching students for {selectedClass}...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-16 rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-4">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Students Found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">There are no active students currently enrolled in <span className="font-bold text-indigo-600">{selectedClass || 'this class'}</span>.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Adm No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Student Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Mark Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-5 text-sm font-medium text-gray-500 dark:text-gray-400">{student.admission_no || 'N/A'}</td>
                    <td className="px-6 py-5">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                             {student.full_name.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">{student.full_name}</span>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-3">
                        <button 
                          onClick={() => handleStatusChange(student.id, 'present')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${attendance[student.id] === 'present' ? 'bg-green-600 text-white shadow-lg shadow-green-500/30 ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'}`}
                        >
                          <Check className="w-4 h-4" /> Present
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${attendance[student.id] === 'absent' ? 'bg-red-600 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-500 ring-offset-2 dark:ring-offset-gray-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'}`}
                        >
                          <X className="w-4 h-4" /> Absent
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'late')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${attendance[student.id] === 'late' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-800' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'}`}
                        >
                          <Clock className="w-4 h-4" /> Late
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {students.length > 0 && !loading && (
        <div className="flex justify-end pt-4 pb-12">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3 font-bold disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
            Submit Attendance for {selectedClass}
          </button>
        </div>
      )}
    </div>
  );
};
