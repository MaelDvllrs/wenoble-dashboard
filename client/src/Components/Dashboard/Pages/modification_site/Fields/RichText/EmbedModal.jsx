import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CodeIcon from '@mui/icons-material/Code';
import { DefaultButton, SecondaryButton } from '../../../../../../Theme/element';
import Editor from '@monaco-editor/react';

const EmbedModal = ({ open, onClose, onInsert, initialCode = '' }) => {
  const theme = useTheme();
  const [htmlCode, setHtmlCode] = useState('');

  // Mettre à jour le code quand initialCode change
  React.useEffect(() => {
    if (open) {
      setHtmlCode(initialCode);
    }
  }, [open, initialCode]);

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('night-tokyo', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'bb9af7' },
        { token: 'string', foreground: '9ece6a' },
        { token: 'number', foreground: 'ff9e64' },
        { token: 'tag', foreground: 'f7768e' },
        { token: 'attribute.name', foreground: '7aa2f7' },
        { token: 'attribute.value', foreground: '9ece6a' },
        { token: 'delimiter', foreground: 'c0caf5' },
      ],
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#c0caf5',
        'editorLineNumber.foreground': '#3b4261',
        'editorCursor.foreground': '#c0caf5',
        'editor.selectionBackground': '#33467c',
        'editor.lineHighlightBackground': '#1f2335',
        'editorWhitespace.foreground': '#3b4261',
        'editor.findMatchBackground': '#3d59a1',
        'editor.findMatchHighlightBackground': '#3d59a1',
      },
    });
  };

  const handleInsert = () => {
    onInsert({ html: htmlCode });
    handleClose();
  };

  const handleClose = () => {
    setHtmlCode('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.text.primary,
          minHeight: '500px'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CodeIcon />
        Insérer un code HTML personnalisé
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Editor
          height="400px"
          defaultLanguage="html"
          value={htmlCode}
          onChange={(value) => setHtmlCode(value || '')}
          beforeMount={handleEditorWillMount}
          theme='night-tokyo'
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'full',
            bracketPairColorization: { enabled: true },
            suggest: {
              snippetsPreventQuickSuggestions: false
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true
            },
            padding: { top: 10, bottom: 10 }
          }}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <SecondaryButton onClick={handleClose}>
          Annuler
        </SecondaryButton>
        <DefaultButton onClick={handleInsert}>
          Insérer
        </DefaultButton>
      </DialogActions>
    </Dialog>
  );
};

export default EmbedModal;
