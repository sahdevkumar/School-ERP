
import React, { useState, useEffect } from 'react';
import { CalendarCheck, Save, Loader2, Search, Check, X, Clock } from 'lucide-react';
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
    const loadClasses = async () => {
      const fields = await dbService.getStudentFields();
      setClasses(fields.classes);
      if(fields.classes.length > 0) setSelectedClass(fields.classes[0]);
    };
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && date) {
      fetchAttendanceData();
    }
  }, [selectedClass, date]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    // Fetch students in class
    const allStudents = await dbService.getAllStudents();
    const classStudents = allStudents.filter(s => s.class_section === selectedClass);
    setStudents(classStudents);

    // Fetch existing attendance
    const existing = await dbService.getStudentAttendance(date, selectedClass);
    
    // Merge
    const newAttendance: Record<number, any> = {};
    classStudents.forEach(s => {
      const record = existing.find(r => r.student_id === s.id);
      newAttendance[s.id] = record ? record.status : 'present'; // Default to present
    });
    setAttendance(newAttendance);
    setLoading(false);
  };

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
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
      showToast("Failed to save: " + result.error, 'error');
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
            <CalendarCheck className="w-8 h-8 text-indigo-600" /> Attendance
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Mark daily attendance for students.</p>
        </div>
        <div className="flex gap-4">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <span className="text-gray-500 text-xs uppercase font-bold">Total</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-green-200 dark:border-green-900/50 shadow-sm text-center">
          <span className="text-green-600 text-xs uppercase font-bold">Present</span>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.present}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm text-center">
          <span className="text-red-600 text-xs uppercase font-bold">Absent</span>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.absent}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-orange-200 dark:border-orange-900/50 shadow-sm text-center">
          <span className="text-orange-600 text-xs uppercase font-bold">Late</span>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.late}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Roll / Adm No</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Student Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-gray-500">{student.admission_no || '-'}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{student.full_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleStatusChange(student.id, 'present')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${attendance[student.id] === 'present' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                          <Check className="w-4 h-4" /> Present
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'absent')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${attendance[student.id] === 'absent' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                          <X className="w-4 h-4" /> Absent
                        </button>
                        <button 
                          onClick={() => handleStatusChange(student.id, 'late')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${attendance[student.id] === 'late' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                          <Clock className="w-4 h-4" /> Late
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={3} className="py-12 text-center text-gray-500">No students found in {selectedClass}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6">
        <button 
          onClick={handleSave} 
          disabled={saving || students.length === 0}
          className="px-6 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center gap-2 font-medium disabled:opacity-50 disabled:scale-100"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Attendance
        </button>
      </div>
    </div>
  );
};
