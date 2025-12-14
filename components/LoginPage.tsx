
import React, { useState, useEffect } from 'react';
import { 
  School, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Send,
  Wifi,
  WifiOff
} from 'lucide-react';
import { dbService } from '../services/supabase';
import { useToast } from '../context/ToastContext';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  const { showToast } = useToast();

  useEffect(() => {
    const checkConnection = async () => {
      const connected = await dbService.checkConnection();
      setDbStatus(connected ? 'connected' : 'disconnected');
    };
    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(false);
    setIsLoading(true);

    if (isLogin) {
      // Handle Login
      const result = await dbService.login(email, password);
      if (result.error) {
        if (result.error.toLowerCase().includes("email not confirmed")) {
          setError("Email not confirmed. Please check your inbox or resend the confirmation link.");
          setNeedsConfirmation(true);
        } else {
          setError(result.error);
        }
        showToast("Login failed", 'error');
      } else {
        showToast("Welcome back!");
        onLoginSuccess();
      }
    } else {
      // Handle Signup
      if (!fullName.trim()) {
        setError("Full Name is required for registration.");
        setIsLoading(false);
        return;
      }
      
      const result = await dbService.register(email, password, fullName);
      if (result.error) {
        setError(result.error);
        showToast("Registration failed", 'error');
      } else {
        // Success case for signup
        showToast("Registration successful! Please check your email to confirm account.");
        setIsLogin(true); // Switch to login view
        setError("Please check your email inbox to confirm your account before logging in.");
        setNeedsConfirmation(true);
      }
    }
    
    setIsLoading(false);
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      showToast("Please enter your email address first.", 'info');
      return;
    }
    setIsLoading(true);
    const result = await dbService.resendConfirmationEmail(email);
    setIsLoading(false);
    
    if (result.success) {
      showToast("Confirmation email resent!", 'success');
      setError("A new confirmation link has been sent to your email.");
    } else {
      showToast("Failed to resend: " + result.error, 'error');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setNeedsConfirmation(false);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="p-8 text-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-lg">
            <School className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">EduSphere Admin</h1>
          <p className="text-indigo-100 text-sm mt-1">School Management System</p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isLogin 
                ? 'Enter your credentials to access the dashboard' 
                : 'Sign up to manage your school efficiently'}
            </p>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-lg flex flex-col gap-2 ${needsConfirmation ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${needsConfirmation ? 'text-amber-500' : 'text-red-500'}`} />
                <p className={`text-sm ${needsConfirmation ? 'text-amber-700 dark:text-amber-200' : 'text-red-600 dark:text-red-400'}`}>{error}</p>
              </div>
              
              {needsConfirmation && (
                <button 
                  type="button" 
                  onClick={handleResendConfirmation}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline self-end flex items-center gap-1 mt-1"
                >
                  <Send className="w-3 h-3" /> Resend Confirmation Email
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="admin@school.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={toggleMode}
                className="ml-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-center">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
               dbStatus === 'checking' ? 'bg-gray-100 text-gray-500 border-gray-200' :
               dbStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
               'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
             }`}>
               {dbStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
               {dbStatus === 'connected' && <Wifi className="w-3 h-3" />}
               {dbStatus === 'disconnected' && <WifiOff className="w-3 h-3" />}
               <span>
                 {dbStatus === 'checking' ? 'Checking Database...' : 
                  dbStatus === 'connected' ? 'System Online' : 'Database Disconnected'}
               </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
