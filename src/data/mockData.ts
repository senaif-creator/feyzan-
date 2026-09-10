import { MemoryItem, TaskItem, ChatMessage } from '../types';

export const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    category: 'preferences',
    title: 'Kahve Tercihi',
    content: 'Sabahları şekersiz filtre kahve içmeyi tercih ediyor.',
    savedAt: '2 gün önce',
    source: 'Doğal sohbetten hatırlandı',
  },
  {
    id: 'mem-2',
    category: 'people',
    title: 'Ayşe (Kardeş)',
    content: 'Kız kardeşi. Genellikle pazar günleri öğleden sonra telefonlaşıyorlar.',
    savedAt: '1 hafta önce',
    source: 'Doğal sohbetten hatırlandı',
  },
  {
    id: 'mem-3',
    category: 'preferences',
    title: 'Çalışma Saatleri',
    content: 'Önemli toplantılarını ve odaklanma gerektiren işleri sabah 10:00 - 12:00 arasına koymak istiyor.',
    savedAt: 'Dün',
    source: 'Doğal sohbetten hatırlandı',
  },
  {
    id: 'mem-4',
    category: 'goals',
    title: 'Kitap Okuma Hedefi',
    content: 'Her gün yatmadan önce en az 20 sayfa kitap okuma hedefi var.',
    savedAt: 'Geçen hafta',
    source: 'Hedef belirleme sohbeti',
  },
  {
    id: 'mem-5',
    category: 'notes',
    title: 'Ev İnternet Sağlayıcısı',
    content: 'Ev internet taahhüdü Kasım ayında yenilenecek.',
    savedAt: '3 gün önce',
    source: 'Hatırlatıcı isteği',
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Market alışverişi (kahve çekirdeği ve meyve)',
    dueDate: 'Bugün',
    time: '18:00',
    category: 'today',
    priority: 'medium',
    isCompleted: false,
    source: 'manual',
  },
  {
    id: 'task-2',
    title: 'Ayşe ile haftalık görüşme',
    dueDate: 'Bugün',
    time: '19:30',
    category: 'today',
    priority: 'high',
    isCompleted: false,
    source: 'assistant',
  },
  {
    id: 'task-3',
    title: 'Tasarım inceleme toplantısı',
    dueDate: 'Yarın',
    time: '10:30',
    category: 'upcoming',
    priority: 'high',
    isCompleted: false,
    source: 'manual',
  },
  {
    id: 'task-4',
    title: 'Ev internet faturası ödemesi',
    dueDate: '12 Eylül',
    category: 'upcoming',
    priority: 'low',
    isCompleted: false,
    source: 'assistant',
  },
  {
    id: 'task-5',
    title: 'Sabah 15 dk yürüyüşü',
    dueDate: 'Bugün',
    time: '08:30',
    category: 'today',
    priority: 'low',
    isCompleted: true,
    source: 'manual',
  }
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'assistant',
    text: 'Selam! Bugünün planları ve hatırlamak istediğin detaylar için buradayım. Konuşmak veya not düşmek istediğin bir şey var mı?',
    timestamp: '09:00',
  }
];

export const QUICK_PROMPTS = [
  'Yarın annemi aramam lazım',
  'Bugün ne yapmam gerekiyor?',
  'Sabahları erken uyanmak istiyorum',
  'Önemli bir not kaydet',
];
