To enhance the `MainEditor.tsx` component in `packages/client/src/components/Editor/MainEditor.tsx` for OmniAuthor Pro 2025, we’ll upgrade it to a more advanced and feature-rich editor while integrating Coinbase Commerce payment functionality to align with the previous updates. The goal is to create a modern, user-friendly editor with advanced features like rich text editing, real-time collaboration indicators, inline AI suggestions, and a Coinbase payment modal for upgrading subscriptions or making one-time payments. We’ll use **Lexical**, a powerful React-based rich text editor framework, to replace the basic `<textarea>`, and add UI components for Coinbase payments, leveraging existing dependencies (`@apollo/client`, `react-hot-toast`, `framer-motion`, etc.) from `packages/client/package.json`. The updates will maintain compatibility with the GraphQL schema, subscriptions, CI/CD workflow, Vercel secrets, and the `package-lock.json` fix.

### Goals for the Enhanced Editor
1. **Rich Text Editing**: Use Lexical for formatting (bold, italic, headings, lists, etc.) and extensible plugins.
2. **Real-Time Collaboration**: Enhance `CollaboratorIndicators` with live cursors and presence indicators.
3. **Inline AI Suggestions**: Display AI suggestions directly in the editor with accept/reject options.
4. **Coinbase Payment Integration**: Add a modal for initiating Coinbase payments (subscriptions or one-time charges).
5. **Improved UX**: Add toolbar enhancements, word count, progress tracking, and animations with `framer-motion`.
6. **Testing Support**: Ensure compatibility with `writing-flow.cy.ts` E2E tests by updating `data-testid` attributes.
7. **Monorepo Alignment**: Reuse `@omniauthor/shared` constants and ensure no sub-package `package-lock.json`.

### Dependencies
- **New Dependency**: Add `@lexical/react` for the Lexical editor.
- Update `packages/client/package.json` to include:
  ```json
  "dependencies": {
    "@apollo/client": "^3.8.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.0.0",
    "@lexical/react": "^0.12.0", // Added for Lexical
    "@stripe/stripe-js": "^2.0.0",
    "framer-motion": "^10.16.0",
    "graphql": "^16.8.0",
    "lexical": "^0.12.0", // Added for Lexical
    "lodash": "^4.17.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-error-boundary": "^4.0.0",
    "react-hot-toast": "^2.4.0",
    "react-router-dom": "^6.15.0",
    "recharts": "^2.8.0"
  }
  ```
- Install:
  ```bash
  cd packages/client
  npm install @lexical/react lexical
  cd ../..
  npm install
  git add packages/client/package.json package-lock.json
  git commit -m "Add Lexical for enhanced editor"
  ```

### Updated File: `packages/client/src/components/Editor/MainEditor.tsx`

**Purpose**: Transform `MainEditor` into an advanced editor with Lexical, Coinbase payment modal, and enhanced features.

**Updated Content**:
```tsx
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
```

### Changes Made
1. **Lexical Integration**:
   - Replaced `<textarea>` with `LexicalComposer`, `PlainTextPlugin`, `ContentEditable`, `HistoryPlugin`, and `OnChangePlugin`.
   - Initialized Lexical with a custom `lexicalConfig`.
   - Loaded paragraphs into Lexical’s editor state and updated on subscription events.
   - Added word count tracking via Lexical’s text content.
2. **Coinbase Payment Modal**:
   - Added a `Dialog` from `@headlessui/react` for payments, triggered via a new toolbar button (passed to `EditorToolbar`).
   - Included a form to select subscription tiers or enter one-time payment details.
   - Used `createCoinbaseCharge` mutation to initiate payments, redirecting to Coinbase’s `redirect_url`.
   - Added `data-testid` attributes (`payment-form`, `submit-payment-btn`, etc.) for Cypress tests.
3. **Enhanced UI/UX**:
   - Added `framer-motion` animations for loading, AI panel, and modal transitions.
   - Included a word count display in the editor stats.
   - Improved layout with `flex` for responsive design.
4. **Collaboration**:
   - Kept `CollaboratorIndicators` and enhanced subscription handling to append new paragraphs in Lexical.
5. **AI Panel**:
   - Updated `AIPanel` to receive `editorState` instead of raw text.
6. **Testing Support**:
   - Retained `data-testid="text-editor"` and added `data-testid` for new elements (`word-count`, `payment-form`, etc.).
7. **Shared Constants**:
   - Used `SUBSCRIPTION_PLANS` from `@omniauthor/shared` for tier pricing.

