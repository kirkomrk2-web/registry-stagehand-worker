/**
 * 📊 BEHAVIOR ANALYZER
 * 
 * Анализира sentiment, engagement и поведение на потребителите
 * Помага на Eva да разбере емоционалното състояние и да отговори адекватно
 */

export class BehaviorAnalyzer {
  constructor() {
    // Positive sentiment words
    this.positiveWords = [
      'супер', 'страхотно', 'готино', 'яко', 'добре', 'чудесно',
      'благодаря', 'мерси', 'харесвам', 'обичам', 'перфектно',
      'amazing', 'great', 'awesome', 'good', 'nice', 'thanks',
      'хаха', 'смях', 'весело', 'интересно', 'cool'
    ];

    // Negative sentiment words
    this.negativeWords = [
      'лошо', 'зле', 'скучно', 'тъпо', 'глупаво', 'ужасно',
      'мразя', 'досадно', 'не харесвам', 'bad', 'boring', 'hate',
      'stupid', 'дразни', 'нервира', 'отвратително'
    ];

    // Enthusiasm indicators
    this.enthusiasmIndicators = [
      '!', '😄', '😊', '🎉', '✨', '🔥', '💪', '👍',
      'хаха', 'хахаха', 'lol', 'lmao'
    ];

    // Question patterns (engagement indicator)
    this.questionPatterns = [
      /\?$/,
      /^(как|какво|кога|къде|защо|кой|коя|колко)/i
    ];
  }

  /**
   * 🎯 Main sentiment analysis
   */
  async analyzeSentiment(text) {
    const lowerText = text.toLowerCase();
    
    // Count positive and negative words
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of this.positiveWords) {
      if (lowerText.includes(word)) {
        positiveCount++;
      }
    }

    for (const word of this.negativeWords) {
      if (lowerText.includes(word)) {
        negativeCount++;
      }
    }

    // Calculate enthusiasm
    const enthusiasmScore = this.calculateEnthusiasm(text);

    // Determine overall sentiment
    let score = 0;
    let label = 'neutral';

    if (positiveCount > negativeCount) {
      score = Math.min(0.8, 0.3 + (positiveCount - negativeCount) * 0.2 + enthusiasmScore);
      label = score > 0.6 ? 'very_positive' : 'positive';
    } else if (negativeCount > positiveCount) {
      score = Math.max(-0.8, -0.3 - (negativeCount - positiveCount) * 0.2);
      label = score < -0.6 ? 'very_negative' : 'negative';
    } else {
      // Check enthusiasm for neutral messages
      if (enthusiasmScore > 0.3) {
        score = enthusiasmScore;
        label = 'positive';
      }
    }

