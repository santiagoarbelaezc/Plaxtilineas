import { Injectable } from '@angular/core';

export interface ModerationResult {
  allowed: boolean;
  reason?: 'profanity' | 'jailbreak' | 'injection';
  warningMessage?: string;
  level: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatModerationService {

  // Lista exhaustiva de palabras soeces / contenido inapropiado
  readonly BANNED_WORDS: string[] = [
    // Insultos colombianos
    'puto', 'puta', 'putos', 'putas', 'gonorrea', 'gonorreas',
    'pirobo', 'piroba', 'pirobos', 'pirobas',
    'hp', 'hijueputa', 'hijuepuerca', 'hijuemadre',
    'malparido', 'malparida', 'malparidos', 'malparidas',
    'marica', 'maricas', 'maricon', 'maricona', 'maricones',
    'pendejo', 'pendeja', 'pendejos', 'pendejas',
    'imbecil', 'idiota', 'idiotas',
    'bobo', 'boba', 'bobos', 'bobas',
    'estupido', 'estupida', 'estupidos', 'estupidas',
    'mierda', 'mierdas', 'mondá', 'mondas',
    'sapo', 'sapa', 'sapos', 'sapas',
    'perro', 'perra', 'perros', 'perras',
    'desgraciado', 'desgraciada',
    'guevon', 'güevon', 'güevona', 'huevon', 'huevona',
    'mamerto', 'mamerta', 'mojon', 'mojón',
    'culicagado', 'culicagada', 'cagada', 'cagado', 'cagon', 'cagón',
    'bruto', 'bruta', 'burro', 'burra', 'sopenco', 'sopenca',

    // Insultos generales
    'cabron', 'cabrona', 'cabronazo', 'cabrones',
    'cono', 'coño', 'coños',
    'joder', 'jodera', 'jodido', 'jodida',
    'polla', 'pollas', 'culo', 'culos',
    'gilipollas', 'subnormal', 'capullo', 'capullos',
    'mamon', 'mamona', 'mamones',
    'chingar', 'chingado', 'chingada', 'chingados',
    'pinche', 'pinches', 'putazo', 'putazos',
    'maldito', 'maldita', 'malditos', 'malditas',
    'bastardo', 'bastarda', 'bastardos', 'bastardas',
    'miserable', 'miserables', 'inutil', 'inútil',
    'tarado', 'tarada', 'retrasado', 'retrasada',
    'mongolico', 'mongólico', 'cretino', 'cretina',
    'zorra', 'zorras', 'ramera', 'rameras',
    'puta madre', 'hijo de puta', 'me cago', 'vete a la mierda', 'que te jodan',

    // Términos sexuales explícitos
    'sexo', 'sexos', 'porno', 'pornografia', 'pornografía',
    'xxx', 'xvideos', 'xnxx', 'pornhub',
    'ereccion', 'erección', 'eyaculacion', 'eyaculación',
    'masturbacion', 'masturbación', 'masturbar', 'masturbarse',
    'consolador', 'vibrador', 'dildo', 'orgasmo', 'orgasmos',
    'coito', 'coitos', 'follar', 'fornicacion', 'fornicar', 'copular',
    'pene', 'penes', 'vagina', 'vaginas', 'vulva',
    'teta', 'tetas', 'nalgas', 'nalga',
    'prostituta', 'prostitucion', 'prostitución', 'prepago',
    'desnuda', 'desnudo', 'desnudas', 'desnudos',
    'erotic', 'erotica', 'erótica', 'sexting', 'onlyfans',

    // Leet / Variantes
    'ptm', 'ptmr', 'wtf', 'fck', 'fuk', 'fuq',
    'pu7a', 'pv7a', 'h1jueputa', 'm13rda', 's3x0', 's3xo', 'p3nd3jo'
  ];

  // Patrones de Jailbreak / Prompt Injection
  private readonly JAILBREAK_PATTERNS = [
    /ignora\s+(tus|las|todas)\s+(instrucciones|reglas|ordenes)/i,
    /olvida\s+(tus|las|todas)\s+(instrucciones|reglas|ordenes)/i,
    /actua\s+como/i,
    /pretende\s+ser/i,
    /fing(?:e|ir)\s+que/i,
    /modo\s+desarrollador/i,
    /developer\s+mode/i,
    /modo\s+sin\s+restricciones/i,
    /\bDAN\b/,
    /system\s+prompt/i,
    /prompt\s+del\s+sistema/i
  ];

  private readonly TAG_PATTERNS = [
    /\[REDIRECT:/i,
    /\[EXTERNAL:/i,
    /\[PRODUCTO:/i,
    /\[PRINT_PDF\]/i,
    /\[RESUMEN\]/i
  ];

  /**
   * Normalizar texto para comparación limpia
   */
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[0@]/g, 'o')
      .replace(/[1!]/g, 'i')
      .replace(/[3]/g, 'e')
      .replace(/[4]/g, 'a')
      .replace(/[5]/g, 's')
      .replace(/[7]/g, 't')
      .replace(/\./g, '')
      .replace(/\*/g, '')
      .replace(/_/g, '');
  }

  /**
   * Evaluar si el texto contiene contenido inapropiado o intenta un jailbreak
   */
  evaluateContent(text: string): ModerationResult {
    const raw = text.trim();
    const normalized = this.normalizeText(raw);

    // 1. Inyección de etiquetas
    for (const pattern of this.TAG_PATTERNS) {
      if (pattern.test(raw)) {
        return {
          allowed: false,
          reason: 'injection',
          warningMessage: '🚫 El mensaje contiene etiquetas o formato reservado del sistema.',
          level: 2
        };
      }
    }

    // 2. Jailbreak
    for (const pattern of this.JAILBREAK_PATTERNS) {
      if (pattern.test(normalized)) {
        return {
          allowed: false,
          reason: 'jailbreak',
          warningMessage: '🔒 Solo puedo responder preguntas relacionadas con Plaxtilineas y sus productos.',
          level: 2
        };
      }
    }

    // 3. Palabras soeces
    for (const word of this.BANNED_WORDS) {
      const normWord = this.normalizeText(word);
      const regex = new RegExp(`(^|\\s|[^a-z])${normWord}($|\\s|[^a-z])`, 'i');
      if (regex.test(normalized) || normalized.includes(normWord)) {
        return {
          allowed: false,
          reason: 'profanity',
          warningMessage: '⚠️ Por favor mantén un lenguaje respetuoso. Estoy aquí para ayudarte. 😊',
          level: 1
        };
      }
    }

    return { allowed: true, level: 0 };
  }

  /**
   * Obtener mensaje de respuesta progresivo según nivel de infracción
   */
  getWarningForInfraction(infractionCount: number): { text: string; type: 'warning' | 'error'; blockSeconds: number } {
    if (infractionCount === 1) {
      return {
        text: '⚠️ Por favor mantén un lenguaje respetuoso. Estoy aquí para ayudarte con el servicio de Plaxtilineas. 😊',
        type: 'warning',
        blockSeconds: 0
      };
    } else if (infractionCount === 2) {
      return {
        text: '🚫 Este es un espacio profesional. Te pido que uses un lenguaje apropiado para continuar usando el asistente.',
        type: 'warning',
        blockSeconds: 0
      };
    } else {
      return {
        text: '🔒 Has excedido el límite de mensajes inapropiados. El chat estará bloqueado por 30 segundos.',
        type: 'error',
        blockSeconds: 30
      };
    }
  }
}
