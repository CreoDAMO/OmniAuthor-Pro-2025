import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useSubscription, useQuery } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { debounce } from 'lodash';


import { ADD_PARAGRAPH, UPDATE_MANUSCRIPT } from '../../graphql/mutations';
import { PARAGRAPH_ADDED_SUBSCRIPTION } from '../../graphql/subscriptions';
import { GET_PARAGRAPHS } from '../../graphql/queries';
import { useAuth } from '../../contexts/AuthContext';


import EditorToolbar from './EditorToolbar';
import AIPanel from '../AI/AIPanel';
import CollaboratorIndicators from '../Collaboration/CollaboratorIndicators';
import AutoSaveIndicator from './AutoSaveIndicator';


interface MainEditorProps {
  manuscriptId: string;
}


const MainEditor: React.FC<MainEditorProps> = ({ manuscriptId }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);


  const { data: paragraphsData, loading } = useQuery(GET_PARAGRAPHS, {
    variables: { manuscriptId },
  });


  const [addParagraph] = useMutation(ADD_PARAGRAPH, {
    refetchQueries: [{ query: GET_PARAGRAPHS, variables: { manuscriptId } }],
  });


  const [updateManuscript] = useMutation(UPDATE_MANUSCRIPT);


  // Subscribe to real-time paragraph additions
  useSubscription(PARAGRAPH_ADDED_SUBSCRIPTION, {
    variables: { manuscriptId },
    onData: ({ data }) => {
      if (data.data?.paragraphAdded && data.data.paragraphAdded.authorId !== user?.id) {
        const newParagraph = data.data.paragraphAdded;
        setContent(prev => prev + '\n\n' + newParagraph.text);
        toast.success(`${newParagraph.authorId} added content`);
      }
    },
  });


  // Load existing content
  useEffect(() => {
    if (paragraphsData?.paragraphs) {
      const text = paragraphsData.paragraphs
        .map((p: any) => p.text)
        .join('\n\n');
      setContent(text);
    }
  }, [paragraphsData]);


  // Auto-save functionality
  const debouncedSave = useCallback(
    debounce(async (text: string) => {
      if (!text.trim()) return;


      try {
        await addParagraph({
          variables: {
            input: {
              manuscriptId,
              text: text.slice(-1000), // Save last 1000 characters as new paragraph
              source: 'HUMAN',
            },
          },
        });


        setLastSaved(new Date());
        setIsTyping(false);
      } catch (error) {
        toast.error('Auto-save failed');
      }
    }, 3000),
    [manuscriptId, addParagraph]
  );


  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsTyping(true);
    debouncedSave(newContent);
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          debouncedSave.flush();
          break;
        case 'b':
          e.preventDefault();
          // Bold text functionality
          break;
        case 'i':
          e.preventDefault();
          // Italic text functionality
          break;
      }
    }
  };


  if (loading) {
    return (
      <div className="editor-loading">
        <div className="loading-spinner">Loading editor...</div>
      </div>
    );
  }


  return (
    <div className="main-editor">
      <EditorToolbar 
        manuscriptId={manuscriptId}
        onAIPanel={() => setAiPanelOpen(!aiPanelOpen)}
        editorRef={editorRef}
      />


      <div className="editor-workspace">
        <div className="editor-container">
          <CollaboratorIndicators manuscriptId={manuscriptId} />
          
          <div className="editor-area">
            <textarea
              ref={editorRef}
              className="text-editor"
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Begin your story... Your AI writing partner is ready to assist."
              spellCheck={true}
              autoFocus
            />
            
            <AutoSaveIndicator 
              isTyping={isTyping}
              lastSaved={lastSaved}
            />
          </div>
        </div>


        {aiPanelOpen && (
          <AIPanel 
            manuscriptId={manuscriptId}
            currentText={content}
            onClose={() => setAiPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
};


export default MainEditor;
