/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import DashboardView from './components/DashboardView';
import InvoicesView from './components/InvoicesView';
import VisitsView from './components/VisitsView';
import VisitsLogView from './components/VisitsLogView';
import CyclePlanView from './components/CyclePlanView';
import ReportsView from './components/ReportsView';
import AiToolsView from './components/AiToolsView';
import FileManagerView from './components/FileManagerView';
import SettingsView from './components/SettingsView';

import { 
  Building, 
  Calendar, 
  Database, 
  FileText, 
  Sparkles, 
  Folder, 
  Grid2X2, 
  Globe, 
  User, 
  MapPin, 
  Activity, 
  NotebookTabs,
  Coins,
  Settings
} from 'lucide-react';

type SfaView = 'dashboard' | 'invoices' | 'visits' | 'visitslog' | 'cycleplan' | 'reports' | 'ai' | 'files' | 'settings';


export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [activeView, setActiveView] = useState<SfaView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [repName, setRepName] = useState(() => localStorage.getItem('medrep_representative_name') || 'وليد فريد');
  const [repGrade, setRepGrade] = useState(() => localStorage.getItem('medrep_representative_grade') || 'مستشار SFA أول');

  const reloadProfile = () => {
    setRepName(localStorage.getItem('medrep_representative_name') || 'وليد فريد');
    setRepGrade(localStorage.getItem('medrep_representative_grade') || 'مستشار SFA أول');
  };

  // Set document direction and font based on language choice dynamically
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    if (lang === 'ar') {
      document.body.style.fontFamily = '"Cairo", "Inter", sans-serif';
    } else {
      document.body.style.fontFamily = '"Inter", sans-serif';
    }
  }, [lang]);

  const t = {
    ar: {
      appName: 'ميد ريب (Med Rep)',
      appSub: 'إدارة الزيارات الطبية والمستودع',
      repName: `المندوب: ${repName}`,
      repClass: `المستوى: ${repGrade}`,
      langToggle: 'English',
      // Nav links
      dashboard: 'لوحة التحكم',
      invoices: 'المستودع والدفعات',
      visits: 'تسجيل زيارة جديدة',
      visitslog: 'سجل الزيارات',
      cycleplan: 'خطة السير الأسبوعية',
      reports: 'محرك التقارير',
      aiTools: 'الذكاء الرياضي والجغرافي',
      fileManager: 'المستندات والأمانية',
      settings: 'الإعدادات والبروفايل',
      offlineHint: 'تطبيق محلي كلياً (Offline Database)',
    },
    en: {
      appName: 'Med Rep SFA Pro',
      appSub: 'Medical CRM & FIFO Ledger',
      repName: `Representative: ${repName}`,
      repClass: `Grade: ${repGrade}`,
      langToggle: 'العربية',
      // Nav links
      dashboard: 'SFA Dashboard',
      invoices: 'Invoice Batches',
      visits: 'Log New Visit',
      visitslog: 'Visits Log',
      cycleplan: 'Weekly Cycle Plan',
      reports: 'Reporting Engine',
      aiTools: 'AI Spatial & Routing',
      fileManager: 'Local Database System',
      settings: 'Settings & Profile',
      offlineHint: 'Sandbox Offline Database active',
    },
  }[lang];


  return (
    <div className="min-h-screen bg-slate-50/40 font-sans flex flex-col antialiased transition-all duration-200">
      
      {/* Top Application Header (Unified for all screens) */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white border-b border-slate-100 shadow-xs px-4 py-3 flex justify-between items-center transition-all h-[60px]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg text-white font-black shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900">{t.appName}</h1>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">{t.appSub}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Main workspace view identifier */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium mr-4">
            <span className="text-slate-800 font-semibold uppercase tracking-wider">{activeView}</span>
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center justify-center transition-colors cursor-pointer w-11 h-11"
            title="Toggle Language"
          >
            <Globe className="w-5 h-5 text-slate-500" />
          </button>
          
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          
          <div className="flex flex-col text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800">{repName}</div>
            <div className="text-[10px] text-slate-400 font-medium">{repGrade}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-extrabold text-sm text-indigo-700">
            {repName.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main workspace container (padded for top header and bottom nav) */}
      <main className="flex-1 flex flex-col min-w-0 pt-[60px] pb-[80px]">
        {/* Content body wrapper */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 max-w-7xl w-full mx-auto">
          {activeView === 'dashboard' && <DashboardView lang={lang} />}
          {activeView === 'invoices' && <InvoicesView lang={lang} />}
          {activeView === 'visits' && <VisitsView lang={lang} />}
          {activeView === 'visitslog' && <VisitsLogView lang={lang} />}
          {activeView === 'cycleplan' && <CyclePlanView lang={lang} />}
          {activeView === 'reports' && <ReportsView lang={lang} />}
          {activeView === 'ai' && <AiToolsView lang={lang} />}
          {activeView === 'files' && <FileManagerView lang={lang} />}
          {activeView === 'settings' && <SettingsView lang={lang} onProfileChange={reloadProfile} />}
        </div>
      </main>

      {/* Touch-First Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-slate-900 border-t border-slate-800 pb-safe">
        <div className="flex items-center overflow-x-auto px-2 py-2 sm:justify-center sm:gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <BottomNavBtn icon={<Grid2X2 className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.dashboard} active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
          <BottomNavBtn icon={<Database className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.invoices} active={activeView === 'invoices'} onClick={() => setActiveView('invoices')} />
          <BottomNavBtn icon={<Calendar className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.visits} active={activeView === 'visits'} onClick={() => setActiveView('visits')} />
          <BottomNavBtn icon={<NotebookTabs className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.visitslog} active={activeView === 'visitslog'} onClick={() => setActiveView('visitslog')} />
          <BottomNavBtn icon={<Building className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.cycleplan} active={activeView === 'cycleplan'} onClick={() => setActiveView('cycleplan')} />
          <BottomNavBtn icon={<FileText className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.reports} active={activeView === 'reports'} onClick={() => setActiveView('reports')} />
          <BottomNavBtn icon={<Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.aiTools} active={activeView === 'ai'} onClick={() => setActiveView('ai')} />
          <BottomNavBtn icon={<Folder className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.fileManager} active={activeView === 'files'} onClick={() => setActiveView('files')} />
          <BottomNavBtn icon={<Settings className="w-5 h-5 sm:w-6 sm:h-6" />} label={t.settings} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
        </div>
      </nav>
    </div>
  );
}

interface BottomNavBtnProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function BottomNavBtn({ icon, label, active, onClick }: BottomNavBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 min-w-[72px] min-h-[56px] shrink-0 transition-colors rounded-xl ${
        active ? 'text-indigo-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
      }`}
    >
      <span className={`mb-1 transition-transform ${active ? 'scale-110' : 'scale-100'}`}>
        {icon}
      </span>
      <span className={`text-[10px] font-bold text-center leading-tight truncate w-full px-1 ${active ? 'opacity-100' : 'opacity-80'}`}>
        {label}
      </span>
    </button>
  );
}
