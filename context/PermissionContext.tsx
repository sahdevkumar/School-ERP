
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { dbService } from '../services/supabase';
import { SystemPermissions, RolePermissions } from '../types';

interface PermissionContextType {
  role: string;
  permissions: RolePermissions | null;
  isLoading: boolean;
  can: (module: string, action: 'view' | 'edit' | 'delete') => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: ReactNode; role: string }> = ({ children, role }) => {
  const [allPermissions, setAllPermissions] = useState<SystemPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    setIsLoading(true);
    try {
      // Race condition with timeout to prevent hanging
      const dbPromise = dbService.getRolePermissions();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Permissions timeout')), 5000));
      
      const data = await Promise.race([dbPromise, timeoutPromise]);
      setAllPermissions(data as SystemPermissions);
    } catch (error) {
      console.error("Failed to load permissions (or timeout)", error);
      // Fallback defaults will be used by `can()` if allPermissions is null
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const can = (module: string, action: 'view' | 'edit' | 'delete'): boolean => {
    // Super Admin has full access to everything
    if (role === 'Super Admin') return true;

    // While loading or if fetch failed (null), use safe defaults
    // If it's the dashboard, we usually want to show it even if perms fail
    if (!allPermissions) {
        if (module === 'dashboard' && action === 'view') return true;
        return false; // Fail safe closed
    }

    if (!allPermissions[role]) {
      // Role not found in config, default to closed except dashboard
      if (module === 'dashboard' && action === 'view') return true;
      return false;
    }

    const modulePerms = allPermissions[role][module];
    if (!modulePerms) {
      // Module not explicitly defined in config
      return false;
    }

    return modulePerms[action] === true;
  };

  const permissions = allPermissions ? allPermissions[role] : null;

  return (
    <PermissionContext.Provider value={{ role, permissions, isLoading, can, refreshPermissions: fetchPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
