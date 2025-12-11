import {
  LucideIcon,
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  School,
  Phone,
  Trash2,
  LayoutTemplate,
  Globe,
  Shield,
  Clock,
  Database,
  Smartphone,
  Fingerprint,
  BookOpen,
  Layers,
  Layout,
  Monitor,
  PanelLeft,
  Circle,
  HelpCircle,
  Menu
} from 'lucide-react';

export const iconMap: { [key: string]: LucideIcon } = {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  FileText,
  Settings,
  LogOut,
  School,
  Phone,
  Trash2,
  LayoutTemplate,
  Globe,
  Shield,
  Clock,
  Database,
  Smartphone,
  Fingerprint,
  BookOpen,
  Layers,
  Layout,
  Monitor,
  PanelLeft,
  Circle,
  Menu,
};

export const iconList = Object.keys(iconMap).sort();

export const getIcon = (name?: string): LucideIcon => {
  if (name && iconMap[name]) {
    return iconMap[name];
  }
  return HelpCircle; // A sensible default icon
};