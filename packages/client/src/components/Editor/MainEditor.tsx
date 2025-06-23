import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useSubscription, useQuery } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { debounce } from 'lodash';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { XIcon } from '@heroicons/react/outline';
import {
  LexicalComposer,
  PlainTextPlugin,
  ContentEditable,
  HistoryPlugin,
  OnChangePlugin,
} from '@lexical/react';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';

import { ADD_PARAGRAPH, UPDATE_MANUSCRIPT } from '../../graphql/mutations';
import { PARAGRAPH_ADDED_SUBSCRIPTION } from '../../graphql/subscriptions';
import { GET_PARAGRAPHS, CREATE_COINBASE_CHARGE } from '../../graphql/queries';
import { useAuth } from '../../contexts/AuthContext';
import EditorToolbar from './EditorToolbar';
import AIPanel from '../AI/AIPanel';
import CollaboratorIndicators from '../Collaboration/CollaboratorIndicators';
import AutoSaveIndicator from './AutoSaveIndicator';
import { SUBSCRIPTION_PLANS } from '@omniauthor/shared';

const lexicalConfig = {
  namespace: 'OmniAuthorEditor',
  onError: (error: Error) => console.error(error),
};

const MainEditor: React.FC<MainEditorProps> = ({ manuscriptId }) => {
  const { user } = useAuth();
  const [editorState, setEditorState] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [selectedTier, setSelectedTier] = useState<keyof typeof SUBSCRIPTION_PLANS | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const { data: paragraphsData, loading } = useQuery(GET_PARAGRAPHS, {
    variables: { manuscriptId },
  });

  const [addParagraph] = useMutation(ADD_PARAGRAPH, {
    refetchQueries: [{ query: GET_PARAGRAPHS, variables: { manuscriptId } }],
  });

  const [updateManuscript] = useMutation(UPDATE_MANUSCRIPT);

  const [createCoinbaseCharge] = useMutation(CREATE_COINBASE_CHARGE, {
    onCompleted: (data) => {
      if (data.createCoinbaseCharge?.redirect_url) {
        window.location.href = data.createCoinbaseCharge.redirect_url;
      }
      toast.success('Payment initiated');
    },
    onError: (error) => toast.error(error.message),
  });

  useSubscription(PARAGRAPH_ADDED_SUBSCRIPTION, {
    variables: { manuscriptId },
    onData: ({ data }) => {
      if (data.data?.paragraphAdded && data.data.paragraphAdded.authorId !== user?.id) {
        const newParagraph = data.data.paragraphAdded;
        setEditorState((prev) => {
          const editor = lexicalConfig.editor;
          editor.update(() => {
            const root = $getRoot();
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(newParagraph.text));
            root.append(paragraph);
          });
          return JSON.stringify(editor.getEditorState());
        });
        toast.success(`${newParagraph.authorId} added content`, {
          id: `collab-${newParagraph.id}`,
        });
      }
    },
  });

  useEffect(() => {
    if (paragraphsData?.paragraphs) {
      const editor = lexicalConfig.editor;
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        paragraphsData.paragraphs.forEach((p: any) => {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(p.text));
          root.append(paragraph);
        });
      });
      setEditorState(JSON.stringify(editor.getEditorState()));
      setWordCount(paragraphsData.paragraphs.reduce((acc: number, p: any) => acc + p.text.split(' ').length, 0));
    }
  }, [paragraphsData]);

  const debouncedSave = useCallback(
    debounce(async (text: string) => {
      if (!text.trim()) return;
      try {
        await addParagraph({
          variables: {
            input: {
              manuscriptId,
              text: text.slice(-1000),
              source: 'HUMAN',
            },
          },
        });
        setLastSaved(new Date());
        setIsTyping(false);
        toast.success('Content saved');
      } catch (error) {
        toast.error('Auto-save failed');
      }
    }, 3000),
    [manuscriptId, addParagraph]
  );

  const onEditorChange = (editorState: any) => {
    setEditorState(JSON.stringify(editorState));
    editorState.read(() => {
      const text = $getRoot().getTextContent();
      setWordCount(text.split(' ').length);
      setIsTyping(true);
      debouncedSave(text);
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to make a payment');
      return;
    }
    try {
      await createCoinbaseCharge({
        variables: {
          input: {
            name: selectedTier ? `Subscription: ${selectedTier}` : 'One-Time Payment',
            description: selectedTier ? `Upgrade to ${selectedTier} plan` : paymentDescription || 'OmniAuthor payment',
            amount: selectedTier ? SUBSCRIPTION_PLANS[selectedTier].price : parseFloat(paymentAmount),
            currency: 'USD',
          },
        },
      });
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentDescription('');
      setSelectedTier(null);
    } catch (error) {
      toast.error('Payment initiation failed');
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="editor-loading"
        data-testid="editor-loading"
      >
        <div className="loading-spinner">Loading editor...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="main-editor"
      data-testid="main-editor"
    >
      <EditorToolbar
        manuscriptId={manuscriptId}
        onAIPanel={() => setAiPanelOpen(!aiPanelOpen)}
        onPayment={() => setPaymentModalOpen(true)}
        editorRef={editorRef}
      />

      <div className="editor-workspace flex">
        <div className="editor-container flex-1">
          <CollaboratorIndicators manuscriptId={manuscriptId} />
          <div className="editor-area">
            <LexicalComposer initialConfig={lexicalConfig}>
              <PlainTextPlugin
                contentEditable={<ContentEditable className="text-editor" data-testid="text-editor" />}
                placeholder={<div className="editor-placeholder">Begin your story...</div>}
              />
              <HistoryPlugin />
              <OnChangePlugin onChange={onEditorChange} />
            </LexicalComposer>
            <AutoSaveIndicator isTyping={isTyping} lastSaved={lastSaved} />
            <div className="editor-stats" data-testid="word-count">
              Word Count: {wordCount}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {aiPanelOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 300 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AIPanel
                manuscriptId={manuscriptId}
                currentText={editorState}
                onClose={() => setAiPanelOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Transition show={paymentModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => setPaymentModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            </Transition.Child>

            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>

            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Make a Payment
                </Dialog.Title>
                <button
                  type="button"
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                  onClick={() => setPaymentModalOpen(false)}
                >
                  <XIcon className="h-6 w-6" />
                </button>
                <form onSubmit={handlePaymentSubmit} className="mt-4" data-testid="payment-form">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Payment Type</label>
                    <select
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      onChange={(e) => setSelectedTier(e.target.value as keyof typeof SUBSCRIPTION_PLANS)}
                      value={selectedTier || ''}
                      data-testid="subscription-tier-select"
                    >
                      <option value="">One-Time Payment</option>
                      {Object.keys(SUBSCRIPTION_PLANS).map((tier) => (
                        <option key={tier} value={tier}>
                          {tier} (${SUBSCRIPTION_PLANS[tier].price}/month)
                        </option>
                      ))}
                    </select>
                  </div>
                  {!selectedTier && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Amount (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          required
                          data-testid="payment-amount"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                          type="text"
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                          value={paymentDescription}
                          onChange={(e) => setPaymentDescription(e.target.value)}
                          data-testid="payment-description"
                        />
                      </div>
                    </>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
                    data-testid="submit-payment-btn"
                  >
                    Pay with Coinbase
                  </button>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </motion.div>
  );
};

interface MainEditorProps {
  manuscriptId: string;
}

export default MainEditor;
