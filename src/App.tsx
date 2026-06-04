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
    <div className="min-h-screen bg-slate-50/40 font-sans flex flex-col md:flex-row antialiased transition-all duration-200">
      
      {/* Sidebar for desktop sizes */}
      <aside className="w-64 bg-slate-900 text-slate-100 hidden md:flex flex-col shrink-0 border-l border-slate-800 border-r border-slate-800">
        {/* Brand label */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">{t.appName}</h1>
            <p className="text-[10px] text-slate-400 font-medium">{t.appSub}</p>
          </div>
        </div>

        {/* Rep Profile widget */}
        <div className="p-4 mx-4 my-3 bg-slate-850/50 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <User className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-[11px] font-bold text-slate-200 truncate">{t.repName}</div>
            <div className="text-[9px] text-slate-500 font-medium truncate">{t.repClass}</div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <SidebarLink
            icon={<Grid2X2 className="w-4 h-4" />}
            label={t.dashboard}
            active={activeView === 'dashboard'}
            onClick={() => setActiveView('dashboard')}
          />
          <SidebarLink
            icon={<Database className="w-4 h-4" />}
            label={t.invoices}
            active={activeView === 'invoices'}
            onClick={() => setActiveView('invoices')}
          />
          <SidebarLink
            icon={<Calendar className="w-4 h-4" />}
            label={t.visits}
            active={activeView === 'visits'}
            onClick={() => setActiveView('visits')}
          />
          <SidebarLink
            icon={<NotebookTabs className="w-4 h-4" />}
            label={t.visitslog}
            active={activeView === 'visitslog'}
            onClick={() => setActiveView('visitslog')}
          />
          <SidebarLink
            icon={<Building className="w-4 h-4" />}
            label={t.cycleplan}
            active={activeView === 'cycleplan'}
            onClick={() => setActiveView('cycleplan')}
          />
          <SidebarLink
            icon={<FileText className="w-4 h-4" />}
            label={t.reports}
            active={activeView === 'reports'}
            onClick={() => setActiveView('reports')}
          />
          <SidebarLink
            icon={<Sparkles className="w-4 h-4 font-semibold text-indigo-400" />}
            label={t.aiTools}
            active={activeView === 'ai'}
            onClick={() => setActiveView('ai')}
          />
          <SidebarLink
            icon={<Folder className="w-4 h-4" />}
            label={t.fileManager}
            active={activeView === 'files'}
            onClick={() => setActiveView('files')}
          />
          <SidebarLink
            icon={<Settings className="w-4 h-4 font-semibold" />}
            label={t.settings}
            active={activeView === 'settings'}
            onClick={() => setActiveView('settings')}
          />
        </nav>

        {/* Bottom utility sandbox indicators */}
        <div className="p-4 border-t border-slate-850/60 bg-slate-950/20 text-[9px] text-slate-500 flex flex-col gap-2 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <span>{t.offlineHint}</span>
          </div>
          <p className="text-right">Med Rep Engine v1.0.0</p>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3.5 flex justify-between items-center shrink-0 shadow-sm border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600 rounded-lg text-white font-black">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight">{t.appName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language toggle mobile */}
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="p-1.5 bg-slate-800 rounded-lg text-xs font-bold text-slate-300 transition-colors"
          >
            {t.langToggle}
          </button>

          {/* Hamburger menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-slate-800 rounded-lg text-slate-200"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Mobile Dropdown drawer navigation menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 flex flex-col p-4 space-y-1.5 z-40 relative">
          <MobileNavLink
            icon={<Grid2X2 className="w-4 h-4" />}
            label={t.dashboard}
            active={activeView === 'dashboard'}
            onClick={() => {
              setActiveView('dashboard');
              setMobileMenuOpen(false);
            }}
          />
          <MobileNavLink
            icon={<Database className="w-4 h-4" />}
            label={t.invoices}
            active={activeView === 'invoices'}
            onClick={() => {
              setActiveView('invoices');
              setMobileMenuOpen(false);
            }}
          />
          <MobileNavLink
            icon={<Calendar className="w-4 h-4" />}
            label={t.visits}
            active={activeView === 'visits'}
            onClick={() => {
              setActiveView('visits');
              setMobileMenuOpen(false);
            }}
          />
          <MobileNavLink
            icon={<NotebookTabs className="w-4 h-4" />}
            label={t.visitslog}
            active={activeView === 'visitslog'}
            onClick={() => {
              setActiveView('visitslog');
              setMobileMenuOpen(false);
            }}
          />
          <MobileNavLink
            icon={<Building className="w-4 h-4" />}
            label={t.cycleplan}
            active={activeView === 'cycleplan'}
            onClick={() => {
              setActiveView('cycleplan');
              setMobileMenuOpen(false);
            }}
          />
          <MobileNavLink
            icon={<FileText className="w-4 h-4" />}
            label={t.reports}
            active={activeView === 'reports'}
            onClick={() => {
              setActiveView('reports');
              setMobileMenuOpen(false);
            }}
          />
          <MobileNavLink
            icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
            label={t.aiTools}
            active={activeView === 'ai'}
            onClick={() => {
              setActiveView('ai');
              setMobileMenuOpen(false);
            }}
          />
          <MobileNavLink
            icon={<Folder className="w-4 h-4" />}
            label={t.fileManager}
            active={activeView === 'files'}
            onClick={() => {
              setActiveView('files');
              setMobileMenuOpen(false);
            }}
          />
          <MobileNavLink
            icon={<Settings className="w-4 h-4" />}
            label={t.settings}
            active={activeView === 'settings'}
            onClick={() => {
              setActiveView('settings');
              setMobileMenuOpen(false);
            }}
          />
        </div>
      )}

      {/* Main workspace container */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Desktop control bar */}
        <header className="hidden md:flex justify-between items-center px-8 py-4 bg-white border-b border-slate-100 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>{t.appName}</span>
            <span>/</span>
            <span className="text-slate-800 font-semibold uppercase tracking-wider">{activeView}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Lang switcher on desktop */}
            <button
              type="button"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="p-1.5 px-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              {t.langToggle}
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            
            {/* Account identifier */}
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">{repName}</div>
                <div className="text-[10px] text-slate-400 font-medium">{repGrade}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-extrabold text-xs text-slate-700">
                {repName.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content body wrapper */}
        <div className="p-4 md:p-8 overflow-y-auto flex-1 max-w-7xl w-full mx-auto">
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
    </div>
  );
}

// Subordinate Sidebar navigation layout link
interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SidebarLink({ icon, label, active, onClick }: SidebarLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-all border text-right cursor-pointer ${
        active 
          ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' 
          : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-850/50 hover:text-slate-200'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
    </button>
  );
}

function MobileNavLink({ icon, label, active, onClick }: SidebarLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg border text-right ${
        active 
          ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400' 
          : 'bg-transparent border-transparent text-slate-400'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
    </button>
  );
}
