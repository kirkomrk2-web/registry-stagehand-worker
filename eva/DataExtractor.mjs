/**
 * 🔍 DATA EXTRACTOR
 * 
 * Извлича имена, интереси и друга информация от съобщения
 * Използва NLP техники и pattern matching
 */

export class DataExtractor {
  constructor() {
    // Bulgarian name patterns
    this.namePatterns = [
      // "Казвам се Иван Петров Георгиев"
      /(?:казвам се|аз съм|име ми е|съм)\s+([А-ЯA-Z][а-яa-z]+(?:\s+[А-ЯA-Z][а-яa-z]+){0,2})/i,
      
      // "Иван съм" / "Иван"
      /^([А-ЯA-Z][а-яa-z]+)(?:\s+съм|\s+е\s+името\s+ми)?$/,
      
      // "Моето име е Иван"
      /моето\s+име\s+е\s+([А-ЯA-Z][а-яa-z]+(?:\s+[А-ЯA-Z][а-яa-z]+){0,2})/i
    ];

    // Interest keywords
    this.interestKeywords = {
      спорт: ['футбол', 'баскетбол', 'фитнес', 'спорт', 'тичане', 'плуване'],
      технологии: ['програмиране', 'компютри', 'технологии', 'гейминг', 'игри'],
      изкуство: ['музика', 'рисуване', 'пеене', 'танци', 'фотография'],
      пътуване: ['пътуване', 'travel', 'почивка', 'море', 'планина'],
      готвене: ['готвене', 'кулинария', 'храна', 'рецепти'],
      четене: ['книги', 'четене', 'литература'],
      природа: ['природа', 'животни', 'градина', 'camping'],
      бизнес: ['бизнес', 'предприемачество', 'стартъп', 'инвестиции']
    };

    // Profession keywords
    this.professionKeywords = [
      'програмист', 'дизайнер', 'учител', 'инженер', 'лекар',
      'адвокат', 'архитект', 'мениджър', 'продавач', 'accountant',
      'developer', 'designer', 'manager', 'engineer'
    ];
  }

  /**
   * 🎯 Main extraction method
   */
  async extract(text) {
    return {
      names: this.extractNames(text),
      interests: this.extractInterests(text),
      profession: this.extractProfession(text),
      location: this.extractLocation(text)
    };
  }

  /**
   * 👤 Extract names (first, middle, last)
   */
  extractNames(text) {
    const names = [];

    for (const pattern of this.namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const nameParts = match[1].trim().split(/\s+/);
        
        // Filter out common words that aren't names
        const validNames = nameParts.filter(part => 
          part.length >= 2 && 
          /^[А-ЯA-Z][а-яa-z]+$/.test(part) &&
          !['Казвам', 'Името', 'Аз'].includes(part)
        );

        if (validNames.length > 0) {
          return validNames.slice(0, 3); // Max 3 names
        }
      }
    }

    // Try to extract from "Аз съм X Y Z" format
    const simpleMatch = text.match(/^([А-ЯA-Z][а-яa-z]+(?:\s+[А-ЯA-Z][а-яa-z]+){0,2})$/);
    if (simpleMatch) {
      const nameParts = simpleMatch[1].split(/\s+/);
      return nameParts.slice(0, 3);
    }

