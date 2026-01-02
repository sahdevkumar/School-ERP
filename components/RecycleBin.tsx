
import * as React from 'react';
import { Trash2, RotateCcw, AlertTriangle, Loader2, Search } from 'lucide-react';
import { dbService } from '../services/supabase';
import { AdmissionEnquiry } from '../types';
import { useToast } from '../context/ToastContext';

export const RecycleBin: React.FC = () => {
  const [deletedItems, setDeletedItems] = React.useState<AdmissionEnquiry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { showToast } = useToast();

  const fetchDeletedItems = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getRecycleBinItems();
      setDeletedItems(data);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch deleted items", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDeletedItems();
  }, []);

  const handleRestore = async (id: number) => {
    const result = await dbService.restoreAdmissionEnquiry(id);
    if (result.success) {
      setDeletedItems(prev => prev.filter(item => item.id !== id));
      showToast("Item restored successfully!");
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to restore: " + errorMsg, 'error');
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (!window.confirm("WARNING: This action is permanent and cannot be undone. Are you sure you want to delete this record forever?")) {
      return;
    }

    const result = await dbService.permanentDeleteAdmissionEnquiry(id);
    if (result.success) {
      setDeletedItems(prev => prev.filter(item => item.id !== id));
      showToast("Item permanently deleted");
    } else {
      const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
      showToast("Failed to delete: " + errorMsg, 'error');
    }
  };

  const filteredItems = deletedItems.filter(item => 
    item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.class_applying_for.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-red-500" />
          Recycle Bin
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage deleted records. Restore them or permanently remove them.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search deleted items..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
        <button onClick={fetchDeletedItems} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <RotateCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 text-xs uppercase text-red-600 dark:text-red-400 font-semibold tracking-wider">
                <th className="px-6 py-4">Module / Type</th>
                <th className="px-6 py-4">Name / Details</th>
                <th className="px-6 py-4">Deleted Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-red-500" />
                    Loading deleted items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <Trash2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                      <p>Recycle Bin is empty</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        Admission Enquiry
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{item.full_name}</div>
                      <div className="text-xs text-gray-500">Class: {item.class_applying_for} | Phone: {item.mobile_no}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Deleted
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleRestore(item.id!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                        <button 
                          onClick={() => handlePermanentDelete(item.id!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
