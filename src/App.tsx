/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import AnalysisView from './components/AnalysisView';
import Papa from 'papaparse';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9]/g, '');
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

const fetchGoogleSheetCsv = async (url: string) => {
  const response = await fetch(url);
  const csvText = await response.text();
  return new Promise<any[]>((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
};

export const COLOR_CATALOG = [
  {
    category: 'Putih',
    colors: ['Putih Netral', 'Putih Bluish', 'Broken White']
  },
  {
    category: 'Muda',
    colors: [
       'Bubblegum Pink', 'Pastel Pink', 'Pink', 'Muted Pink', 'Baby Pink', 'Dusty Pink', 'Soft Peach', 'Woodrose', 'Peony Pink', 
       'Dusty Peach', 'Salem', 'Baby Yellow', 'Butter', 'Light Brown', 'Beige', 'Cream', 'Light Latte', 'Champagne', 
       'Safari', 'Seafoam Green', 'Tosca Muda', 'Hijau Mint', 'Harbor Green', 'Aqua Haze', 'Palladian Blue', 'Pastel Blue', 'Sky Blue', 
       'Biru Muda', 'Turkis Muda', 'Lavender', 'Lilac', 'Dusty Lilac', 'Light Grey', 'Abu Muda'
    ]
  },
  {
    category: 'Sedang',
    colors: [
       'Blush Red', 'Salmon Red', 'Terracotta', 'Rustic Orchid', 'Dusty Rose', 'Old Gold', 'Orange', 'Kuning Mas', 'Bright Orange', 'Mustard', 'Kuning Kenari', 
       'Kuning Lemon', 'Hijau Pucuk', 'Electric Lime', 'Honey', 'Dijon Yellow', 'Golden Lime', 'Almond Brown', 'Coklat Susu', 'Maple Brown', 'Khaki', 'Sage Green', 
       'Olive Green', 'Ash Green', 'Forest Green', 'Mineral Green', 'Mineral Blue', 'Cameo Blue', 'Ash Blue', 'Steel Blue', 'Dusty Blue', 'Smoke Blue', 'Denim Blue', 
       'Dark Lavender', 'Twilight Mauve', 'Dusty Violet', 'Vintage Violet', 'Pale Berry', 'Black Evo', 'Stone Grey', 'Abu Sedang'
    ]
  },
  {
    category: 'Tua',
    colors: [
       'Burgundy', 'Maroon', 'Merah Cabe', 'Fuchsia', 'Hijau Fuji', 'Hijau Botol', 'Tosca', 'Biru Tosca', 'Tosca Tua', 'Turkis', 'Turkis Tua', 'Deep Blue', 'Navy', 
       'Ungu Tua', 'Magenta', 'Abu Tua', 'Coklat Kopi', 'Hijau TNI', 'Orange Bata', 'Hitam Reaktif', 'Army Green', 'Hijau Botol Special', 'Cactus Green', 'Autumn Orange', 
       'Dark Mustard', 'Red Plum', 'Atlantic Sea', 'Stone Green', 'Royal Purple', 'Cinnamon', 'Toffee', 'Dark Olive', 'Ocean Blue', 'Light Navy', 'Pine Green', 'Jet Black Evo'
    ]
  },
  {
    category: 'Hitam & Special',
    colors: [
       'Smoke Black', 'Smoke Jet Black', 'Benhur Special', 'Hitam Sulfur', 'Jet Black'
    ]
  },
  {
    category: 'Misty',
    colors: [
       'Misty M71 Putih Bluish', 'Misty M71A Putih Bluish', 'Misty Sedang', 'Misty M71'
    ]
  }
];

export const TONE_MAPPING: Record<string, string[]> = {
   'Putih': COLOR_CATALOG[0].colors,
   'Muda': COLOR_CATALOG[1].colors,
   'Sedang': COLOR_CATALOG[2].colors,
   'Tua': COLOR_CATALOG[3].colors,
   'Hitam & Special': COLOR_CATALOG[4].colors,
   'Misty': COLOR_CATALOG[5].colors,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [currentView, setCurrentView] = useState<'Katalog' | 'Analysis'>('Katalog');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [warnaFilter, setWarnaFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProductDetails, setSelectedProductDetails] = useState<CatalogItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isZipperModalOpen, setIsZipperModalOpen] = useState(false);
  const [numPages, setNumPages] = useState<number>();
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [zipperNumPages, setZipperNumPages] = useState<number>();
  const [zipperPdfPageNumber, setZipperPdfPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  function onZipperDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setZipperNumPages(numPages);
  }

  const loadAllData = async () => {
    setIsLoading(true);
    let allData: CatalogItem[] = [];
    let idCounter = 1;
    
    try {
      const urls = [
        { cat: 'ACC', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=1479260351&single=true&output=csv' },
        { cat: 'WOVEN', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=0&single=true&output=csv' },
        { cat: 'KNITT', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=1345552825&single=true&output=csv' },
        { cat: 'ACC KNITT', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=852890249&single=true&output=csv' },
        { cat: 'FOB', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkO9AGppPx9X2tghR_JV3EOHwqnd5nWCF3lMjMWGsA7-gc48NxPJ22Ip9JqepaxYeWaZO087hIErP4/pub?gid=110465754&single=true&output=csv' },
      ];
      
      for (const info of urls) {
        const rows = await fetchGoogleSheetCsv(info.url);
        const parsedRows = rows.map(r => normalizeItem(r, info.cat, idCounter++));
        // Filter out rows that have no name
        const validRows = parsedRows.filter(r => r.namaBarang && r.namaBarang !== 'Unknown' && r.namaBarang.trim() !== '');
        allData = [...allData, ...validRows];
      }
      
      setItems(allData);
    } catch (e) {
      console.error("Failed to load catalog data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

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
    <div className="min-h-screen flex flex-col bg-surface text-on-background font-body antialiased">
      {/* Desktop Header */}
 <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-20 items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-outline-variant">

  {/* LEFT: LOGO */}
  <div className="flex items-center">
    <img 
      src="https://www.seragamparahita.com/wp-content/uploads/2018/05/WhatsApp-Image-2018-05-20-at-10.01.28-PM.png" 
      alt="Parahita Prima Sentosa Logo" 
      className="h-12 w-auto object-contain"
      referrerPolicy="no-referrer"
    />
  </div>

        {/* RIGHT: SEARCH */}
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
              onBlur={() => {
                if (!searchQuery) setIsDesktopSearchOpen(false);
              }}
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
      {/* LEFT: MENU */}
      <button onClick={() => setIsMobileMenuOpen(true)}>
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* CENTER: LOGO */}
      <img 
        src="https://www.seragamparahita.com/wp-content/uploads/2018/05/WhatsApp-Image-2018-05-20-at-10.01.28-PM.png"
        className="h-10"
        alt="Logo"
      />

      {/* RIGHT: SEARCH ICON */}
      <button onClick={() => setIsMobileSearchOpen(true)} className="text-primary p-1">
        <span className="material-symbols-outlined">search</span>
      </button>
    </>
  )}

</header>
      {/* MOBILE SIDEBAR (GLOBAL) */}
<div className={`fixed inset-0 z-[100] lg:hidden transition ${isMobileMenuOpen ? 'visible' : 'invisible'}`}>
  
  {/* Overlay */}
  <div 
    className={`absolute inset-0 bg-black/30 transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
    onClick={() => setIsMobileMenuOpen(false)}
  />

  {/* Drawer */}
  <div className={`absolute left-0 top-0 h-full w-72 bg-white shadow-xl transform transition-transform duration-300
    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

    <div className="flex items-center justify-between p-4 border-b">
      <h2 className="font-semibold">Menu</h2>
      <button onClick={() => setIsMobileMenuOpen(false)}>
        ✕
      </button>
    </div>

     {/* Isi Sidebar (copy dari desktop) */}
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-[0_10px_40px_rgba(37,99,235,0.08)] border border-white/60">
              <div className="flex items-center gap-2 mb-6">
                 <span className="material-symbols-outlined text-primary">list</span>
                 <h2 className="font-headline text-sm text-on-surface font-semibold tracking-widest uppercase">Menu Pricelist Bahan Baku</h2>
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

              <h3 className="font-label text-xs text-on-surface-variant font-semibold uppercase tracking-widest mt-8 mb-4">Katalog</h3>
              <button onClick={() => setIsCatalogModalOpen(true)} className="w-full text-center mt-2 font-body text-xs font-semibold text-primary hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors py-2 rounded-lg shadow-sm border border-blue-100 mb-2">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">menu_book</span>
                Lihat Katalog Warna
              </button>
              <button onClick={() => setIsZipperModalOpen(true)} className="w-full text-center font-body text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 transition-colors py-2 rounded-lg shadow-sm border border-purple-100">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">style</span>
                Lihat Katalog Aksesories
              </button>
         </div>
   </div>
</div>
  

      {/* Main Layout Area */}
      <main className="flex-grow pt-20 lg:pt-28 pb-24 lg:pb-16 px-4 lg:px-8 max-w-screen-2xl mx-auto w-full flex flex-col lg:flex-row gap-6 lg:gap-8 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_50%,#f1f5f9_100%)]">
        
        {currentView === 'Katalog' ? (
          <>
            {/* Sidebar Filter */}
            <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col gap-6">
           <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-[0_10px_40px_rgba(37,99,235,0.08)] border border-white/60">
              <div className="flex items-center gap-2 mb-6">
                 <span className="material-symbols-outlined text-primary">list</span>
                 <h2 className="font-headline text-sm text-on-surface font-semibold tracking-widest uppercase">Menu Pricelist Bahan Baku</h2>
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

              <h3 className="font-label text-xs text-on-surface-variant font-semibold uppercase tracking-widest mt-8 mb-4">Katalog</h3>
              <button onClick={() => setIsCatalogModalOpen(true)} className="w-full text-center mt-2 font-body text-xs font-semibold text-primary hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors py-2 rounded-lg shadow-sm border border-blue-100 mb-2">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">menu_book</span>
                Lihat Katalog Warna
              </button>
              <button onClick={() => setIsZipperModalOpen(true)} className="w-full text-center font-body text-xs font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 transition-colors py-2 rounded-lg shadow-sm border border-purple-100">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">style</span>
                Lihat Katalog Aksesories
              </button>
           </div>
           </aside>
        

        {/* Content Area */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-6">
           
           {/* Header Area: Desktop uses flex-row, mobile uses flex-col */}
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
              <div className="flex gap-2">
                 <button onClick={loadAllData} className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-body text-sm font-medium py-2 px-4 rounded-lg hover:bg-surface-variant transition-colors shadow-sm">
                    <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span> Refresh
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
                 <div className="flex items-center gap-2 bg-[#dcfce7] text-[#166534] px-3 py-1.5 rounded-full text-xs font-semibold">
                    <span className="material-symbols-outlined text-[14px]">sync</span>
                    <span>Sync Active</span>
                 </div>
              </div>
           </div>

           {/* Table View (Desktop & Mobile) */}
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
            <div className="flex flex-wrap justify-center gap-6 mb-6 md:mb-0">
               <a href="#" className="font-body text-sm tracking-wide uppercase font-medium text-outline hover:text-on-surface transition-colors">Support</a>
            </div>
            <div className="text-on-surface-variant font-body text-sm tracking-wide uppercase font-medium">
               © 2026 Parahita Prima Sentosa. Pricelist MADE BY PUTRI.
            </div>
         </div>
      </footer>

      {/* Product Details Modal */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-background/20 backdrop-blur-sm" onClick={() => setSelectedProductDetails(null)}>
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-outline-variant" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-headline text-lg font-bold text-on-surface tracking-tight">Detail Produk</h3>
              <button onClick={() => setSelectedProductDetails(null)} className="text-on-surface-variant hover:text-primary transition-colors p-1 bg-surface-container-low rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
                <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-0.5">Nama Barang</p>
                <p className="font-body text-sm font-semibold text-primary">{selectedProductDetails.namaBarang}</p>
              </div>
              <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
                <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-0.5">Supplier</p>
                <p className="font-body text-sm font-semibold text-on-surface">{selectedProductDetails.supplier}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
                  <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-0.5">Satuan</p>
                  <p className="font-body text-sm font-semibold text-on-surface">{selectedProductDetails.satuan || '-'}</p>
                </div>
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
                  <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-0.5">Isi Kemasan</p>
                  <p className="font-body text-sm font-semibold text-on-surface">{selectedProductDetails.isiKemasan || '-'}</p>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30">
                <p className="font-label text-[10px] uppercase tracking-widest text-outline mb-1.5">Keterangan</p>
                <p className="font-body text-sm text-on-surface min-h-[40px]">
                  {selectedProductDetails.keterangan || <span className="text-on-surface-variant italic font-normal text-xs">Tidak ada keterangan</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Modal */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCatalogModalOpen(false)}></div>
          <div className="relative bg-surface w-full max-w-5xl max-h-[95vh] flex flex-col rounded-[24px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-white/20">
            
            <div className="flex flex-shrink-0 items-center justify-between p-4 sm:p-6 border-b border-outline-variant/40 bg-surface-container-lowest rounded-t-[24px]">
              <div>
                <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">Katalog Warna</h3>
              </div>
              <button onClick={() => setIsCatalogModalOpen(false)} className="text-on-surface-variant hover:text-error transition-colors p-2 bg-surface-container hover:bg-error/10 rounded-full flex items-center justify-center">
                 <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-surface-container-lowest rounded-b-[24px]">
               <div className="w-full h-full min-h-[60vh] rounded-xl overflow-hidden border border-outline-variant/20 flex flex-col items-center bg-gray-100 relative">
                 <div className="absolute top-4 z-10 flex items-center gap-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md border border-gray-200">
                    <button 
                      disabled={pdfPageNumber <= 1}
                      onClick={() => setPdfPageNumber(prev => Math.max(prev - 1, 1))}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="font-body text-sm font-semibold">
                      Page {pdfPageNumber} of {numPages || '--'}
                    </span>
                    <button 
                      disabled={pdfPageNumber >= (numPages || 1)}
                      onClick={() => setPdfPageNumber(prev => Math.min(prev + 1, numPages || 1))}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                 </div>
                 
                 <div className="w-full flex justify-center py-16">
                   <Document
                     file="/katalog-warna.pdf"
                     onLoadSuccess={onDocumentLoadSuccess}
                     loading={
                       <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                         <span className="material-symbols-outlined animate-spin text-4xl mb-4 text-primary">progress_activity</span>
                         <p className="font-body text-sm">Memuat dokumen PDF...</p>
                       </div>
                     }
                     error={
                       <div className="flex flex-col items-center justify-center py-20 text-error">
                         <span className="material-symbols-outlined text-4xl mb-4">error</span>
                         <p className="font-body text-sm font-semibold">Gagal memuat PDF</p>
                         <p className="font-body text-xs text-on-surface-variant mt-2 text-center">Pastikan ukuran file mendukung dan tidak rusak.</p>
                       </div>
                     }
                   >
                     <Page 
                       pageNumber={pdfPageNumber} 
                       renderTextLayer={false}
                       renderAnnotationLayer={false}
                       className="shadow-md rounded-lg overflow-hidden" 
                       width={Math.min(window.innerWidth - 64, 800)}
                     />
                   </Document>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Zipper Catalog Modal */}
      {isZipperModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsZipperModalOpen(false)}></div>
          <div className="relative bg-surface w-full max-w-5xl max-h-[95vh] flex flex-col rounded-[24px] shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-white/20">
            
            <div className="flex flex-shrink-0 items-center justify-between p-4 sm:p-6 border-b border-outline-variant/40 bg-surface-container-lowest rounded-t-[24px]">
              <div>
                <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface">Katalog Aksesories</h3>
              </div>
              <button onClick={() => setIsZipperModalOpen(false)} className="text-on-surface-variant hover:text-error transition-colors p-2 bg-surface-container hover:bg-error/10 rounded-full flex items-center justify-center">
                 <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-surface-container-lowest rounded-b-[24px]">
               <div className="w-full h-full min-h-[60vh] rounded-xl overflow-hidden border border-outline-variant/20 flex flex-col items-center bg-gray-100 relative">
                 <div className="absolute top-4 z-10 flex items-center gap-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md border border-gray-200">
                    <button 
                      disabled={zipperPdfPageNumber <= 1}
                      onClick={() => setZipperPdfPageNumber(prev => Math.max(prev - 1, 1))}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="font-body text-sm font-semibold">
                      Page {zipperPdfPageNumber} of {zipperNumPages || '--'}
                    </span>
                    <button 
                      disabled={zipperPdfPageNumber >= (zipperNumPages || 1)}
                      onClick={() => setZipperPdfPageNumber(prev => Math.min(prev + 1, zipperNumPages || 1))}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                 </div>
                 
                 <div className="w-full flex justify-center py-16">
                   <Document
                     file="/kategori zipper.pdf"
                     onLoadSuccess={onZipperDocumentLoadSuccess}
                     loading={
                       <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                         <span className="material-symbols-outlined animate-spin text-4xl mb-4 text-purple-600">progress_activity</span>
                         <p className="font-body text-sm">Memuat dokumen PDF...</p>
                       </div>
                     }
                     error={
                       <div className="flex flex-col items-center justify-center py-20 text-error">
                         <span className="material-symbols-outlined text-4xl mb-4">error</span>
                         <p className="font-body text-sm font-semibold">Gagal memuat PDF</p>
                         <p className="font-body text-xs text-on-surface-variant mt-2 text-center">Pastikan ada file "kategori zipper.pdf" di folder public.</p>
                       </div>
                     }
                   >
                     <Page 
                       pageNumber={zipperPdfPageNumber} 
                       renderTextLayer={false}
                       renderAnnotationLayer={false}
                       className="shadow-md rounded-lg overflow-hidden" 
                       width={Math.min(window.innerWidth - 64, 800)}
                     />
                   </Document>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
