import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Users, Search, Filter, MapPin } from 'lucide-react';
import { getInitialState } from '../utils/db';

interface DoctorsDirectoryViewProps {
  lang: 'ar' | 'en';
}

export default function DoctorsDirectoryView({ lang }: DoctorsDirectoryViewProps) {
  const state = getInitialState();
  const doctors = state.doctors || [];
  const visits = state.visits || [];

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchName, setSearchName] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  // Simplification for month filter - combining with DateRange or explicit month selection.
  const [month, setMonth] = useState(''); // e.g., '2026-06'

  const t = {
    ar: {
      title: 'قائمة الأطباء',
      name: 'اسم الطبيب',
      searchName: 'البحث باسم الطبيب...',
      speciality: 'التخصص',
      class: 'الفئة (Class)',
      filterClass: 'تصفية حسب الفئة',
      month: 'الشهر',
      dateFrom: 'من تاريخ',
      dateTo: 'إلى تاريخ',
      requiredVisits: 'الزيارات المطلوبة شهرياً',
      completedVisits: 'الزيارات المنجزة',
      totalVisits: 'كلي الزيارات',
      location: 'الموقع الجغرافي',
      yes: 'متوفر',
      no: 'غير متوفر',
      selectAll: 'الكل',
      noResults: 'لا يوجد أطباء مطابقين لشروط البحث.',
    },
    en: {
      title: 'Doctors Directory',
      name: 'Doctor Name',
      searchName: 'Search by doctor name...',
      speciality: 'Speciality',
      class: 'Class',
      filterClass: 'Filter by Class',
      month: 'Month',
      dateFrom: 'Date From',
      dateTo: 'Date To',
      requiredVisits: 'Required Visits/Month',
      completedVisits: 'Completed Visits',
      totalVisits: 'Total Visits',
      location: 'GPS Location',
      yes: 'Available',
      no: 'Not Available',
      selectAll: 'All',
      noResults: 'No doctors found matching filters.',
    }
  }[lang];

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (filterClass !== 'ALL' && doc.classRating !== filterClass) return false;
      if (searchName && !doc.name.toLowerCase().includes(searchName.toLowerCase())) return false;
      return true;
    });
  }, [doctors, filterClass, searchName]);

  const getDocStats = (docName: string, docClass: string) => {
    const docVisits = visits.filter(v => v.clientType === 'Doctor' && v.doctorName?.trim() === docName.trim());
    
    let total = docVisits.length;
    let completedInMonth = 0;

    let targetVisits = docVisits;

    if (dateFrom && dateTo) {
      const start = new Date(dateFrom).getTime();
      const end = new Date(dateTo).getTime();
      targetVisits = docVisits.filter(v => {
        const t = new Date(v.visitDate).getTime();
        return t >= start && t <= end;
      });
      // Update total within this range if dates applied? 
      // The requirement says "Total visits for doctor" (probably global), and "Completed visits based on month filter"
    }

    if (month) {
      completedInMonth = docVisits.filter(v => v.visitDate.startsWith(month)).length;
    } else {
      // If no explicit month selected, maybe count current month
      const currentMonth = new Date().toISOString().substring(0, 7);
      completedInMonth = docVisits.filter(v => v.visitDate.startsWith(currentMonth)).length;
    }

    let required = 1;
    if (docClass === 'A') required = 4;
    else if (docClass === 'B') required = 3;

    return { total, completed: completedInMonth, required };
  };

  return (
    <div className="space-y-6 fade-in pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.title}</h2>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{t.name}</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder={t.searchName}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{t.filterClass}</label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none bg-white"
              >
                <option value="ALL">{t.selectAll}</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{t.month}</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1.5 flex flex-col md:flex-row lg:flex-col gap-2">
            <div className="w-full">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">{t.dateFrom}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-indigo-500 focus:ring-1 outline-none h-[42px]"
              />
            </div>
            <div className="w-full">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">{t.dateTo}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:border-indigo-500 focus:ring-1 outline-none h-[42px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredDoctors.length === 0 ? (
          <div className="p-10 text-center text-slate-500">{t.noResults}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3">{t.name}</th>
                  <th className="px-4 py-3 text-center">{t.class}</th>
                  <th className="px-4 py-3 text-center">{t.requiredVisits}</th>
                  <th className="px-4 py-3 text-center">{t.completedVisits}</th>
                  <th className="px-4 py-3 text-center">{t.totalVisits}</th>
                  <th className="px-4 py-3 text-center">{t.location}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDoctors.map((doc) => {
                  const stats = getDocStats(doc.name, doc.classRating);
                  const isComplete = stats.completed >= stats.required;
                  const hasLocation = doc.locationLatitude && doc.locationLongitude;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{doc.name}</div>
                        <div className="text-[11px] text-slate-500">{doc.speciality}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${
                          doc.classRating === 'A' ? 'bg-amber-100 text-amber-700' :
                          doc.classRating === 'B' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {doc.classRating}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">
                        {stats.required}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {stats.completed}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-600">
                        {stats.total}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasLocation ? (
                          <div className="flex items-center justify-center gap-1 text-emerald-600">
                            <MapPin className="w-4 h-4" />
                            <span className="text-xs font-bold">{t.yes}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{t.no}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
