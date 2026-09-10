import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Calendar,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TaskItem } from '../types';

interface TasksViewProps {
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  onDeleteTask: (id: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState<'Bugün' | 'Yarın' | 'Bu Hafta'>('Bugün');
  const [newTime, setNewTime] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showCompleted, setShowCompleted] = useState(false);

  // Görevleri Bugün ve Yaklaşan olarak gruplayalım
  const todayTasks = tasks.filter(
    (t) => !t.isCompleted && (t.dueDate === 'Bugün' || t.category === 'today')
  );

  const upcomingTasks = tasks.filter(
    (t) =>
      !t.isCompleted &&
      t.dueDate !== 'Bugün' &&
      t.category !== 'today'
  );

  const completedTasks = tasks.filter((t) => t.isCompleted);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      dueDate: newDueDate,
      time: newTime.trim() || undefined,
      category: newDueDate === 'Bugün' ? 'today' : 'upcoming',
      priority: newPriority,
      isCompleted: false,
      source: 'manual',
    });

    setNewTitle('');
    setNewTime('');
    setIsAddOpen(false);
  };

  const renderTaskItem = (task: TaskItem) => (
    <motion.div
      key={task.id}
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all min-h-[56px] ${
        task.isCompleted
          ? 'border-stone-200/50 bg-stone-50/50 opacity-60'
          : 'border-stone-200/80 bg-white shadow-[0_2px_8px_rgba(28,25,23,0.02)]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          id={`task-toggle-${task.id}`}
          onClick={() => onToggleTask(task.id)}
          className="p-1 -m-1 text-stone-400 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
          aria-label={task.isCompleted ? 'Tamamlanmadı yap' : 'Tamamla'}
        >
          {task.isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5 text-stone-300 group-hover:text-stone-500" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium leading-snug break-words ${
              task.isCompleted
                ? 'line-through text-stone-400'
                : 'text-stone-900'
            }`}
          >
            {task.title}
          </p>

          <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-stone-400" />
              {task.dueDate}
            </span>
            {task.time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-stone-400" />
                {task.time}
              </span>
            )}
            {task.priority === 'high' && !task.isCompleted && (
              <span className="rounded-md bg-amber-100/90 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900">
                Öncelikli
              </span>
            )}
            {task.source === 'assistant' && (
              <span className="text-[10px] text-stone-400 italic">
                (Asistanla eklendi)
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        id={`task-delete-${task.id}`}
        onClick={() => onDeleteTask(task.id)}
        className="p-2 text-stone-300 hover:text-rose-600 active:text-rose-600 transition-colors cursor-pointer rounded-lg shrink-0"
        title="Görevi Sil"
        aria-label="Görevi Sil"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </motion.div>
  );

  return (
    <div className="space-y-6 pb-28 pt-1">
      {/* Başlık ve Ekle Butonu */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
            Görevler
          </h2>
          <p className="text-xs text-stone-500">
            Bugünkü akışın ve yaklaşan planların
          </p>
        </div>

        <button
          id="tasks-add-btn"
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Yeni Görev</span>
        </button>
      </motion.div>

      {/* Yeni Görev Ekleme Kutusu */}
      <AnimatePresence>
        {isAddOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateTask}
            className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4 shadow-[0_4px_16px_rgba(28,25,23,0.03)] space-y-3"
          >
            <input
              id="new-task-title-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Yeni görev adı (Örn: Faturayı kontrol et, toplantı...)"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-amber-600"
              autoFocus
              required
            />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">Zaman:</span>
                {(['Bugün', 'Yarın', 'Bu Hafta'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setNewDueDate(d)}
                    className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      newDueDate === d
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="Saat (15:00)"
                  className="w-24 rounded-lg border border-stone-200 bg-stone-50/70 px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-600"
                />

                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="rounded-lg border border-stone-200 bg-stone-50/70 px-2 py-1.5 text-xs text-stone-700 focus:outline-none"
                >
                  <option value="low">Normal</option>
                  <option value="medium">Öncelikli</option>
                  <option value="high">Acil</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                id="new-task-submit-btn"
                type="submit"
                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 active:scale-95 transition-all cursor-pointer"
              >
                Görevi Ekle
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Bölüm 1: BUGÜN */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Bugün ({todayTasks.length})
          </h3>
        </div>

        {todayTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-5 text-center bg-stone-50/40">
            <p className="text-xs text-stone-500">
              Bugün için bekleyen bir görev yok.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => renderTaskItem(task))}
          </div>
        )}
      </div>

      {/* Bölüm 2: YAKLAŞAN */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Yaklaşan ({upcomingTasks.length})
          </h3>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-5 text-center bg-stone-50/40">
            <p className="text-xs text-stone-500">
              Yaklaşan başka bir plan görünmüyor.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map((task) => renderTaskItem(task))}
          </div>
        )}
      </div>

      {/* Bölüm 3: TAMAMLANANLAR (Açılır/Kapanır) */}
      {completedTasks.length > 0 && (
        <div className="pt-2 border-t border-stone-200/70">
          <button
            id="toggle-completed-tasks-btn"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors py-2 cursor-pointer"
          >
            <span>Tamamlananlar ({completedTasks.length})</span>
            {showCompleted ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <AnimatePresence>
            {showCompleted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2"
              >
                {completedTasks.map((task) => renderTaskItem(task))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
