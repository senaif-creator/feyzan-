import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { MemoryItem, MemoryCategory } from '../types';

interface MemoryBankViewProps {
  memories: MemoryItem[];
  onAddMemory: (memory: Omit<MemoryItem, 'id' | 'savedAt'>) => void;
  onUpdateMemory: (id: string, updated: Partial<MemoryItem>) => void;
  onDeleteMemory: (id: string) => void;
}

export const MemoryBankView: React.FC<MemoryBankViewProps> = ({
  memories,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
}) => {
  const [activeCategory, setActiveCategory] = useState<MemoryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Düzenleme durumu
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Yeni hafıza formu
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preferences');

  const categories: { id: MemoryCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Tümü' },
    { id: 'preferences', label: 'Tercihler' },
    { id: 'people', label: 'Kişiler' },
    { id: 'goals', label: 'Hedefler' },
    { id: 'notes', label: 'Notlar' },
  ];

  const filteredMemories = memories.filter((mem) => {
    const matchesCategory = activeCategory === 'all' || mem.category === activeCategory;
    const matchesSearch =
      mem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mem.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const startEditing = (mem: MemoryItem) => {
    setEditingId(mem.id);
    setEditTitle(mem.title);
    setEditContent(mem.content);
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim() && editContent.trim()) {
      onUpdateMemory(id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
    }
    setEditingId(null);
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    onAddMemory({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      source: 'Kullanıcı tarafından eklendi',
    });

    setNewTitle('');
    setNewContent('');
    setIsAddModalOpen(false);
  };

  const getCategoryBadgeClass = (category: MemoryCategory) => {
    switch (category) {
      case 'preferences':
        return 'bg-amber-50 text-amber-900 border-amber-200/60';
      case 'people':
        return 'bg-stone-100 text-stone-800 border-stone-200/80';
      case 'goals':
        return 'bg-orange-50 text-orange-900 border-orange-200/60';
      case 'notes':
        return 'bg-stone-50 text-stone-700 border-stone-200/80';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getCategoryLabel = (category: MemoryCategory) => {
    switch (category) {
      case 'preferences':
        return 'Tercih';
      case 'people':
        return 'Kişi';
      case 'goals':
        return 'Hedef';
      case 'notes':
        return 'Not';
    }
  };

  return (
    <div className="space-y-6 pb-28 pt-1">
      {/* 1. Başlık & Ekleme */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
            Zihin
          </h2>
          <p className="text-xs text-stone-500">
            Asistanının senin için aklında tuttuğu önemli detaylar
          </p>
        </div>

        <button
          id="memory-add-new-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Detay Ekle</span>
        </button>
      </motion.div>

      {/* Güven ve Şeffaflık Notu */}
      <div className="flex items-center gap-2 rounded-2xl border border-stone-200/70 bg-stone-50/60 px-3.5 py-2.5 text-xs text-stone-600">
        <Info className="h-4 w-4 text-stone-400 shrink-0" />
        <span>
          Bu hafıza tamamen sana özeldir; istediğin an düzeltebilir veya silebilirsin.
        </span>
      </div>

      {/* 2. Arama ve Filtreler */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            id="memory-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hafızada ara..."
            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`memory-filter-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Hafıza Kayıtları Listesi */}
      <div className="space-y-3">
        {filteredMemories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center bg-stone-50/40">
            <SlidersHorizontal className="mx-auto h-7 w-7 text-stone-300 mb-2" />
            <p className="text-sm font-medium text-stone-700">
              Kayıtlı bilgi bulunamadı
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Arama kriterini değiştirebilir veya asistanla sohbet ederek yeni şeyler ekleyebilirsin.
            </p>
          </div>
        ) : (
          filteredMemories.map((mem) => {
            const isEditing = editingId === mem.id;

            return (
              <motion.div
                key={mem.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_2px_8px_rgba(28,25,23,0.02)] transition-shadow"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-amber-600"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-stone-200 px-3.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50 cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        onClick={() => handleSaveEdit(mem.id)}
                        className="flex items-center gap-1 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-stone-800 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                        Kaydet
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getCategoryBadgeClass(
                            mem.category
                          )}`}
                        >
                          {getCategoryLabel(mem.category)}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {mem.savedAt}
                        </span>
                      </div>

                      {/* Mobil uyumlu butonlar */}
                      <div className="flex items-center gap-1">
                        <button
                          id={`memory-edit-btn-${mem.id}`}
                          onClick={() => startEditing(mem)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 active:text-stone-900 transition-colors cursor-pointer rounded-lg hover:bg-stone-50"
                          title="Düzenle"
                          aria-label="Düzenle"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`memory-delete-btn-${mem.id}`}
                          onClick={() => onDeleteMemory(mem.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 active:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                          title="Sil"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-stone-900 mb-1">
                      {mem.title}
                    </h4>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      {mem.content}
                    </p>

                    {mem.source && (
                      <p className="mt-2 text-[10px] text-stone-400">
                        Kaynak: {mem.source}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* 4. Yeni Hafıza Ekleme Modalı (Mobil Uyumlu) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-stone-900">
                  Yeni Bilgi Ekle
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNew} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-600"
                  >
                    <option value="preferences">Tercihler (Kahve, saatler, alışkanlıklar)</option>
                    <option value="people">Kişiler (Aile, arkadaşlar, iş ilişkileri)</option>
                    <option value="goals">Hedefler (Kişisel niyetler, okuma vb.)</option>
                    <option value="notes">Notlar (Genel bilgiler, tarihler)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Konu Başlığı
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Örn: Sabah Rutini"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Hatırlanacak Detay
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Asistanının senin hakkında aklında tutmasını istediğin bilgi..."
                    rows={3}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:border-amber-600"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 active:scale-95 transition-all cursor-pointer"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