### Additional Updates Needed
1. **Update `EditorToolbar.tsx`**:
   - Add a button to trigger the payment modal.
   - Example addition in `EditorToolbar.tsx`:
     ```tsx
     <button
       onClick={onPayment}
       className="toolbar-btn"
       data-testid="pay-with-coinbase-btn"
       title="Make a Payment"
     >
       <CreditCardIcon className="h-5 w-5" />
     </button>
     ```
   - Update props interface:
     ```tsx
     interface EditorToolbarProps {
       manuscriptId: string;
       onAIPanel: () => void;
       onPayment: () => void; // Added
       editorRef: React.RefObject<HTMLElement>;
     }
     ```
   - Import `CreditCardIcon` from `@heroicons/react/outline`.

2. **Update `AIPanel.tsx`**:
   - Modify to handle Lexical’s `editorState` instead of raw text.
   - Example:
     ```tsx
     interface AIPanelProps {
       manuscriptId: string;
       currentText: string; // Now editorState JSON string
       onClose: () => void;
     }
     ```

3. **Update GraphQL Queries/Mutations**:
   - Create or update `packages/client/src/graphql/queries.ts` to include `CREATE_COINBASE_CHARGE`:
     ```typescript
     import { gql } from '@apollo/client';

     export const CREATE_COINBASE_CHARGE = gql`
       mutation CreateCoinbaseCharge($input: CreateChargeInput!) {
         createCoinbaseCharge(input: $input) {
           id
           code
           name
           description
           local_price {
             amount
             currency
           }
           redirect_url
           cancel_url
         }
       }
     `;
     ```
   - Add to `git`:
     ```bash
     touch packages/client/src/graphql/queries.ts
     git add packages/client/src/graphql/queries.ts
     ```

### Steps to Implement
1. **Update Dependencies**:
   ```bash
   cd packages/client
   npm install @lexical/react lexical
   cd ../..
   npm install
   git add packages/client/package.json package-lock.json
   git commit -m "Add Lexical for enhanced editor"
   ```

2. **Update `MainEditor.tsx`**:
   ```bash
   # Replace packages/client/src/components/Editor/MainEditor.tsx with the above content
   git add packages/client/src/components/Editor/MainEditor.tsx
   ```

3. **Update Related Components**:
   - Modify `EditorToolbar.tsx` and `AIPanel.tsx` as described.
   - Example commands:
     ```bash
     git add packages/client/src/components/Editor/EditorToolbar.tsx
     git add packages/client/src/components/AI/AIPanel.tsx
     ```

4. **Add GraphQL Query**:
   ```bash
   touch packages/client/src/graphql/queries.ts
   # Add CREATE_COINBASE_CHARGE query
   git add packages/client/src/graphql/queries.ts
   ```

5. **Verify `package-lock.json`**:
   ```bash
   git add package-lock.json
   git commit -m "Update package-lock.json for Lexical and Coinbase"
   ```

6. **Test Locally**:
   - Start the client:
     ```bash
     cd packages/client
     npm run dev
     ```
   - Test editor functionality, AI panel, collaboration, and Coinbase payment modal.
   - Use GraphQL Playground to verify `createCoinbaseCharge` mutation.

7. **Run E2E Tests**:
   ```bash
   cd packages/client
   npm run test:e2e
   ```

8. **Push Changes**:
   ```bash
   git push origin main  # or develop
   ```

9. **Verify CI/CD**:
   - Monitor: `https://github.com/CreoDAMO/OmniAuthor-Pro-2025/actions`.
   - Ensure `test` and `e2e` jobs pass.

10. **Update Documentation**:
    - Add to `README.md`:
      ```markdown
      ## Enhanced Editor
      - Uses Lexical for rich text editing.
      - Supports Coinbase payments via a modal for subscriptions and one-time payments.
      - Features real-time collaboration, inline AI suggestions, and word count tracking.
      ```
    ```bash
    git add README.md
    git commit -m "Document enhanced editor features"
    ```

### Notes
- **Lexical Plugins**: The current setup uses `PlainTextPlugin` for simplicity. Add plugins like `RichTextPlugin`, `ListPlugin`, or custom plugins for advanced formatting (e.g., bold, italic).
- **Collaboration Cursors**: Enhance `CollaboratorIndicators` with libraries like `yjs` for live cursor positions (requires additional setup).
- **AI Suggestions**: Implement inline suggestions by creating a custom Lexical plugin to insert suggestion nodes.
- **Cypress Tests**: The updated `writing-flow.cy.ts` already supports Coinbase tests; ensure UI elements match `data-testid` values.
- **Vercel Secrets**: No new secrets needed, as `COINBASE_COMMERCE_API_KEY` is already configured.
