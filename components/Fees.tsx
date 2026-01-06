
import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Search, DollarSign, Calendar, Save, Loader2, CheckCircle, FileText, Tag, Settings, BookOpen } from 'lucide-react';
import { dbService } from '../services/supabase';
import { FeeStructure, Student, FeePayment, Discount } from '../types';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

interface FeesProps {
  initialTab?: 'structure' | 'collection';
}

export const Fees: React.FC<FeesProps> = ({ initialTab = 'collection' }) => {
  const { currencySymbol, currencyCode } = useSettings();
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fee Structure Form
  const [newFee, setNewFee] = useState<Partial<FeeStructure>>({ 
    name: '', 
    amount: 0, 
    frequency: 'Monthly', 
    class_id: 'All Classes' 
  });
  
  // Collection Form
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [selectedFeeType, setSelectedFeeType] = useState<number | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [feeData, studentData, discountData, classFields] = await Promise.all([
      dbService.getFeeStructures(),
      dbService.getAllStudents(),
      dbService.getDiscounts(),
      dbService.getStudentFields()
    ]);
    setFees(feeData);
    setStudents(studentData);
    setDiscounts(discountData.filter(d => d.category === 'student'));
    setAvailableClasses(classFields.classes || []);
    setLoading(false);
  };

  const calculateTotal = (feeId: number | null, discountId: string) => {
    const fee = fees.find(f => f.id === feeId);
    let amount = fee ? fee.amount : 0;
    
    const discount = discounts.find(d => d.id?.toString() === discountId);
    if (discount && amount > 0) {
        if (discount.type === 'percentage') {
            amount = amount - (amount * (discount.value / 100));
        } else {
            amount = amount - discount.value;
        }
    }
    setPaymentAmount(Math.max(0, Math.round(amount)));
  };

  const handleAddFee = async () => {
    if (!newFee.name || !newFee.amount) {
      showToast("Name and Amount are required", 'error');
      return;
    }
    const result = await dbService.createFeeStructure(newFee as FeeStructure);
    if (result.success) {
      showToast("Fee Structure added");
      setNewFee({ name: '', amount: 0, frequency: 'Monthly', class_id: 'All Classes' });
      fetchData();
    } else {
      showToast("Failed to add: " + (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)), 'error');
    }
  };

  const handleDeleteFee = async (id: number) => {
    if(!confirm("Delete this fee structure?")) return;
    const result = await dbService.deleteFeeStructure(id);
    if (result.success) {
      setFees(prev => prev.filter(f => f.id !== id));
      showToast("Fee deleted");
    } else {
      showToast("Failed to delete: " + (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)), 'error');
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.admission_no && s.admission_no.includes(searchTerm))
  );

  const handleCollectFee = async () => {
    if (!selectedStudent || !paymentAmount) return;
    setIsProcessing(true);
    
    let notes = "Manual Collection";
    if (selectedDiscountId) {
        const d = discounts.find(disc => disc.id?.toString() === selectedDiscountId);
        if (d) notes += ` (Discount Applied: ${d.name} - ${d.type === 'percentage' ? d.value + '%' : currencySymbol + d.value})`;
    }

    const payment: Partial<FeePayment> = {
      student_id: selectedStudent.id,
      fee_structure_id: selectedFeeType || undefined,
      amount: paymentAmount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: paymentMode,
      notes: notes
    };
    
    const result = await dbService.createFeePayment(payment);
    setIsProcessing(false);
    
    if (result.success) {
      showToast("Payment recorded successfully!");
      setSelectedStudent(null);
      setPaymentAmount(0);
      setSelectedFeeType(null);
      setSelectedDiscountId("");
    } else {
      showToast("Payment failed: " + (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)), 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {initialTab === 'collection' ? (
              <><CreditCard className="w-8 h-8 text-indigo-600" /> Fee Collection</>
            ) : (
              <><Settings className="w-8 h-8 text-indigo-600" /> Fee Management</>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
             {initialTab === 'collection' ? "Collect and record student fee payments." : "Configure school fee structures and schedules per class."}
          </p>
        </div>
      </div>

      {initialTab === 'structure' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in">
          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Configure Fee Structures</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg items-end">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Fee Name</label>
              <input placeholder="e.g. Tuition Fee" value={newFee.name} onChange={e => setNewFee({...newFee, name: e.target.value})} className="input-field" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Target Class</label>
              <select value={newFee.class_id} onChange={e => setNewFee({...newFee, class_id: e.target.value})} className="input-field">
                <option value="All Classes">All Classes</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount ({currencyCode})</label>
              <input type="number" placeholder="0.00" value={newFee.amount || ''} onChange={e => setNewFee({...newFee, amount: Number(e.target.value)})} className="input-field" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Frequency</label>
              <select value={newFee.frequency} onChange={e => setNewFee({...newFee, frequency: e.target.value})} className="input-field">
                <option>Monthly</option><option>Quarterly</option><option>Yearly</option><option>One-time</option>
              </select>
            </div>
            <button onClick={handleAddFee} className="bg-indigo-600 text-white rounded-lg py-2.5 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"><Plus className="w-4 h-4" /> Add Fee</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Fee Name</th>
                  <th className="px-4 py-3">Target Class</th>
                  <th className="px-4 py-3">Frequency</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {fees.map(fee => (
                  <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-4 py-4 font-medium text-gray-900 dark:text-white">{fee.name}</td>
                    <td className="px-4 py-4">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${fee.class_id === 'All Classes' || !fee.class_id ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800'}`}>
                         {fee.class_id || 'All Classes'}
                       </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300 text-sm">{fee.frequency}</td>
                    <td className="px-4 py-4 font-bold text-green-600 dark:text-green-400">{currencySymbol}{fee.amount.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => handleDeleteFee(fee.id!)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete Fee"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {fees.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <Settings className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No fee structures defined. Start by adding one above.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {initialTab === 'collection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
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
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {filteredStudents.map(student => (
                <div 
                  key={student.id} 
                  onClick={() => {
                      setSelectedStudent(student);
                      setPaymentAmount(0);
                      setSelectedFeeType(null);
                      setSelectedDiscountId("");
                  }}
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
              {filteredStudents.length === 0 && !loading && <p className="text-center text-gray-500 py-4 text-sm">No students found.</p>}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
            {selectedStudent ? (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 text-lg font-bold shadow-sm">
                       {selectedStudent.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedStudent.full_name}</h2>
                      <p className="text-gray-500 text-sm">Adm No: {selectedStudent.admission_no} • {selectedStudent.class_section}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">Active</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Fees</label>
                    <select 
                      className="input-field w-full"
                      value={selectedFeeType || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setSelectedFeeType(val);
                        calculateTotal(val, selectedDiscountId);
                      }}
                    >
                      <option value="">Select Fee Type</option>
                      {/* Only show fees applicable to this student's class or "All Classes" */}
                      {fees.filter(f => !f.class_id || f.class_id === 'All Classes' || f.class_id === selectedStudent.class_section).map(f => (
                        <option key={f.id} value={f.id}>{f.name} - {currencySymbol}{f.amount} ({f.frequency})</option>
                      ))}
                    </select>
                    {fees.filter(f => !f.class_id || f.class_id === 'All Classes' || f.class_id === selectedStudent.class_section).length === 0 && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1"><BookOpen className="w-3 h-3" /> No fees configured for {selectedStudent.class_section}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                       <Tag className="w-4 h-4 text-indigo-500" /> Apply Discount
                    </label>
                    <select 
                      className="input-field w-full"
                      value={selectedDiscountId}
                      onChange={(e) => {
                        setSelectedDiscountId(e.target.value);
                        calculateTotal(selectedFeeType, e.target.value);
                      }}
                    >
                      <option value="">No Discount</option>
                      {discounts.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.type === 'percentage' ? `${d.value}%` : `${currencySymbol}${d.value}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Date</label>
                    <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-field w-full" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Net Amount to Pay ({currencyCode})</label>
                    <div className="relative">
                      <div className="absolute left-3 top-3 h-4 w-4 text-gray-400 flex items-center justify-center font-bold text-xs">{currencySymbol}</div>
                      <input 
                        type="number" 
                        value={paymentAmount} 
                        onChange={e => setPaymentAmount(Number(e.target.value))}
                        className="input-field w-full pl-10 font-bold text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Mode</label>
                    <select 
                      value={paymentMode} 
                      onChange={(e) => setPaymentMode(e.target.value as any)} 
                      className="input-field w-full"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / Digital Wallet</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <button 
                    onClick={handleCollectFee} 
                    disabled={isProcessing || !paymentAmount}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Record Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <CreditCard className="w-20 h-20 mb-4 opacity-10" />
                <p className="font-medium">Select a student from the sidebar to record a fee payment</p>
                <p className="text-xs mt-2 text-gray-500">Only active students are listed for fee collection</p>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`.input-field { width: 100%; padding: 10px; border-radius: 0.5rem; border: 1px solid #e5e7eb; background: #fff; transition: all 0.2s; } .input-field:focus { border-color: #6366f1; ring: 2px solid rgba(99, 102, 241, 0.2); outline: none; } .dark .input-field { background: #374151; border-color: #4b5563; color: white; }`}</style>
    </div>
  );
};
