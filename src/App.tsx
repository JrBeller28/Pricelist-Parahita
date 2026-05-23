/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

// === DUMMY COMPONENT UNTUK ANALYSIS VIEW ===
const AnalysisView = ({ items }: { items: CatalogItem[] }) => (
  <div className="flex-1 bg-surface rounded-[20px] p-8 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)] flex items-center justify-center">
    <div className="text-center">
      <span className="material-symbols-outlined text-6xl text-primary mb-4 opacity-50">analytics</span>
      <h2 className="text-2xl font-bold text-on-surface">Analysis View</h2>
      <p className="text-on-surface-variant mt-2">Menampilkan analisis untuk {items.length} produk.</p>
    </div>
  </div>
);
// ===========================================

export type CatalogItem = {
  id: number;
  kategori: string;
  namaBarang: string;
  detail?: string;
  supplier: string;
  satuan: string;
  isiKemasan?: string;
  keterangan?: string;
  hargaPartai: number;
  hargaPartaiSatuan: string;
  hargaEcer: number | null;
  hargaEcerSatuan: string | null;
  trending?: boolean;
  trendingValue?: string;
};

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-ID').format(amount);
};

function parsePrice(priceStr: string | number | undefined): number | null {
  if (priceStr === undefined || priceStr === null) return null;
  const cleaned = String(priceStr).replace(/[^0-9]/g, '');
  if (cleaned.length === 0) return null;
  return parseInt(cleaned, 10);
}

function normalizeItem(row: any, category: string, id: number): CatalogItem {
  const namaBarang = row['NAMA BARANG'] || row['Nama Barang'] || '';
  const satuan = row['SATUAN'] || row['Stuan'] || '';
  const hargaPartaiStr = row['HARGA PARTAI'] || row['Harga Partai (IDR)'] || '';
  const hargaEcerStr = row['HARGA ECER'] || row['Harga Ecer (IDR)'] || '';
  const supplierStr = row['SUPPLIER'] || row['Supplier'] || '';
  const isiKemasan = row['Isi Kemasan'] || row['ISI KEMASAN'] || row['ISI'] || '';
  const keterangan = row['KETERANGAN'] || row['Keterangan'] || '';
  
  return {
    id,
    kategori: category,
    namaBarang: String(namaBarang).trim(),
    supplier: String(supplierStr).trim(),
    satuan: String(satuan).trim(),
    isiKemasan: String(isiKemasan).trim(),
    keterangan: String(keterangan).trim(),
    hargaPartai: parsePrice(hargaPartaiStr) || 0,
    hargaPartaiSatuan: satuan ? `/${satuan.trim()}` : '',
    hargaEcer: parsePrice(hargaEcerStr),
    hargaEcerSatuan: satuan ? `/${satuan.trim()}` : null,
  };
}

// Custom CSV Parser to avoid external dependencies
function parseCSV(str: string) {
    const arr: string[][] = [];
    let quote = false;
    let row = 0, col = 0;
    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }
    return arr;
}

function csvToJson(csvString: string) {
    const lines = parseCSV(csvString);
    if (lines.length < 1) return [];
    const headers = lines[0];
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].length === 1 && lines[i][0] === '') continue; // skip empty
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = lines[i][j];
        }
        result.push(obj);
    }
    return result;
}

const fetchGoogleSheetCsv = async (url: string) => {
  const response = await fetch(url);
  const csvText = await response.text();
  return csvToJson(csvText);
};

export const COLOR_CATALOG = [{category: 'Putih', colors: ['Putih Netral', 'Putih Bluish']}]; 
export const TONE_MAPPING: Record<string, string[]> = {'Putih': COLOR_CATALOG[0].colors};

// ============================================================================
// KONFIGURASI API
// PASTE URL WEB APP GOOGLE APPS SCRIPT KAMU DI SINI:
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyX23W4MT1MbYwSZPcC0Bmy5LZMJK6qeImqfPsytX_2Akl5SzAqNv8mZbUQt5FjfZj3/exec"; 
// ============================================================================