    return {
      score: score, // -1.0 to 1.0
      label: label,
      positiveWords: positiveCount,
      negativeWords: negativeCount,
      enthusiasmScore: enthusiasmScore
    };
  }

  /**
   * 🔥 Calculate enthusiasm level
   */
  calculateEnthusiasm(text) {
    let score = 0;

    for (const indicator of this.enthusiasmIndicators) {
      const count = (text.match(new RegExp(indicator, 'g')) || []).length;
      score += count * 0.1;
    }

    // Multiple exclamation marks
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 1) {
      score += 0.2;
    }

    // ALL CAPS (enthusiasm or anger)
    if (text === text.toUpperCase() && text.length > 3) {
      score += 0.15;
    }

    return Math.min(score, 0.5);
  }

  /**
   * 💬 Calculate engagement score (0-100)
   */
  calculateEngagement(userProfile, recentMessages = []) {
    let score = 0;

    // Message frequency (max 30 points)
    const messageCount = userProfile.total_messages || 0;
    score += Math.min(30, messageCount * 2);

    // Message length (max 20 points)
    const avgLength = recentMessages.reduce((sum, msg) => 
      sum + msg.message_text.length, 0) / (recentMessages.length || 1);
    
    if (avgLength > 50) score += 20;
    else if (avgLength > 20) score += 10;
    
    // Question asking (max 15 points)
    const questionsAsked = recentMessages.filter(msg => 
      msg.message_direction === 'incoming' && this.isQuestion(msg.message_text)
    ).length;
    score += Math.min(15, questionsAsked * 5);

    // Emoji usage (max 10 points)
    const emojiUsage = recentMessages.filter(msg =>
      /[\u{1F300}-\u{1F9FF}]/u.test(msg.message_text)
    ).length;
    score += Math.min(10, emojiUsage * 2);

    // Response time (max 15 points)
    // If responds quickly, that's good engagement
    score += 15; // Default assumption of good response time

    // Sentiment (max 10 points)
    if (userProfile.sentiment_score > 0.5) {
      score += 10;
    } else if (userProfile.sentiment_score > 0) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * ❓ Check if message is a question
   */
  isQuestion(text) {
    if (text.includes('?')) {
      return true;
    }

    for (const pattern of this.questionPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 🎭 Detect conversation mood
   */
  detectMood(recentMessages) {
    if (recentMessages.length === 0) {
      return 'neutral';
    }

    const sentiments = recentMessages.map(msg => 
      this.analyzeSentiment(msg.message_text)
    );

    const avgScore = sentiments.reduce((sum, s) => 
      sum + s.score, 0) / sentiments.length;

    if (avgScore > 0.4) return 'very_positive';
    if (avgScore > 0.1) return 'positive';
    if (avgScore < -0.4) return 'very_negative';
    if (avgScore < -0.1) return 'negative';
    
    return 'neutral';
  }

  /**
   * 🔮 Predict user readiness for KYC
   */
  predictKYCReadiness(userProfile, analytics) {
    let readinessScore = 0;

    // Has all 3 names (40 points)
    if (userProfile.first_name && userProfile.middle_name && userProfile.last_name) {
      readinessScore += 40;
    } else if (userProfile.first_name) {
      readinessScore += 10;
    }

    // Positive sentiment (20 points)
    if (userProfile.sentiment_score > 0.5) {
      readinessScore += 20;
    } else if (userProfile.sentiment_score > 0.2) {
      readinessScore += 10;
    }

    // Message count (20 points)
    const messageCount = userProfile.total_messages || 0;
    if (messageCount >= 15) {
      readinessScore += 20;
    } else if (messageCount >= 10) {
      readinessScore += 15;
    } else if (messageCount >= 5) {
      readinessScore += 10;
    }

    // Engagement score (20 points)
    if (analytics && analytics.engagement_score) {
      readinessScore += (analytics.engagement_score / 100) * 20;
    }

    return {
      score: Math.min(100, readinessScore),
      isReady: readinessScore >= 70,
      reason: this.getReadinessReason(readinessScore, userProfile)
    };
  }

  /**
   * 💡 Get readiness reason
   */
  getReadinessReason(score, userProfile) {
    if (score >= 70) {
      return 'User is ready - has names, good engagement, positive sentiment';
    }

    const reasons = [];

    if (!userProfile.first_name || !userProfile.middle_name || !userProfile.last_name) {
      reasons.push('missing complete name');
    }

    if ((userProfile.total_messages || 0) < 10) {
      reasons.push('needs more conversation');
    }

    if ((userProfile.sentiment_score || 0) < 0.2) {
      reasons.push('sentiment not positive enough');
    }

    return `Not ready: ${reasons.join(', ')}`;
  }

  /**
   * 🚩 Detect conversation risk flags
   */
  detectRiskFlags(userProfile, recentMessages) {
    const flags = [];

    // Too many boundary violations
    if (userProfile.boundary_violations && userProfile.boundary_violations > 2) {
      flags.push({
        type: 'boundary_violations',
        severity: 'high',
        message: 'User has multiple boundary violations'
      });
    }

    // Negative sentiment trend
    const recentSentiments = recentMessages
      .slice(-5)
      .map(msg => this.analyzeSentiment(msg.message_text));
    
    const avgRecentSentiment = recentSentiments.reduce((sum, s) => 
      sum + s.score, 0) / (recentSentiments.length || 1);

    if (avgRecentSentiment < -0.3) {
      flags.push({
        type: 'negative_sentiment',
        severity: 'medium',
        message: 'Recent messages are negative'
      });
    }

    // Low engagement
    if ((userProfile.total_messages || 0) > 5 && avgRecentSentiment < 0.1) {
      flags.push({
        type: 'low_engagement',
        severity: 'low',
        message: 'User engagement is declining'
      });
    }

    return flags;
  }

  /**
   * 📈 Track interest evolution
   */
  trackInterestEvolution(conversationHistory) {
    const interests = {};

    for (const msg of conversationHistory) {
      if (msg.message_direction === 'incoming') {
        const detected = this.detectInterests(msg.message_text);
        
        for (const interest of detected) {
          interests[interest] = (interests[interest] || 0) + 1;
        }
      }
    }

    // Sort by frequency
    const sorted = Object.entries(interests)
      .sort((a, b) => b[1] - a[1])
      .map(([interest, count]) => ({ interest, count }));

    return sorted;
  }

  /**
   * 🎨 Detect interests (simple version)
   */
  detectInterests(text) {
    const lowerText = text.toLowerCase();
    const interests = [];

    const interestKeywords = {
      спорт: ['спорт', 'футбол', 'фитнес'],
      технологии: ['технологии', 'компютри', 'програмиране'],
      музика: ['музика', 'песни', 'концерт'],
      пътуване: ['пътуване', 'travel', 'море']
    };

    for (const [interest, keywords] of Object.entries(interestKeywords)) {
      if (keywords.some(k => lowerText.includes(k))) {
        interests.push(interest);
      }
    }

    return interests;
  }

  /**
   * ⏱️ Calculate response urgency
   */
  calculateResponseUrgency(userProfile, lastMessageTime) {
    const timeSinceLastMessage = Date.now() - new Date(lastMessageTime).getTime();
    const minutesSince = timeSinceLastMessage / 1000 / 60;

    // If user sent a question, higher urgency
    if (userProfile.last_message_text && userProfile.last_message_text.includes('?')) {
      if (minutesSince < 2) return 'critical';
      if (minutesSince < 5) return 'high';
    }

    // Regular message urgency
    if (minutesSince < 1) return 'high';
    if (minutesSince < 5) return 'medium';
    if (minutesSince < 15) return 'low';
    
    return 'very_low';
  }

  /**
   * 📊 Generate behavior summary
   */
  generateBehaviorSummary(userProfile, analytics, recentMessages) {
    const sentiment = this.detectMood(recentMessages);
    const engagement = this.calculateEngagement(userProfile, recentMessages);
    const kycReadiness = this.predictKYCReadiness(userProfile, analytics);
    const riskFlags = this.detectRiskFlags(userProfile, recentMessages);

    return {
      sentiment: sentiment,
      engagementScore: engagement,
      kycReadiness: kycReadiness,
      riskFlags: riskFlags,
      totalMessages: userProfile.total_messages || 0,
      conversationStage: userProfile.conversation_stage || 'initial',
      hasFullNames: !!(userProfile.first_name && userProfile.middle_name && userProfile.last_name)
    };
  }
}

export default BehaviorAnalyzer;
