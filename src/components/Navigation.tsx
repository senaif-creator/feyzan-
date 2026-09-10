import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, MessageCircle, Brain, CheckSquare } from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingTasksCount?: number;
  memoryCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  pendingTasksCount = 0,
}) => {
  const tabs = [
    { id: 'today' as TabType, label: 'Bugün', icon: Sparkles },
    { id: 'assistant' as TabType, label: 'Asistan', icon: MessageCircle },
    { id: 'memory' as TabType, label: 'Zihin', icon: Brain },
    {
      id: 'tasks' as TabType,
      label: 'Görevler',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
  ];

  return (
    <nav
      id="main-navigation"
      aria-label="Ana Gezinme Çubuğu"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-sm pointer-events-auto"
    >
      <div className="flex items-center justify-between rounded-2xl border border-stone-200/80 bg-white/95 p-1 shadow-[0_8px_32px_rgba(28,25,23,0.08)] backdrop-blur-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-btn-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 transition-all cursor-pointer select-none min-h-[50px] ${
                isActive
                  ? 'text-stone-900 font-semibold'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute inset-0 rounded-xl bg-amber-50/90 border border-amber-200/60"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}

              <span className="relative z-10 flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    isActive ? 'text-amber-800 scale-105' : 'text-stone-400'
                  }`}
                />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white leading-none shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </span>

              <span
                className={`relative z-10 text-[11px] tracking-tight leading-tight ${
                  isActive ? 'text-stone-900 font-semibold' : 'text-stone-500 font-normal'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
