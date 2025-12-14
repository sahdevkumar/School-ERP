
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Search, DollarSign, Calendar, Save, Loader2, CheckCircle, FileText } from 'lucide-react';
import { dbService } from '../services/supabase';
import { FeeStructure, Student, FeePayment } from '../types';
import { useToast } from '../context/ToastContext';

export const Fees: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'structure' | 'collection'>('collection');
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fee Structure Form
  const [newFee, setNewFee] = useState<Partial<FeeStructure>>({ name: '', amount: 0, frequency: 'Monthly', class_id: '' });
  
  // Collection Form
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [selectedFeeType, setSelectedFeeType] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [feeData, studentData] = await Promise.all([
      dbService.getFeeStructures(),
      dbService.getAllStudents()
    ]);
    setFees(feeData);
    setStudents(studentData);
    setLoading(false);
  };

  const handleAddFee = async () => {
    if (!newFee.name || !newFee.amount) {
      showToast("Name and Amount are required", 'error');
      return;
    }
    const result = await dbService.createFeeStructure(newFee as FeeStructure);
    if (result.success) {
      showToast("Fee Structure added");
      setNewFee({ name: '', amount: 0, frequency: 'Monthly', class_id: '' });
      fetchData();
    } else {
      showToast("Failed to add: " + result.error, 'error');
    }
  };

  const handleDeleteFee = async (id: number) => {
    if(!confirm("Delete this fee structure?")) return;
    const result = await dbService.deleteFeeStructure(id);
    if (result.success) {
      setFees(prev => prev.filter(f => f.id !== id));
      showToast("Fee deleted");
    } else {
      showToast("Failed to delete", 'error');
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.phone?.includes(searchTerm) ||
    s.admission_no?.includes(searchTerm)
  );

  const handleCollectFee = async () => {
    if (!selectedStudent || !paymentAmount) return;
    setIsProcessing(true);
    const payment: Partial<FeePayment> = {
      student_id: selectedStudent.id,
      fee_structure_id: selectedFeeType || undefined,
      amount: paymentAmount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: paymentMode,
      notes: "Manual Collection"
    };
    
    const result = await dbService.createFeePayment(payment);
    setIsProcessing(false);
    
    if (result.success) {
      showToast("Payment recorded successfully!");
      setSelectedStudent(null);
      setPaymentAmount(0);
    } else {
      showToast("Payment failed: " + result.error, 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-indigo-600" /> Fees Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Manage fee structures and collect payments.</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button onClick={() => setActiveTab('collection')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'collection' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Collect Fees</button>
          <button onClick={() => setActiveTab('structure')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'structure' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Fee Structure</button>
        </div>
      </div>

      {activeTab === 'structure' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Fee Structures</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <input placeholder="Fee Name (e.g. Tuition)" value={newFee.name} onChange={e => setNewFee({...newFee, name: e.target.value})} className="input-field md:col-span-2" />
            <input type="number" placeholder="Amount" value={newFee.amount || ''} onChange={e => setNewFee({...newFee, amount: Number(e.target.value)})} className="input-field" />
            <select value={newFee.frequency} onChange={e => setNewFee({...newFee, frequency: e.target.value})} className="input-field">
              <option>Monthly</option><option>Quarterly</option><option>Yearly</option><option>One-time</option>
            </select>
            <button onClick={handleAddFee} className="bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" /> Add</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 text-sm">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Frequency</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {fees.map(fee => (
                  <tr key={fee.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-3 pl-2 font-medium text-gray-900 dark:text-white">{fee.name}</td>
                    <td className="py-3 text-gray-600 dark:text-gray-300">{fee.frequency}</td>
                    <td className="py-3 font-semibold text-green-600">${fee.amount}</td>
                    <td className="py-3 text-right pr-2">
                      <button onClick={() => handleDeleteFee(fee.id!)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {fees.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-500">No fee structures defined.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'collection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Search List */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-[600px] flex flex-col">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search Student..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredStudents.map(student => (
                <div 
                  key={student.id} 
                  onClick={() => setSelectedStudent(student)}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors flex items-center gap-3 ${selectedStudent?.id === student.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {student.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{student.full_name}</h4>
                    <p className="text-xs text-gray-500">{student.class_section} • {student.admission_no}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
            {selectedStudent ? (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedStudent.full_name}</h2>
                    <p className="text-gray-500 text-sm">Admission No: {selectedStudent.admission_no}</p>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">Active</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fee Type</label>
                    <select 
                      className="input-field w-full"
                      onChange={(e) => {
                        const fee = fees.find(f => f.id === Number(e.target.value));
                        setSelectedFeeType(fee?.id || null);
                        if(fee) setPaymentAmount(fee.amount);
                      }}
                    >
                      <option value="">Select Fee (Optional)</option>
                      {fees.map(f => <option key={f.id} value={f.id}>{f.name} - ${f.amount}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Date</label>
                    <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-field w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount Paid ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input 
                        type="number" 
                        value={paymentAmount} 
                        onChange={e => setPaymentAmount(Number(e.target.value))}
                        className="input-field w-full pl-10" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Mode</label>
                    <select 
                      value={paymentMode} 
                      onChange={(e) => setPaymentMode(e.target.value as any)} 
                      className="input-field w-full"
                    >
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <button 
                    onClick={handleCollectFee} 
                    disabled={isProcessing || !paymentAmount}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Record Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <CreditCard className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a student to record fee payment</p>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`.input-field { width: 100%; padding: 10px; border-radius: 0.5rem; border: 1px solid #e5e7eb; background: #fff; } .dark .input-field { background: #374151; border-color: #4b5563; color: white; }`}</style>
    </div>
  );
};
