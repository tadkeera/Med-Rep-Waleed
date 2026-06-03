/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, User, Image as ImageIcon, Trash2, CheckCircle, Upload, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsViewProps {
  lang: 'ar' | 'en';
  onProfileChange?: () => void;
}

export default function SettingsView({ lang, onProfileChange }: SettingsViewProps) {
  const [repName, setRepName] = useState(() => localStorage.getItem('medrep_representative_name') || 'وليد فريد');
  const [repGrade, setRepGrade] = useState(() => localStorage.getItem('medrep_representative_grade') || 'مستشار SFA أول');
  const [logoBase64, setLogoBase64] = useState<string | null>(() => localStorage.getItem('corporate_logo'));
  
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Translations
  const t = {
    ar: {
      title: 'إعدادات المنظومة والملف الميداني',
      subtitle: 'تحكم ببيانات الهوية الميدانية وشعار الشركة المعتمد.',
      saveProfile: 'حفظ التعديلات للبروفايل',
      repField: 'اسم المندوب الميداني (Representative Name)',
      gradeField: 'مستوى فعالية الاستهداف / الرتبة (SFA Grade)',
      logoField: 'شعار الهيئة الطبية / الشركة (Corporate Logo)',
      logoHint: 'ارفع ملف PNG أو JPG ليتم ختمه تلقائيًا في التقارير المصدرة.',
      logoPreview: 'شكل الشعار الحالي المعتمد:',
      logoNone: 'لا يوجد شعار لوزاري مخصص حالياً (يتم استخدام الهوية الافتراضية للبرنامج).',
      uploadLogo: 'اختر ملف الشعار من جهازك',
      clearLogo: 'إزالة الشعار',
      errMinChar: 'خطأ! يجب أن يتكون اسم المندوب من 3 أحرف على الأقل لتفعيل الهوية الذاتية.',
      profileSaved: 'تم تحديث الملف الشخصي وتعميم الهوية حركيًا بنجاح!',
    },
    en: {
      title: 'System Settings & Representative Profile',
      subtitle: 'Manage field credentials and corporate logos offline.',
      saveProfile: 'Save Profile Changes',
      repField: 'Medical Representative Name',
      gradeField: 'SFA Level / Class',
      logoField: 'Corporate Logo Asset',
      logoHint: 'Upload a PNG or JPG logo to be stamped dynamically onto exported PDF/HTML summaries.',
      logoPreview: 'Active Corporate Logo Preview:',
      logoNone: 'No custom logo uploaded. System default identities will be used.',
      uploadLogo: 'Choose Image File',
      clearLogo: 'Remove Logo',
      errMinChar: 'Error! Representative name must be at least 3 characters long for verification.',
      profileSaved: 'Profile identity updated and dynamically propagated successfully!',
    }
  }[lang];

  // Profile save action
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(false);
    setProfileError(null);

    const trimmedName = repName.trim();
    if (trimmedName.length < 3) {
      setProfileError(t.errMinChar);
      return;
    }

    localStorage.setItem('medrep_representative_name', trimmedName);
    localStorage.setItem('medrep_representative_grade', repGrade.trim());
    
    setProfileSuccess(true);
    if (onProfileChange) {
      onProfileChange();
    }

    setTimeout(() => {
      setProfileSuccess(false);
    }, 3500);
  };

  // Corporate Logo file reader conversion
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        localStorage.setItem('corporate_logo', base64String);
        setLogoBase64(base64String);
        if (onProfileChange) onProfileChange();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    localStorage.removeItem('corporate_logo');
    setLogoBase64(null);
    if (onProfileChange) onProfileChange();
  };

  return (
    <div className="space-y-6 fade-in text-slate-800" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Title bar header */}
      <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
        <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{t.title}</h2>
          <p className="text-xs text-slate-500 font-medium">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Rep Profile Credentials and Class Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-50 pb-2.5">
              <User className="w-4 h-4 text-indigo-500" />
              {lang === 'ar' ? 'ملف تعريف المندوب (SFA Profile)' : 'Medical Representative Profile'}
            </h3>

            {profileError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded-xl font-bold">
                ⚠️ {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                {t.profileSaved}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">{t.repField}</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs outline-none font-semibold transition-all"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder="مثال: د. وليد فريد"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">{t.gradeField}</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs outline-none font-semibold transition-all"
                  value={repGrade}
                  onChange={(e) => setRepGrade(e.target.value)}
                  placeholder="مثال: مستشار أول SFA"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
              >
                {t.saveProfile}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Corporate Logo Upload Setup Container */}
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-50 pb-2.5">
            <ImageIcon className="w-4.5 h-4.5 text-emerald-500" />
            {t.logoField}
          </h3>

          <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
            {t.logoHint}
          </p>

          <div className="space-y-3.5">
            {logoBase64 ? (
              <div className="space-y-2.5">
                <div className="text-[10px] text-slate-400 font-bold uppercase">{t.logoPreview}</div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-center min-h-[100px] relative group overflow-hidden">
                  <img
                    referrerPolicy="no-referrer"
                    src={logoBase64}
                    alt="Corporate brand"
                    className="max-h-16 w-auto object-contain transition-transform group-hover:scale-105"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleClearLogo}
                  className="w-full py-2 bg-white border border-red-100 hover:bg-red-50 text-red-650 hover:text-red-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t.clearLogo}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400 font-medium italic select-none text-center">
                  {t.logoNone}
                </div>
                
                <label className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-white rounded-2xl transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] text-slate-500 font-bold">{t.uploadLogo}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Quick Informative Info Block */}
          <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 rounded-xl space-y-1 mt-4">
            <div className="text-[10px] text-indigo-700 font-bold flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'فائدة المعاينة المستقلة:' : 'Dynamic Rendering benefit:'}
            </div>
            <p className="text-[9px] text-indigo-600 leading-relaxed font-semibold">
              {lang === 'ar'
                ? 'يتم تعميم وحقن هذا الشعار مباشرة على ترويسة التقارير الصادرة من مجلد التحميلات لإعطاء الطابع الرسمي لأعمال المندوب.'
                : 'Stamped automatically on top margins of HTML report compilation outputs generated into the DOWNLOAD directory.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
