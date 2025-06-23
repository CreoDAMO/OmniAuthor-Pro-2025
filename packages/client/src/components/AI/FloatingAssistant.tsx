import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@apollo/client';
import { toast } from 'react-hot-toast';


import { GENERATE_AI_SUGGESTION } from '../../graphql/mutations';

import { useSubscription } from '../../contexts/SubscriptionContext';


import ChatInterface from './ChatInterface';
import AIModelSelector from './AIModelSelector';

// Type definitions for Speech Recognition
interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: () => void;
  start: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}


const FloatingAssistant: React.FC = () => {
  const { subscription, checkAIUsage } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentMode, setCurrentMode] = useState<'chat' | 'voice' | 'quick'>('chat');
  const assistantRef = useRef<HTMLDivElement>(null);


  const [generateSuggestion, { loading: generatingAI }] = useMutation(GENERATE_AI_SUGGESTION);


  const handleQuickAction = async (action: string) => {
    const canUseAI = await checkAIUsage();
    if (!canUseAI) {
      toast.error('AI usage limit reached. Please upgrade your subscription.');
      return;
    }


    try {
      await generateSuggestion({
        variables: {
          input: {
            manuscriptId: 'current', // Get from context
            context: 'Quick action request',
            type: action.toUpperCase().replace(' ', '_'),
            previousParagraphs: [],
          },
        },
      });

      toast.success('AI suggestion generated!');
    } catch (error) {
      toast.error('Failed to generate AI suggestion');
    }
  };


  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser');
      return;
    }


    setIsListening(true);
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';


    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      handleQuickAction(transcript);
      setIsListening(false);
    };


    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Voice recognition failed');
    };


    recognition.start();
  };


  return (
    <>
      <motion.div
        ref={assistantRef}
        className={`floating-assistant ${isOpen ? 'expanded' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          rotate: isListening ? 360 : 0,
        }}
        transition={{
          rotate: { duration: 2, repeat: isListening ? Infinity : 0 },
        }}
      >
        <motion.div className="assistant-icon">
          {generatingAI ? (
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : isListening ? (
            '🎤'
          ) : (
            '🤖'
          )}
        </motion.div>


        {subscription?.tier !== 'FREE' && (
          <div className="tier-indicator">
            {subscription?.tier}
          </div>
        )}
      </motion.div>


      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="assistant-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <motion.div
              className="assistant-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 500 }}
            >
              <div className="assistant-header">
                <h3>AI Writing Assistant</h3>
                <div className="mode-selector">
                  <button
                    className={currentMode === 'chat' ? 'active' : ''}
                    onClick={() => setCurrentMode('chat')}
                  >
                    💬 Chat
                  </button>
                  <button
                    className={currentMode === 'voice' ? 'active' : ''}
                    onClick={() => setCurrentMode('voice')}
                  >
                    🎤 Voice
                  </button>
                  <button
                    className={currentMode === 'quick' ? 'active' : ''}
                    onClick={() => setCurrentMode('quick')}
                  >
                    ⚡ Quick
                  </button>
                </div>
                <button 
                  className="close-btn"
                  onClick={() => setIsOpen(false)}
                >
                  ✕
                </button>
              </div>


              <div className="assistant-content">
                {currentMode === 'chat' && (
                  <ChatInterface onSuggestion={handleQuickAction} />
                )}


                {currentMode === 'voice' && (
                  <div className="voice-interface">
                    <div className="voice-status">
                      {isListening ? (
                        <motion.div
                          className="listening-indicator"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          🎤 Listening...
                        </motion.div>
                      ) : (
                        <div className="voice-prompt">
                          Click to start voice command
                        </div>
                      )}
                    </div>
                    <button
                      className="voice-btn"
                      onClick={startVoiceInput}
                      disabled={isListening}
                    >
                      {isListening ? 'Listening...' : 'Start Voice Input'}
                    </button>
                  </div>
                )}


                {currentMode === 'quick' && (
                  <div className="quick-actions">
                    <div className="quick-grid">
                      <button
                        className="quick-action"
                        onClick={() => handleQuickAction('continue_writing')}
                        disabled={generatingAI}
                      >
                        <span className="action-icon">✍️</span>
                        <span className="action-label">Continue Writing</span>
                      </button>
                      
                      <button
                        className="quick-action"
                        onClick={() => handleQuickAction('improve_style')}
                        disabled={generatingAI}
                      >
                        <span className="action-icon">🎨</span>
                        <span className="action-label">Improve Style</span>
                      </button>
                      
                      <button
                        className="quick-action"
                        onClick={() => handleQuickAction('expand_scene')}
                        disabled={generatingAI}
                      >
                        <span className="action-icon">🔍</span>
                        <span className="action-label">Expand Scene</span>
                      </button>
                      
                      <button
                        className="quick-action"
                        onClick={() => handleQuickAction('character_development')}
                        disabled={generatingAI}
                      >
                        <span className="action-icon">👥</span>
                        <span className="action-label">Develop Character</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>


              <div className="assistant-footer">
                <AIModelSelector />
                <div className="usage-indicator">
                  AI Usage: {subscription?.aiCallsToday || 0}
                  {subscription?.tier === 'FREE' ? '/10 today' : ' (unlimited)'}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};


export default FloatingAssistant;
