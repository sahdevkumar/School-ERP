
import React, { useState, useEffect } from 'react';
import { 
  Banknote, CreditCard, TrendingUp, TrendingDown, Receipt, 
  Search, Plus, Save, Trash2, Loader2, Calendar, FileText,
  DollarSign, CheckCircle, AlertCircle, Filter, PieChart
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { FeeStructure, Expense, Student, FeePayment, StudentFeeDue } from '../types';
import { useToast } from '../context/ToastContext';
import { StatCard } from './StatCard';

interface FinanceProps {
  activeTab?: string;
}

export const Finance: React.FC<FinanceProps> = ({ activeTab = 'overview' }) => {
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const renderContent = () => {
    switch(currentTab) {
      case 'overview': return <FinanceOverview />;
      case 'collection': return <FeeCollection />;
      case 'structures': return <FeeStructures />;
      case 'expenses': return <ExpensesManager />;
      default: return <FinanceOverview />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Banknote className="w-8 h-8 text-indigo-600" /> Finance Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Track fees, expenses, and financial health.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: PieChart },
          { id: 'collection', label: 'Collect Fees', icon: CreditCard },
          { id: 'structures', label: 'Fee Structures', icon: FileText },
          { id: 'expenses', label: 'Expenses', icon: TrendingDown },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              currentTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {renderContent()}
    </div>
  );
};

// --- Sub-Components ---

const FinanceOverview = () => {
  const stats = {
    collectedToday: 15000,
    monthlyCollection: 450000,
    pendingFees: 120000,
    totalExpenses: 85000
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Collected Today" value={`$${stats.collectedToday.toLocaleString()}`} change="+5%" isPositive={true} icon={Receipt} color="bg-emerald-500" />
        <StatCard title="Monthly Collection" value={`$${stats.monthlyCollection.toLocaleString()}`} change="+12%" isPositive={true} icon={TrendingUp} color="bg-blue-500" />
        <StatCard title="Pending Fees" value={`$${stats.pendingFees.toLocaleString()}`} change="-2%" isPositive={false} icon={AlertCircle} color="bg-orange-500" />
        <StatCard title="Expenses (This Month)" value={`$${stats.totalExpenses.toLocaleString()}`} change="+8%" isPositive={false} icon={TrendingDown} color="bg-red-500" />
      </div>
      
      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-80 flex items-center justify-center text-gray-400">
          Chart: Income vs Expense (Coming Soon)
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-80 flex items-center justify-center text-gray-400">
          Chart: Fee Collection Trends (Coming Soon)
        </div>
      </div>
    </div>
  );
};

const FeeCollection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dues, setDues] = useState<StudentFeeDue[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToast();

  // Mock Dues Generator
  const generateMockDues = (studentId: number) => [
    { id: 1, student_id: studentId, fee_structure_id: 1, fee_name: 'Tuition Fee - Apr', amount_due: 5000, amount_paid: 0, due_date: '2024-04-10', status: 'overdue' },
    { id: 2, student_id: studentId, fee_structure_id: 1, fee_name: 'Tuition Fee - May', amount_due: 5000, amount_paid: 2000, due_date: '2024-05-10', status: 'partially_paid' },
    { id: 3, student_id: studentId, fee_structure_id: 2, fee_name: 'Transport Fee - May', amount_due: 1500, amount_paid: 0, due_date: '2024-05-10', status: 'pending' },
  ] as StudentFeeDue[];

  useEffect(() => {
    const search = async () => {
      if (searchTerm.length > 2) {
        const allStudents = await dbService.getAllStudentsRaw();
        const matches = allStudents.filter(s => 
          s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (s.admission_no || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        setStudents(matches.slice(0, 5));
      } else {
        setStudents([]);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setDues(generateMockDues(student.id)); // Replace with API call
    setSearchTerm('');
    setStudents([]);
  };

  const handlePayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      showToast("Please enter a valid amount", 'error');
      return;
    }
    setIsProcessing(true);
    // Simulate API Call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app: await dbService.collectFee(...)
    
    showToast(`Payment of $${paymentAmount} collected successfully!`);
    setIsProcessing(false);
    setPaymentAmount('');
    // Refresh dues
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Left: Search & Student Info */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Find Student</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Name or Admission No..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {students.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {students.map(s => (
                  <div key={s.id} onClick={() => handleSelectStudent(s)} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0 border-gray-100 dark:border-gray-700">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{s.full_name}</p>
                    <p className="text-xs text-gray-500">{s.admission_no} • {s.class_section}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedStudent && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-scale-in">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-2xl font-bold text-indigo-600 mb-3 overflow-hidden">
                {selectedStudent.photo_url ? <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover"/> : selectedStudent.full_name.charAt(0)}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedStudent.full_name}</h3>
              <p className="text-sm text-gray-500">{selectedStudent.admission_no}</p>
              <span className="mt-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {selectedStudent.class_section} {selectedStudent.section}
              </span>
            </div>
            <div className="space-y-2 text-sm border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex justify-between"><span className="text-gray-500">Parent</span> <span className="font-medium">{selectedStudent.father_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Contact</span> <span className="font-medium">{selectedStudent.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fee Category</span> <span className="font-medium">{selectedStudent.fee_category || 'Standard'}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Right: Dues & Payment */}
      <div className="lg:col-span-2">
        {selectedStudent ? (
          <div className="space-y-6 animate-fade-in">
            {/* Dues List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <h3 className="font-bold text-gray-900 dark:text-white">Pending Dues</h3>
                <span className="text-sm text-gray-500">Total Pending: <span className="text-red-600 font-bold">${dues.reduce((sum, d) => sum + (d.amount_due - d.amount_paid), 0)}</span></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Fee Name</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {dues.map(due => (
                      <tr key={due.id}>
                        <td className="px-4 py-3 font-medium">{due.fee_name}</td>
                        <td className="px-4 py-3 text-gray-500">{due.due_date}</td>
                        <td className="px-4 py-3 text-right">${due.amount_due}</td>
                        <td className="px-4 py-3 text-right text-green-600">${due.amount_paid}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-bold">${due.amount_due - due.amount_paid}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${due.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {due.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Form */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" /> Collect Payment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <input 
                      type="number" 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)} 
                      className="w-full pl-8 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Payment Mode</label>
                  <select 
                    value={paymentMode} 
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                  </select>
                </div>
                <button 
                  onClick={handlePayment} 
                  disabled={isProcessing}
                  className="md:col-span-2 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-70"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 min-h-[400px]">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <p>Search for a student to view dues and collect fees.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FeeStructures = () => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<FeeStructure>>({});
  const { showToast } = useToast();

  useEffect(() => {
    loadStructures();
  }, []);

  const loadStructures = async () => {
    const data = await dbService.getFeeStructures();
    if (data.length === 0) {
      // Mock data if empty
      setStructures([
        { id: 1, name: 'Tuition Fee', amount: 5000, frequency: 'Monthly', class_id: 'All' },
        { id: 2, name: 'Annual Development', amount: 12000, frequency: 'Yearly', class_id: 'All' },
        { id: 3, name: 'Computer Lab', amount: 1000, frequency: 'Monthly', class_id: 'Class 10' },
      ]);
    } else {
      setStructures(data);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.saveFeeStructure(formData as FeeStructure);
    showToast("Fee Structure Saved");
    setModalOpen(false);
    loadStructures();
  };

  const handleDelete = async (id: number) => {
    if(confirm("Delete this fee structure?")) {
      await dbService.deleteFeeStructure(id);
      setStructures(prev => prev.filter(s => s.id !== id));
      showToast("Fee Structure Deleted");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => { setFormData({frequency: 'Monthly'}); setModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Fee Structure
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {structures.map(struct => (
          <div key={struct.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{struct.name}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 inline-block">{struct.class_id || 'All Classes'}</span>
              </div>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">${struct.amount}</span>
              <span className="text-sm text-gray-500">/ {struct.frequency}</span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-2">{struct.description || 'No description'}</p>
            
            <button onClick={() => handleDelete(struct.id!)} className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 dark:text-white">Add Fee Structure</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input placeholder="Fee Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Amount" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} required />
                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value as any})}>
                  <option>Monthly</option><option>Quarterly</option><option>Yearly</option><option>One Time</option>
                </select>
              </div>
              <input placeholder="Applicable Class (e.g. Class 10 or All)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.class_id || ''} onChange={e => setFormData({...formData, class_id: e.target.value})} />
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ExpensesManager = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({ date: new Date().toISOString().split('T')[0] });
  const { showToast } = useToast();

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const data = await dbService.getExpenses();
    setExpenses(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await dbService.addExpense(formData as Expense);
    showToast("Expense Recorded");
    setModalOpen(false);
    setFormData({ date: new Date().toISOString().split('T')[0] });
    loadExpenses();
  };

  const handleDelete = async (id: number) => {
    if(confirm("Delete this expense record?")) {
      await dbService.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
      showToast("Expense Deleted");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {/* Filters could go here */}
        </div>
        <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-500">Date</th>
                <th className="px-6 py-4 font-medium text-gray-500">Title</th>
                <th className="px-6 py-4 font-medium text-gray-500">Category</th>
                <th className="px-6 py-4 font-medium text-gray-500">Amount</th>
                <th className="px-6 py-4 font-medium text-gray-500">Mode</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {expenses.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No expenses recorded yet.</td></tr>
              ) : (
                expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4 text-gray-900 dark:text-white">{expense.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{expense.title}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{expense.category}</span></td>
                    <td className="px-6 py-4 font-bold text-red-600">${expense.amount}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{expense.payment_mode}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(expense.id!)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-500"/> Record Expense</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input type="date" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              <input placeholder="Expense Title (e.g. Electricity Bill)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Amount" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} required />
                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} required>
                  <option value="">Category</option><option>Utilities</option><option>Maintenance</option><option>Salary</option><option>Events</option><option>Supplies</option><option>Other</option>
                </select>
              </div>
              <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={formData.payment_mode || ''} onChange={e => setFormData({...formData, payment_mode: e.target.value})} required>
                  <option value="">Payment Mode</option><option>Cash</option><option>Bank Transfer</option><option>Card</option>
              </select>
              <textarea placeholder="Notes (Optional)" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" rows={2} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} />
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
