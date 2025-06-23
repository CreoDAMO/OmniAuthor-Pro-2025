import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { GENERATE_AI_SUGGESTION } from '../../graphql/mutations';
import { useSubscription } from '../../contexts/SubscriptionContext';

interface AIAnalysis {
  originality: number;
  voiceMatch: number;
  pacing: number;
  engagement: number;
  suggestions: Array<{
    id: string;
    type: string;
    text: string;
    confidence: number;
  }>;
}

interface AIProps {
  manuscriptId: string;
  onSuggestionApply: (text: string) => void;
  currentText?: string;
}

const AIPanel: React.FC<AIProps> = ({ manuscriptId, onSuggestionApply, currentText = '' }) => {
  const { checkAIUsage } = useSubscription();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [selectedMode, setSelectedMode] = useState<'improve' | 'continue' | 'expand'>('improve');

  const [generateSuggestion, { loading }] = useMutation(GENERATE_AI_SUGGESTION);

  const handleGenerateSuggestion = async () => {
    const canUseAI = await checkAIUsage();
    if (!canUseAI) {
      toast.error('AI usage limit reached. Please upgrade your subscription.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data } = await generateSuggestion({
        variables: {
          input: {
            manuscriptId,
            context: currentText,
            type: selectedMode.toUpperCase(),
            previousParagraphs: [],
          },
        },
      });

      if (data?.generateAISuggestion) {
        setAnalysis(data.generateAISuggestion);
        toast.success('AI analysis complete');
      }
    } catch (error) {
      toast.error('Failed to generate AI suggestion');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-0 top-20 h-[calc(100vh-5rem)] w-80 bg-white dark:bg-gray-800 shadow-lg p-4 overflow-y-auto"
    >
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">AI Assistant</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mode
        </label>
        <div className="flex gap-2">
          {['improve', 'continue', 'expand'].map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode as 'improve' | 'continue' | 'expand')}
              className={`px-3 py-1 rounded ${
                selectedMode === mode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerateSuggestion}
        disabled={loading || isAnalyzing}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {loading || isAnalyzing ? 'Analyzing...' : 'Generate Suggestion'}
      </button>

      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Analysis</h3>
              <div className="space-y-2">
                {['originality', 'voiceMatch', 'pacing', 'engagement'].map((metric) => (
                  <div key={metric} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {metric.charAt(0).toUpperCase() + metric.slice(1)}
                    </span>
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600"
                        style={{ width: `${analysis[metric as keyof AIAnalysis]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Suggestions</h3>
              <div className="space-y-3">
                {analysis.suggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                  >
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{suggestion.text}</p>
                    <button
                      onClick={() => onSuggestionApply(suggestion.text)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Apply Suggestion
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AIPanel;
