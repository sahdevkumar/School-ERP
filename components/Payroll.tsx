import React, { useState, useEffect } from 'react';
import { Banknote, Search, Save, CheckCircle, Clock, Calendar, DollarSign, User, CreditCard, Briefcase, Loader2, ArrowRight, RefreshCw, Gift } from 'lucide-react';
import { dbService } from '../services/supabase';
import { Employee, EmployeeSalaryPayment, Discount } from '../types';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { formatDate } from '../utils/dateFormatter';

export const Payroll: React.FC = () => {
  const { currencySymbol } = useSettings();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bonuses, setBonuses] = useState<Discount[]>([]); // Bonus list
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  // Payment State
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [selectedBonusId, setSelectedBonusId] = useState<string>(""); // Selected Bonus
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMonth, setPaymentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('Bank Transfer');
  const [paymentNote, setPaymentNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // Corrected duplicate assignment syntax error to fix line 27 error
  const [paymentHistory, setPaymentHistory] = useState<EmployeeSalaryPayment[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      calculateTotalSalary(selectedEmployee.id, ""); // Reset bonus selection
      fetchPaymentHistory(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  const fetchInitialData = async () => {
    setLoading(true);
    const [empData, discountData] = await Promise.all([
        dbService.getEmployees(),
        dbService.getDiscounts()
    ]);
    setEmployees(empData);
    setBonuses(discountData.filter(d => d.category === 'employee'));
    setLoading(false);
  };

  const fetchPaymentHistory = async (empId: number) => {
    const history = await dbService.getEmployeePayments(empId);
    setPaymentHistory(history);
  };

  const calculateTotalSalary = (empId: number, bonusId: string) => {
    const emp = employees.find(e => e.id === empId);
    let amount = emp ? (emp.salary_amount || 0) : 0;
    
    // Reset or Set bonus
    setSelectedBonusId(bonusId);

    const bonus = bonuses.find(b => b.id?.toString() === bonusId);
    if (bonus) {
        if (bonus.type === 'percentage') {
            amount += (amount * bonus.value / 100);
        } else {
            amount += bonus.value;
        }
    }
    setPaymentAmount(Math.max(0, Math.round(amount)));
  };

  const handlePaySalary = async () => {
    if (!selectedEmployee) return;
    if (paymentAmount <= 0) {
      showToast("Amount must be greater than 0", 'error');
      return;
    }

    setIsProcessing(true);
    
    let note = paymentNote;
    if (selectedBonusId) {
        const b = bonuses.find(bon => bon.id?.toString() === selectedBonusId);
        if(b) note = note ? `${note} (Bonus: ${b.name})` : `Bonus: ${b.name}`;
    }

    const payment: Partial<EmployeeSalaryPayment> = {
      employee_id: selectedEmployee.id,
      amount_paid: paymentAmount,
      payment_date: paymentDate,
      payment_for_month: `${paymentMonth}-01`,
      payment_mode: paymentMode,
      notes: note,
      transaction_details: JSON.stringify({ note: paymentNote })
    };

    const result = await dbService.createSalaryPayment(payment);
    setIsProcessing(false);

    if (result.success) {
      showToast("Salary payment recorded successfully!");
      fetchPaymentHistory(selectedEmployee.id);
      setPaymentNote('');
      setSelectedBonusId("");
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Payment failed: " + errorMsg, 'error');
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Banknote className="w-8 h-8 text-indigo-600" /> Pay Salary
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Process and record employee salary payments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Employee Search List */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-[600px] flex flex-col">
          <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search Employee..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button onClick={fetchInitialData} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Refresh List">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {filteredEmployees.map(emp => (
              <div 
                key={emp.id} 
                onClick={() => setSelectedEmployee(emp)}
                className={`p-3 rounded-lg cursor-pointer border transition-colors flex items-center gap-3 ${selectedEmployee?.id === emp.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 font-bold text-sm">
                  {emp.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">{emp.full_name}</h4>
                  <p className="text-xs text-gray-500 truncate">{emp.subject}</p>
                </div>
                {emp.salary_amount ? (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">{currencySymbol}{emp.salary_amount}</span>
                ) : (
                  <span className="text-xs text-gray-400 italic">No Salary</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEmployee ? (
            <>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in">
                <div className="flex justify-between items-start mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                      {selectedEmployee.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedEmployee.full_name}</h2>
                      <p className="text-sm text-gray-500">{selectedEmployee.subject} • {selectedEmployee.department}</p>
                      <p className="text-sm text-indigo-600 font-medium mt-1">Base Salary: {currencySymbol}{selectedEmployee.salary_amount || 0}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedEmployee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedEmployee.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Salary Month</label>
                    <input type="month" value={paymentMonth} onChange={(e) => setPaymentMonth(e.target.value)} className="input-field w-full" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Date</label>
                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="input-field w-full" />
                  </div>
                  
                  {/* Bonus Selection */}
                  <div className="space-y-2 md:col-span-2">
                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                       <Gift className="w-4 h-4 text-pink-500" /> Apply Bonus
                     </label>
                     <select 
                       className="input-field w-full"
                       value={selectedBonusId}
                       onChange={(e) => calculateTotalSalary(selectedEmployee.id, e.target.value)}
                     >
                       <option value="">No Bonus</option>
                       {bonuses.map(b => (
                         <option key={b.id} value={b.id}>
                           {b.name} (+{b.type === 'percentage' ? `${b.value}%` : `${currencySymbol}${b.value}`})
                         </option>
                       ))}
                     </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Payable ({currencySymbol})</label>
                    <div className="relative">
                      <div className="absolute left-3 top-3 h-4 w-4 text-gray-400 flex items-center justify-center font-bold text-xs">{currencySymbol}</div>
                      <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} className="input-field w-full pl-10 font-bold text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Mode</label>
                    <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as any)} className="input-field w-full">
                      <option>Bank Transfer</option>
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Cheque</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes / Reference</label>
                    <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. Transaction ID or Cheque No" className="input-field w-full" />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handlePaySalary} 
                    disabled={isProcessing || !paymentAmount}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Pay Salary
                  </button>
                </div>
              </div>

              {/* History */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Payment History</h3>
                {paymentHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No payments recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-gray-500 bg-gray-50 dark:bg-gray-700/30">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">For Month</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Mode</th>
                          <th className="px-4 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {paymentHistory.map((pay, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3">{formatDate(pay.payment_date)}</td>
                            <td className="px-4 py-3">{pay.payment_for_month}</td>
                            <td className="px-4 py-3 font-semibold text-green-600">{currencySymbol}{pay.amount_paid}</td>
                            <td className="px-4 py-3">{pay.payment_mode}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">{pay.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-gray-400 h-full">
              <User className="w-16 h-16 mb-4 opacity-20" />
              <p>Select an employee to process salary.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`.input-field { width: 100%; padding: 10px; border-radius: 0.5rem; border: 1px solid #e5e7eb; background: #fff; } .dark .input-field { background: #374151; border-color: #4b5563; color: white; }`}</style>
    </div>
  );
};