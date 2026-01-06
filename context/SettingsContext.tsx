
import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/supabase';

interface SettingsContextType {
  currencySymbol: string;
  currencyCode: string;
  schoolName: string;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [schoolName, setSchoolName] = useState('EduSphere');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const settings = await dbService.getSystemSettings();
      if (settings.currency_symbol) setCurrencySymbol(settings.currency_symbol);
      if (settings.currency) setCurrencyCode(settings.currency);
      if (settings.school_name) setSchoolName(settings.school_name);
    } catch (error) {
      console.error("Failed to load settings in context:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ currencySymbol, currencyCode, schoolName, refreshSettings: fetchSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