    return names;
  }

  /**
   * 🎨 Extract interests from text
   */
  extractInterests(text) {
    const lowerText = text.toLowerCase();
    const foundInterests = [];

    for (const [category, keywords] of Object.entries(this.interestKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          if (!foundInterests.includes(category)) {
            foundInterests.push(category);
          }
        }
      }
    }

    return foundInterests;
  }

  /**
   * 💼 Extract profession
   */
  extractProfession(text) {
    const lowerText = text.toLowerCase();

    for (const profession of this.professionKeywords) {
      if (lowerText.includes(profession)) {
        return profession;
      }
    }

    // Check for "работя като X" pattern
    const workPattern = /работя\s+като\s+([а-яa-z\s]+)/i;
    const match = text.match(workPattern);
    if (match && match[1]) {
      return match[1].trim();
    }

    return null;
  }

  /**
   * 📍 Extract location (city)
   */
  extractLocation(text) {
    const bulgarianCities = [
      'софия', 'пловдив', 'варна', 'бургас', 'русе', 
      'стара загора', 'плевен', 'сливен', 'добрич', 'перник'
    ];

    const lowerText = text.toLowerCase();

    for (const city of bulgarianCities) {
      if (lowerText.includes(city)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    // Check for "от X съм" pattern
    const locationPattern = /от\s+([А-ЯA-Z][а-яa-z\s]+)\s+съм/i;
    const match = text.match(locationPattern);
    if (match && match[1]) {
      return match[1].trim();
    }

    return null;
  }

  /**
   * 🔢 Extract age
   */
  extractAge(text) {
    // "На 25 години съм" / "25 години"
    const agePattern = /(?:на\s+)?(\d{2})(?:\s+години)?/i;
    const match = text.match(agePattern);
    
    if (match && match[1]) {
      const age = parseInt(match[1]);
      if (age >= 18 && age <= 99) {
        return age;
      }
    }

    return null;
  }

  /**
   * 🎯 Check if message contains full name (3 parts)
   */
  hasFullName(text) {
    const names = this.extractNames(text);
    return names.length >= 3;
  }

  /**
   * ✅ Validate Bulgarian name
   */
  isValidBulgarianName(name) {
    // Must start with capital letter
    if (!/^[А-ЯA-Z]/.test(name)) {
      return false;
    }

    // Must be 2+ characters
    if (name.length < 2) {
      return false;
    }

    // Must contain only Cyrillic or Latin letters
    if (!/^[А-Яа-яA-Za-z]+$/.test(name)) {
      return false;
    }

    // Filter out common non-name words
    const nonNames = [
      'Здрасти', 'Здравей', 'Привет', 'Благодаря', 
      'Мерси', 'Довиждане', 'Чао', 'Okay', 'Super'
    ];

    if (nonNames.includes(name)) {
      return false;
    }

    return true;
  }

  /**
   * 📊 Extract all structured data
   */
  extractStructured(text) {
    const names = this.extractNames(text);
    
    return {
      firstName: names[0] || null,
      middleName: names[1] || null,
      lastName: names[2] || null,
      interests: this.extractInterests(text),
      profession: this.extractProfession(text),
      location: this.extractLocation(text),
      age: this.extractAge(text),
      hasCompleteNames: names.length >= 3
    };
  }

  /**
   * 🧹 Clean and normalize name
   */
  normalizeName(name) {
    if (!name) return null;

    // Remove extra spaces
    name = name.trim();

    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    return name;
  }

  /**
   * 🔎 Detect if user is asking about Eva
   */
  isAskingAboutEva(text) {
    const lowerText = text.toLowerCase();
    const evaQuestions = [
      'как се казваш', 'кой си', 'коя си', 'твоето име',
      'на колко си', 'години', 'откъде си', 'where are you from'
    ];

    return evaQuestions.some(q => lowerText.includes(q));
  }

  /**
   * 💕 Detect flirting
   */
  isFlirting(text) {
    const lowerText = text.toLowerCase();
    const flirtKeywords = [
      'красива', 'секси', 'готина', 'харесвам', 'обичам',
      'среща', 'date', 'kiss', 'обожавам', 'прелестна'
    ];

    return flirtKeywords.some(k => lowerText.includes(k));
  }

  /**
   * ❓ Detect if user is asking a question
   */
  isQuestion(text) {
    return text.includes('?') || 
           /^(как|какво|кога|къде|защо|кой|коя|колко)/i.test(text);
  }

  /**
   * 😊 Count emojis in text
   */
  countEmojis(text) {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    const matches = text.match(emojiRegex);
    return matches ? matches.length : 0;
  }

  /**
   * 📏 Get message statistics
   */
  getMessageStats(text) {
    return {
      length: text.length,
      wordCount: text.split(/\s+/).length,
      hasEmoji: this.countEmojis(text) > 0,
      emojiCount: this.countEmojis(text),
      isQuestion: this.isQuestion(text),
      isFlirting: this.isFlirting(text),
      hasNames: this.extractNames(text).length > 0
    };
  }
}

export default DataExtractor;