export default function App() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [currentView, setCurrentView] = useState<'Katalog' | 'Analysis'>('Katalog');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [warnaFilter, setWarnaFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductDetails, setSelectedProductDetails] = useState<CatalogItem | null>(null);
  
  // UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isZipperModalOpen, setIsZipperModalOpen] = useState(false);

  // === CRUD STATE & CUSTOM ALERTS ===
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'update'>('create');
  const [formData, setFormData] = useState<Partial<CatalogItem>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, message: string, onConfirm: () => void } | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    let allData: CatalogItem[] = [];
    let idCounter = 1;
    
    try {
      const urls = [
        { cat: 'ACC', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=1404234046&single=true&output=csv' },
        { cat: 'WOVEN', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=0&single=true&output=csv' },
        { cat: 'KNITT', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=1345552825&single=true&output=csv' },
        { cat: 'ACC KNITT', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=852890249&single=true&output=csv' },
        { cat: 'FOB', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=110465754&single=true&output=csv' },
      ];
      
      for (const info of urls) {
        const rows = await fetchGoogleSheetCsv(info.url);
        const parsedRows = rows.map(r => normalizeItem(r, info.cat, idCounter++));
        const validRows = parsedRows.filter(r => r.namaBarang && r.namaBarang !== 'Unknown' && r.namaBarang.trim() !== '');
        allData = [...allData, ...validRows];
      }
      
      setItems(allData);
    } catch (e) {
      console.error("Failed to load catalog data", e);
      showToast("Gagal memuat data dari spreadsheet", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // === FUNGSI CRUD ===
  const openAddForm = () => {
    if (GAS_API_URL === "URL_WEB_APP_GAS_KAMU") {
        showToast("Mohon masukkan URL Web App GAS terlebih dahulu di kodenya.", "error");
        return;
    }
    setFormMode('create');
    setFormData({ kategori: activeTab === 'ALL' ? 'ACC' : activeTab });
    setIsFormModalOpen(true);
  };

  const openEditForm = (item: CatalogItem) => {
    if (GAS_API_URL === "URL_WEB_APP_GAS_KAMU") {
        showToast("Mohon masukkan URL Web App GAS terlebih dahulu di kodenya.", "error");
        return;
    }
    setFormMode('update');
    setFormData(item);
    setIsFormModalOpen(true);
    setSelectedProductDetails(null);
  };

  const executeDelete = async (item: CatalogItem) => {
    setIsSubmitting(true);
    try {
      const payload = {
        action: 'delete',
        kategori: item.kategori,
        namaBarang: item.namaBarang
      };

      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.status === 'success') {
        showToast(`Berhasil menghapus ${item.namaBarang}`, "success");
        setSelectedProductDetails(null);
        loadAllData(); // Refresh Data
      } else {
        showToast(`Gagal: ${result.message}`, "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan jaringan.", "error");
    } finally {
      setIsSubmitting(false);
      setConfirmDialog(null);
    }
  };

  const handleDeleteClick = (item: CatalogItem) => {
    setConfirmDialog({
      isOpen: true,
      message: `Apakah Anda yakin ingin menghapus barang "${item.namaBarang}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: () => executeDelete(item)
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        action: formMode,
        kategori: formData.kategori,
        oldNamaBarang: formMode === 'update' ? selectedProductDetails?.namaBarang || formData.namaBarang : undefined,
        namaBarang: formData.namaBarang,
        supplier: formData.supplier,
        satuan: formData.satuan,
        isiKemasan: formData.isiKemasan,
        keterangan: formData.keterangan,
        hargaPartai: formData.hargaPartai,
        hargaEcer: formData.hargaEcer
      };

      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.status === 'success') {
        showToast(`Data berhasil di${formMode === 'create' ? 'tambahkan' : 'perbarui'}!`, "success");
        setIsFormModalOpen(false);
        loadAllData();
      } else {
        showToast(`Gagal: ${result.message}`, "error");
      }
    } catch (error) {
      showToast("Gagal menghubungi server Google Apps Script.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Derived state for functional filters
  const filteredItems = items.filter(item => {
    if (activeTab !== 'ALL' && item.kategori !== activeTab) return false;
    if (supplierFilter !== 'ALL' && item.supplier !== supplierFilter) return false;
    
    if (warnaFilter !== 'ALL') {
       const mappedColors = TONE_MAPPING[warnaFilter] || [];
       if (mappedColors.length > 0) {
           const match = mappedColors.some(c => item.namaBarang.toLowerCase().includes(c.toLowerCase()));
           if (!match) return false;
       } else {
           if (!item.namaBarang.toLowerCase().includes(warnaFilter.toLowerCase())) return false;
       }
    }

    if (searchQuery) {
       const q = searchQuery.toLowerCase();
       return item.namaBarang.toLowerCase().includes(q) || item.supplier.toLowerCase().includes(q);
    }
    return true;
  });

  const uniqueSuppliers = ['ALL', ...Array.from(new Set(items.filter(item => activeTab === 'ALL' || item.kategori === activeTab).map(i => i.supplier).filter(Boolean)))];
  const filteredSuppliers = uniqueSuppliers.filter(s => s === 'ALL' || String(s).toLowerCase().includes(supplierSearchQuery.toLowerCase()));

  const ITEMS_PER_PAGE = 2500;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const setTabAndReset = (tab: string) => {
    setActiveTab(tab);
    setSupplierFilter('ALL');
    setWarnaFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-background font-body antialiased relative">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-xl shadow-xl border ${
            toastMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="material-symbols-outlined">
              {toastMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-semibold text-sm">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">warning</span>
              Konfirmasi Hapus
            </h3>
            <p className="text-gray-600 text-sm mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button 
                disabled={isSubmitting}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                disabled={isSubmitting}
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Header */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-20 items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center">
          <img 
            src="https://zahrabordir.com/wp-content/uploads/2020/08/WhatsApp-Image-2018-05-20-at-10.01.28-PM.png" 
            alt="Parahita Prima Sentosa Logo" 
            className="h-12 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex items-center">
          {isDesktopSearchOpen || searchQuery ? (
            <div className="relative flex items-center animate-in fade-in zoom-in-95 duration-200">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
              <input 
                autoFocus
                type="text" 
                value={searchQuery}
                onChange={e => { 
                  setSearchQuery(e.target.value); 
                  setCurrentPage(1); 
                }}
                placeholder="Cari barang..." 
                className="bg-surface text-on-surface border border-outline-variant/50 rounded-xl pl-9 pr-10 py-2 w-80 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none shadow-sm"
                onBlur={() => { if (!searchQuery) setIsDesktopSearchOpen(false); }}
              />
              <button 
                onMouseDown={(e) => {
                   e.preventDefault();
                   setSearchQuery(''); 
                   setIsDesktopSearchOpen(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface flex items-center justify-center p-1 rounded-full hover:bg-surface-variant"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setIsDesktopSearchOpen(true)} className="text-primary hover:bg-primary/10 rounded-full p-2 transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">search</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Header */}
      <header className="flex lg:hidden fixed top-0 left-0 right-0 z-50 h-16 items-center justify-between px-4 bg-white/80 backdrop-blur-md border-b">
        {isMobileSearchOpen ? (
          <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <button onClick={() => setIsMobileSearchOpen(false)} className="text-primary p-1">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="relative flex-grow">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
              <input 
                autoFocus
                type="text" 
                value={searchQuery}
                onChange={e => { 
                  setSearchQuery(e.target.value); 
                  setCurrentPage(1); 
                }}
                placeholder="Cari barang..." 
                className="w-full bg-surface text-on-surface border border-outline-variant/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setIsMobileMenuOpen(true)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <img 
              src="https://zahrabordir.com/wp-content/uploads/2020/08/WhatsApp-Image-2018-05-20-at-10.01.28-PM.png"
              className="h-10"
              alt="Logo"
            />
            <button onClick={() => setIsMobileSearchOpen(true)} className="text-primary p-1">
              <span className="material-symbols-outlined">search</span>
            </button>
          </>
        )}
      </header>

      {/* MOBILE SIDEBAR */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition ${isMobileMenuOpen ? 'visible' : 'invisible'}`}>
        <div 
          className={`absolute inset-0 bg-black/30 transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div className={`absolute left-0 top-0 h-full w-72 bg-white shadow-xl transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold">Menu</h2>
            <button onClick={() => setIsMobileMenuOpen(false)}>✕</button>
          </div>
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-[0_10px_40px_rgba(37,99,235,0.08)] border border-white/60">
                <div className="flex items-center gap-2 mb-6">
                   <span className="material-symbols-outlined text-primary">list</span>
                   <h2 className="font-headline text-sm text-on-surface font-semibold tracking-widest uppercase">Menu Pricelist</h2>
                </div>
                <div className="space-y-1 mb-8">
                   {['ALL', 'ACC', 'WOVEN', 'KNITT', 'ACC KNITT', 'FOB'].map(cat => (
                     <button 
                       key={cat} 
                       onClick={() => setTabAndReset(cat)}
                       className={`w-full text-left font-body text-sm py-3 px-4 rounded-lg transition-colors ${activeTab === cat ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-semibold shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300' : 'text-on-surface hover:bg-blue-50 hover:text-blue-700 font-medium'}`}>
                       {cat === 'ALL' ? 'Semua Kategori' : cat}
                     </button>
                   ))}
                </div>
                <h3 className="font-label text-xs text-on-surface-variant font-semibold uppercase tracking-widest mb-4">Filter Supplier</h3>
                <div className="relative mb-4">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                   <input type="text" value={supplierSearchQuery} onChange={e => setSupplierSearchQuery(e.target.value)} placeholder={`Cari di ${activeTab === 'ALL' ? 'Semua' : activeTab}...`} className="w-full bg-white border border-outline-variant/40 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-sm"/>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                   {filteredSuppliers.map((s, i) => (
                      <button 
                        key={s}
                        onClick={() => { setSupplierFilter(s); setCurrentPage(1); }}
                        className={`w-full text-left font-body text-sm py-2 px-3 rounded-md transition-colors ${supplierFilter === s ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-blue-50 hover:text-blue-700/30'}`}
                      >
                         {s === 'ALL' ? 'Semua Supplier' : s}
                      </button>
                   ))}
                </div>
           </div>
        </div>
      </div>

      {/* Main Layout Area */}
      <main className="flex-grow pt-20 lg:pt-28 pb-24 lg:pb-16 px-4 lg:px-8 max-w-screen-2xl mx-auto w-full flex flex-col lg:flex-row gap-6 lg:gap-8 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_50%,#f1f5f9_100%)]">
        
        {currentView === 'Katalog' ? (
          <>
            {/* Sidebar Filter Desktop */}
            <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col gap-6">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-[0_10px_40px_rgba(37,99,235,0.08)] border border-white/60">
                <div className="flex items-center gap-2 mb-6">
                   <span className="material-symbols-outlined text-primary">list</span>
                   <h2 className="font-headline text-sm text-on-surface font-semibold tracking-widest uppercase">Menu Pricelist</h2>
                </div>
                <div className="space-y-1 mb-8">
                   {['ALL', 'ACC', 'WOVEN', 'KNITT', 'ACC KNITT', 'FOB'].map(cat => (
                     <button 
                       key={cat} 
                       onClick={() => setTabAndReset(cat)}
                       className={`w-full text-left font-body text-sm py-3 px-4 rounded-lg transition-colors ${activeTab === cat ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-semibold shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300' : 'text-on-surface hover:bg-blue-50 hover:text-blue-700 font-medium'}`}>
                       {cat === 'ALL' ? 'Semua Kategori' : cat}
                     </button>
                   ))}
                </div>
                <h3 className="font-label text-xs text-on-surface-variant font-semibold uppercase tracking-widest mb-4">Filter Supplier</h3>
                <div className="relative mb-4">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                   <input type="text" value={supplierSearchQuery} onChange={e => setSupplierSearchQuery(e.target.value)} placeholder={`Cari di ${activeTab === 'ALL' ? 'Semua' : activeTab}...`} className="w-full bg-white border border-outline-variant/40 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-sm"/>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                   {filteredSuppliers.map((s, i) => (
                      <button 
                        key={s}
                        onClick={() => { setSupplierFilter(s); setCurrentPage(1); }}
                        className={`w-full text-left font-body text-sm py-2 px-3 rounded-md transition-colors ${supplierFilter === s ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-blue-50 hover:text-blue-700/30'}`}
                      >
                         {s === 'ALL' ? 'Semua Supplier' : s}
                      </button>
                   ))}
                </div>
              </div>
            </aside>
            
            {/* Content Area */}
            <div className="flex-1 flex flex-col gap-4 lg:gap-6">
               
               {/* Header Area Desktop */}
               <div className="hidden lg:flex bg-surface rounded-[20px] p-8 justify-between items-center gap-6 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)]">
                  <div>
                     <div className="flex items-center gap-3 mb-2">
                        <h1 className="font-headline text-4xl text-on-surface font-bold tracking-tight">Pricelist</h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#dcfce7] text-[#166534]">
                           <span className="w-2 h-2 rounded-full bg-[#166534]"></span> Sync Active
                        </span>
                     </div>
                     <p className="font-body text-on-surface-variant text-lg">Database Price Bahan Baku</p>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={loadAllData} className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body text-sm font-medium py-2 px-4 rounded-lg hover:bg-surface-variant transition-colors shadow-sm">
                        <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span> Refresh
                     </button>
                     <button onClick={openAddForm} className="flex items-center gap-2 bg-primary text-white font-body text-sm font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-[0_4px_14px_rgba(37,99,235,0.3)]">
                        <span className="material-symbols-outlined text-[18px]">add</span> Tambah Barang
                     </button>
                  </div>
               </div>

               {/* Mobile Header Area */}
               <div className="flex lg:hidden flex-col gap-4">
                  <div className="flex items-end justify-between">
                     <div>
                        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Pricelist</h1>
                        <p className="font-body text-sm text-on-surface-variant mt-1">Terupdate</p>
                     </div>
                     <div className="flex flex-col gap-2 items-end">
                        <div className="flex items-center gap-2 bg-[#dcfce7] text-[#166534] px-3 py-1.5 rounded-full text-xs font-semibold">
                           <span className="material-symbols-outlined text-[14px]">sync</span>
                           <span>Sync Active</span>
                        </div>
                        <button onClick={openAddForm} className="flex items-center gap-1 bg-primary text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm">
                           <span className="material-symbols-outlined text-[14px]">add</span> Tambah
                        </button>
                     </div>
                  </div>
               </div>

               {/* Table View */}
               <div className="block bg-surface rounded-[20px] overflow-hidden shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-[rgba(255,255,255,0.8)]">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                           <tr className="bg-surface-container-highest text-on-surface-variant border-b border-outline-variant">
                              <th className="font-label text-xs font-semibold uppercase tracking-[0.05em] py-4 px-6 w-16 text-center">No</th>
                              <th className="font-label text-xs font-semibold uppercase tracking-[0.05em] py-4 px-6">Nama Barang</th>
                              <th className="font-label text-xs font-semibold uppercase tracking-[0.05em] py-4 px-6">Supplier</th>
                              <th className="font-label text-xs font-semibold uppercase tracking-[0.05em] py-4 px-6 text-right">Harga Partai</th>
                              <th className="font-label text-xs font-semibold uppercase tracking-[0.05em] py-4 px-6 text-right">Harga Ecer</th>
                           </tr>
                        </thead>
                        <tbody className="font-body divide-y divide-surface-variant">
                           {isLoading ? (
                               <tr>
                                  <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                                     <div className="flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                        <span>Syncing directly from Google Sheets...</span>
                                     </div>
                                  </td>
                               </tr>
                           ) : paginatedItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-surface-container-low transition-colors group">
                                 <td className="py-4 px-6 text-center text-on-surface-variant text-sm font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                                 <td className="py-4 px-6">
                                    <div className="font-semibold text-on-surface text-sm uppercase">{item.namaBarang}</div>
                                 </td>
                                 <td className="py-4 px-6">
                                    <button onClick={() => setSelectedProductDetails(item)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-surface-container text-on-surface-variant border border-outline-variant/20 uppercase hover:bg-surface-variant hover:border-primary/30 transition-colors cursor-pointer text-left">
                                       {item.supplier}
                                       <span className="material-symbols-outlined text-[12px] opacity-70 ml-1">info</span>
                                    </button>
                                 </td>
                                 <td className="py-4 px-6 text-right">
                                    <div className="inline-block bg-surface-container px-3 py-1 rounded text-sm font-semibold text-on-surface">
                                       {formatMoney(item.hargaPartai)}
                                    </div>
                                 </td>
                                 <td className="py-4 px-6 text-right">
                                    {item.hargaEcer ? (
                                       <div className="inline-block bg-primary-fixed/30 px-3 py-1 rounded text-sm font-semibold text-primary">
                                          {formatMoney(item.hargaEcer)}
                                       </div>
                                    ) : (
                                       <div className="inline-block bg-surface px-3 py-1 rounded text-sm font-medium text-on-surface-variant border border-surface-variant">
                                          -
                                       </div>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  <div className="bg-surface border-t border-outline-variant px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                     <span className="font-body text-sm text-on-surface-variant">
                        Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredItems.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} Products
                     </span>
                     <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-md bg-surface text-on-surface-variant hover:text-primary disabled:opacity-50 transition-colors border border-outline-variant text-sm font-medium">Prev</button>
                        <div className="flex items-center gap-1 font-body text-sm">
                           <span className="px-3 py-1.5 rounded-md bg-primary text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] font-medium">{currentPage}</span>
                           <span className="text-on-surface-variant px-1">/</span>
                           <span className="px-3 py-1.5 text-on-surface-variant font-medium">{totalPages}</span>
                        </div>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-md bg-surface text-on-surface-variant hover:text-primary disabled:opacity-50 transition-colors border border-outline-variant text-sm font-medium">Next</button>
                     </div>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <AnalysisView items={items} />
        )}
      </main>

      {/* Desktop Footer */}
      <footer className="hidden lg:flex bg-surface w-full border-t border-outline-variant mt-auto">
         <div className="flex flex-col md:flex-row justify-between items-center py-12 px-8 w-full max-w-screen-2xl mx-auto">
            <div className="font-headline font-bold text-on-surface mb-6 md:mb-0 text-xl">
               Parahita Prima Sentosa
            </div>
            <div className="text-on-surface-variant font-body text-sm tracking-wide uppercase font-medium">
               © 2026 Parahita Prima Sentosa. Pricelist MADE BY PUTRI.
            </div>
         </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-outline-variant flex justify-around p-2 z-40 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setCurrentView('Katalog')}
          className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-all ${
            currentView === 'Katalog' ? 'text-primary bg-primary/10 font-bold scale-105' : 'text-on-surface-variant hover:bg-surface-variant font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          <span className="text-[10px] uppercase tracking-wider">Katalog</span>
        </button>
        <button
          onClick={() => setCurrentView('Analysis')}
          className={`flex flex-col items-center gap-1 w-full py-2 rounded-xl transition-all ${
            currentView === 'Analysis' ? 'text-primary bg-primary/10 font-bold scale-105' : 'text-on-surface-variant hover:bg-surface-variant font-medium'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">analytics</span>
          <span className="text-[10px] uppercase tracking-wider">Analysis</span>
        </button>
      </nav>

      {/* MODAL: Form Tambah/Edit (CRUD) */}
      {isFormModalOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsFormModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center bg-surface">
              <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                 <span className="material-symbols-outlined">
                   {formMode === 'create' ? 'add_circle' : 'edit_square'}
                 </span>
                 {formMode === 'create' ? 'Tambah Barang Baru' : 'Edit Barang'}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-500 hover:text-gray-800 p-1 bg-gray-100 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar bg-surface-container-lowest">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Barang *</label>
                  <input required type="text" name="namaBarang" value={formData.namaBarang || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none uppercase text-sm" placeholder="Contoh: KAIN KATUN JEPANG" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori (Sheet) *</label>
                  <select required name="kategori" value={formData.kategori || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none text-sm bg-white">
                    <option value="">Pilih Kategori...</option>
                    <option value="ACC">ACC</option>
                    <option value="WOVEN">WOVEN</option>
                    <option value="KNITT">KNITT</option>
                    <option value="ACC KNITT">ACC KNITT</option>
                    <option value="FOB">FOB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier</label>
                  <input type="text" name="supplier" value={formData.supplier || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none uppercase text-sm" placeholder="Nama Supplier" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Satuan</label>
                  <input type="text" name="satuan" value={formData.satuan || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none uppercase text-sm" placeholder="YARD / KG / ROLL" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Isi Kemasan</label>
                  <input type="text" name="isiKemasan" value={formData.isiKemasan || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none text-sm uppercase" placeholder="1 ROLL = 100 YARD" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Partai (Angka)</label>
                  <input type="number" name="hargaPartai" value={formData.hargaPartai || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="Contoh: 15000" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Ecer (Angka)</label>
                  <input type="number" name="hargaEcer" value={formData.hargaEcer || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="Contoh: 18000" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Keterangan Tambahan</label>
                  <textarea name="keterangan" value={formData.keterangan || ''} onChange={handleInputChange} rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="Informasi tambahan..." />
                </div>
              </div>
            </form>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-5 py-2.5 rounded-lg font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 transition-colors">
                Batal
              </button>
              <button disabled={isSubmitting} onClick={handleFormSubmit} className="px-6 py-2.5 rounded-lg font-semibold text-white bg-primary hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md">
                {isSubmitting ? (
                  <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Menyimpan...</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">save</span> Simpan Data</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Product Details */}
      {selectedProductDetails && (
        <div 
          className="fixed inset-0 z-[105] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedProductDetails(null)}
        >
          <div 
            className="bg-surface rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200" 
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedProductDetails(null)} 
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface bg-surface-container rounded-full p-1 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="flex items-center gap-3 mb-6">
               <span className="material-symbols-outlined text-3xl text-primary">inventory</span>
               <h3 className="text-xl font-headline font-bold text-on-surface">Detail Barang</h3>
            </div>

            <div className="space-y-4 font-body">
              <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
                 <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Nama Barang</p>
                 <p className="text-base font-bold text-on-surface uppercase">{selectedProductDetails.namaBarang}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Supplier</p>
                    <p className="text-sm font-medium text-on-surface">{selectedProductDetails.supplier}</p>
                 </div>
                 <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Kategori</p>
                    <p className="text-sm font-medium text-on-surface">{selectedProductDetails.kategori}</p>
                 </div>
                 <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Satuan</p>
                    <p className="text-sm font-medium text-on-surface">{selectedProductDetails.satuan || '-'}</p>
                 </div>
                 <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Isi Kemasan</p>
                    <p className="text-sm font-medium text-on-surface">{selectedProductDetails.isiKemasan || '-'}</p>
                 </div>
              </div>

              {selectedProductDetails.keterangan && (
                 <div className="bg-[#fffbeb] text-[#b45309] p-4 rounded-xl border border-[#fde68a]">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                       <span className="material-symbols-outlined text-[14px]">info</span> Keterangan Tambahan
                    </p>
                    <p className="text-sm font-medium">{selectedProductDetails.keterangan}</p>
                 </div>
              )}

              <div className="pt-4 mt-2 border-t border-outline-variant/30 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Harga Partai</span>
                  <span className="text-xl font-bold text-on-surface">Rp {formatMoney(selectedProductDetails.hargaPartai)}</span>
                  {selectedProductDetails.hargaPartaiSatuan && <span className="text-sm text-on-surface-variant"> {selectedProductDetails.hargaPartaiSatuan}</span>}
                </div>
                <div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Harga Ecer</span>
                  <span className="text-xl font-bold text-primary">
                    {selectedProductDetails.hargaEcer ? `Rp ${formatMoney(selectedProductDetails.hargaEcer)}` : '-'}
                  </span>
                  {selectedProductDetails.hargaEcerSatuan && <span className="text-sm text-primary/70"> {selectedProductDetails.hargaEcerSatuan}</span>}
                </div>
              </div>

              {/* TOmbol Edit & Hapus */}
              <div className="flex gap-3 pt-6 mt-4 border-t border-outline-variant/30">
                <button 
                  onClick={() => openEditForm(selectedProductDetails)}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 py-2.5 rounded-lg font-bold transition-colors">
                  <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                </button>
                <button 
                  onClick={() => handleDeleteClick(selectedProductDetails)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 py-2.5 rounded-lg font-bold transition-colors">
                  <span className="material-symbols-outlined text-[18px]">delete</span> Hapus
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: Katalog Warna (PDF) */}
      {isCatalogModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-6 animate-in fade-in duration-200" 
          onClick={() => setIsCatalogModalOpen(false)}
        >
           <div 
             className="bg-surface rounded-2xl w-full max-w-4xl h-[90vh] md:h-full overflow-hidden flex flex-col relative shadow-2xl" 
             onClick={e => e.stopPropagation()}
           >
              <div className="flex justify-between items-center bg-white p-4 border-b border-outline-variant/30 z-10 shadow-sm">
                 <h3 className="text-lg font-bold font-headline flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined">menu_book</span>
                    Katalog Warna
                 </h3>
                 <button onClick={() => setIsCatalogModalOpen(false)} className="text-on-surface-variant hover:bg-surface-variant p-2 rounded-full transition-colors flex items-center justify-center">
                   <span className="material-symbols-outlined">close</span>
                 </button>
              </div>

              <div className="flex-1 overflow-hidden bg-surface-container-highest flex justify-center items-center">
                 <iframe src="/katalog-warna.pdf" className="w-full h-full border-0" title="Katalog Warna"></iframe>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: Katalog Aksesoris (PDF) */}
      {isZipperModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-6 animate-in fade-in duration-200" 
          onClick={() => setIsZipperModalOpen(false)}
        >
           <div 
             className="bg-surface rounded-2xl w-full max-w-4xl h-[90vh] md:h-full overflow-hidden flex flex-col relative shadow-2xl" 
             onClick={e => e.stopPropagation()}
           >
              <div className="flex justify-between items-center bg-white p-4 border-b border-outline-variant/30 z-10 shadow-sm">
                 <h3 className="text-lg font-bold font-headline flex items-center gap-2 text-purple-700">
                    <span className="material-symbols-outlined">style</span>
                    Katalog Aksesoris & Zipper
                 </h3>
                 <button onClick={() => setIsZipperModalOpen(false)} className="text-on-surface-variant hover:bg-surface-variant p-2 rounded-full transition-colors flex items-center justify-center">
                   <span className="material-symbols-outlined">close</span>
                 </button>
              </div>

              <div className="flex-1 overflow-hidden bg-surface-container-highest flex justify-center items-center">
                 <iframe src="/katalog-aksesoris.pdf" className="w-full h-full border-0" title="Katalog Aksesoris"></iframe>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
