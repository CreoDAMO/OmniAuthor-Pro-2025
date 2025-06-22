import { OpenAI } from 'openai';
import { AIAnalysis, AISuggestion } from '@omniauthor/shared';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';


// Note: Using OpenAI as example - replace with actual xAI/Grok integration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export class AIService {
  async analyzeText(text: string, manuscriptId: string): Promise<AIAnalysis> {
    const cacheKey = `ai_analysis:${manuscriptId}:${this.hashText(text)}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }


      // Analyze text with AI
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert writing analyst. Analyze the following text and provide scores (0-100) for:
            1. Originality - How unique and creative the content is
            2. Voice Match - Consistency with the author's established voice
            3. Pacing - How well the narrative flows and maintains interest
            4. Engagement - How compelling and readable the text is
            
            Also provide 2-3 specific suggestions for improvement.
            Respond in JSON format only.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
      });


      const analysis = this.parseAIResponse(response.choices[0].message.content);
      
      // Cache for 1 hour
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(analysis));
      
      return analysis;
    } catch (error) {
      logger.error('AI analysis failed:', error);
      // Return fallback analysis
      return this.getFallbackAnalysis();
    }
  }


  async generateSuggestion(input: {
    manuscriptId: string;
    context: string;
    type: string;
    previousParagraphs: string[];
    userId: string;
  }): Promise<AISuggestion> {
    try {
      const { context, type, previousParagraphs } = input;
      
      let prompt = '';
      switch (type) {
        case 'CONTINUE_WRITING':
          prompt = `Continue this story naturally, maintaining the established tone and style:\n\n${context}`;
          break;
        case 'IMPROVE_STYLE':
          prompt = `Suggest improvements to the writing style and flow of this text:\n\n${context}`;
          break;
        case 'EXPAND_SCENE':
          prompt = `Suggest ways to expand and add more detail to this scene:\n\n${context}`;
          break;
        case 'CHARACTER_DEVELOPMENT':
          prompt = `Suggest character development opportunities in this text:\n\n${context}`;
          break;
        default:
          prompt = `Provide writing suggestions for this text:\n\n${context}`;
      }


      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional writing assistant. Provide specific, actionable suggestions that help improve the writing while maintaining the author's voice. Be encouraging and constructive.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });


      return {
        id: `suggestion_${Date.now()}`,
        type: type as any,
        text: response.choices[0].message.content || '',
        confidence: 0.85,
        reasoning: `AI analysis based on ${type.toLowerCase().replace('_', ' ')} requirements`,
      };
    } catch (error) {
      logger.error('AI suggestion generation failed:', error);
      throw new Error('Failed to generate AI suggestion');
    }
  }


  private hashText(text: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }


  private parseAIResponse(content: string | null): AIAnalysis {
    try {
      if (!content) throw new Error('No content received');
      
      const parsed = JSON.parse(content);
      return {
        originality: parsed.originality || 85,
        voiceMatch: parsed.voiceMatch || 88,
        pacing: parsed.pacing || 82,
        engagement: parsed.engagement || 86,
        suggestions: parsed.suggestions || [],
      };
    } catch (error) {
      logger.warn('Failed to parse AI response, using fallback');
      return this.getFallbackAnalysis();
    }
  }


  private getFallbackAnalysis(): AIAnalysis {
    return {
      originality: 85,
      voiceMatch: 88,
      pacing: 82,
      engagement: 86,
      suggestions: [
        {
          id: 'fallback_1',
          type: 'IMPROVE_STYLE',
          text: 'Consider varying sentence length for better rhythm.',
          confidence: 0.7,
          reasoning: 'Fallback suggestion - AI service unavailable',
        },
      ],
    };
  }
}


export const aiService = new AIService();
