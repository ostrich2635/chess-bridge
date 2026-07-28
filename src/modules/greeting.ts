import { loadSettings } from './storage';

export function initGreeting(): void {
  const greetingText = document.getElementById('greeting-text');
  if (!greetingText) return;

  const hour = new Date().getHours();
  const lang = navigator.language.split('-')[0].toLowerCase();
  
  let timeGreeting = '';
  
  if (hour < 12) {
    timeGreeting = 'morning';
  } else if (hour < 18) {
    timeGreeting = 'afternoon';
  } else {
    timeGreeting = 'evening';
  }

  // Localized Greetings Mapping
  const greetings: Record<string, { morning: string, afternoon: string, evening: string, default: string }> = {
    'en': { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', default: 'Hello' },
    'es': { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches', default: 'Hola' },
    'fr': { morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir', default: 'Salut' },
    'de': { morning: 'Guten Morgen', afternoon: 'Guten Tag', evening: 'Guten Abend', default: 'Hallo' },
    'hi': { morning: 'शुभ प्रभात', afternoon: 'नमस्कार', evening: 'शुभ संध्या', default: 'नमस्ते' },
    'ja': { morning: 'おはようございます', afternoon: 'こんにちは', evening: 'こんばんは', default: 'こんにちは' },
    'zh': { morning: '早上好', afternoon: '下午好', evening: '晚上好', default: '你好' },
    'ru': { morning: 'Доброе утро', afternoon: 'Добрый день', evening: 'Добрый вечер', default: 'Привет' },
    'it': { morning: 'Buongiorno', afternoon: 'Buon pomeriggio', evening: 'Buonasera', default: 'Ciao' },
    'pt': { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite', default: 'Olá' }
  };

  const localeGreetings = greetings[lang] || greetings['en'];
  let greeting = localeGreetings[timeGreeting as keyof typeof localeGreetings];

  const settings = loadSettings();
  if (settings.username) {
    greeting = `${greeting}, ${settings.username}`;
  }

  greetingText.textContent = greeting;
}
