import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { CatalogItem } from '../App';

interface AnalysisViewProps {
  items: CatalogItem[];
}

export default function AnalysisView({ items }: AnalysisViewProps) {
  // Aggregate KPI Data
  const totalProducts = items.length;
  
  const activeSuppliers = useMemo(() => {
    return new Set(items.map(item => item.supplier).filter(Boolean)).size;
  }, [items]);

  const avgPrice = useMemo(() => {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => sum + (item.hargaPartai || 0), 0);
    return Math.round(total / items.length);
  }, [items]);

  const formattedAvgPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(avgPrice);

  // Chart 1: Products by Category Comparison
  const categoryData = useMemo(() => {
    const acc = items.filter(i => i.kategori === 'ACC').length;
    const woven = items.filter(i => i.kategori === 'WOVEN').length;
    const knitt = items.filter(i => i.kategori === 'KNITT').length;
    return [
      { name: 'ACC', count: acc },
      { name: 'WOVEN', count: woven },
      { name: 'KNITT', count: knitt },
    ];
  }, [items]);

  // Chart 2: Top 5 Suppliers by Volume
  const supplierData = useMemo(() => {
    const counts = items.reduce((acc, item) => {
       if (!item.supplier) return acc;
       acc[item.supplier] = (acc[item.supplier] || 0) + 1;
       return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([name, volume]) => ({ name, volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [items]);
  return (
    <div className="flex-1 flex flex-col gap-6 lg:gap-8 w-full max-w-full">
      {/* Header Area */}
      <div className="bg-surface rounded-[20px] p-6 lg:p-8 flex flex-col lg:flex-row justify-between lg:items-center gap-6 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)]">
        <div>
          <h1 className="font-headline text-3xl lg:text-4xl text-on-surface font-bold tracking-tight mb-2">DATA ANALYSIS</h1>
          <p className="font-body text-on-surface-variant text-sm lg:text-base">DATA ANALYSIS</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-surface border border-outline-variant text-on-surface px-4 py-2 rounded-lg font-semibold text-sm hover:bg-surface-variant transition-colors">Export Report</button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-transform">Update Data</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-surface p-6 rounded-[20px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)] flex flex-col">
          <span className="font-label text-xs uppercase tracking-widest text-outline mb-1">Total Product</span>
          <span className="font-headline text-3xl font-bold text-primary mb-2">{totalProducts}</span>
          <div className="flex items-center gap-1 mt-auto">
             <span className="material-symbols-outlined text-[14px] text-primary">inventory_2</span>
             <span className="text-xs font-medium text-on-surface-variant">Available Items</span>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-[20px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)] flex flex-col">
          <span className="font-label text-xs uppercase tracking-widest text-outline mb-1">Active Suppliers</span>
          <span className="font-headline text-3xl font-bold text-on-surface mb-2">{activeSuppliers}</span>
          <div className="flex items-center gap-1 mt-auto">
             <span className="material-symbols-outlined text-[14px] text-outline">local_shipping</span>
             <span className="text-xs font-medium text-on-surface-variant">Registered Partners</span>
          </div>
        </div>
        <div className="bg-surface p-6 rounded-[20px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)] flex flex-col">
          <span className="font-label text-xs uppercase tracking-widest text-outline mb-1">Avg Product Price</span>
          <span className="font-headline text-2xl font-bold text-[#166534] mb-2">{formattedAvgPrice}</span>
          <div className="flex items-center gap-1 mt-auto">
             <span className="material-symbols-outlined text-[14px] text-[#166534]">sell</span>
             <span className="text-xs font-semibold text-[#166534]">Overall Average</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Category Trend Chart */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-[20px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)]">
          <h3 className="font-headline text-lg font-bold text-on-surface mb-6">Product Distribution by Category</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Bar dataKey="count" name="Total Products" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier Breakdown Bar Chart */}
        <div className="bg-surface p-6 rounded-[20px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)]">
           <h3 className="font-headline text-lg font-bold text-on-surface mb-6">Top Supplier Allocation</h3>
           <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={supplierData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#1e293b' }} width={90} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 13 }}
                />
                <Bar dataKey="volume" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
           </div>
        </div>

      </div>
    </div>
  )
}
