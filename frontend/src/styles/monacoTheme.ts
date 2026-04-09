/**
 * Custom Monaco editor theme that matches the site's dark colour palette.
 *
 * Palette reference (from theme.css):
 *   --bg-page:       #0d0d14
 *   --bg-input:      #1a1a2e
 *   --text-primary:  #e0e0ff
 *   --text-secondary:#c0c0e0
 *   --text-muted:    #6060a0
 *   --color-active:  #7B9EA6  ← teal-blue accent
 */

export const NEO_THEME_NAME = 'neo-dark';

type Monaco = {
  editor: {
    defineTheme: (name: string, data: object) => void;
  };
};

export function defineNeoTheme(monaco: Monaco) {
  monaco.editor.defineTheme(NEO_THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Comments — very muted, nearly invisible
      { token: 'comment',          foreground: '404060', fontStyle: 'italic' },
      { token: 'comment.line',     foreground: '404060', fontStyle: 'italic' },
      { token: 'comment.block',    foreground: '404060', fontStyle: 'italic' },

      // Keywords — site accent teal
      { token: 'keyword',          foreground: '7B9EA6' },
      { token: 'keyword.control',  foreground: '7B9EA6' },
      { token: 'keyword.operator', foreground: '8080b0' },
      { token: 'storage',          foreground: '7B9EA6' },
      { token: 'storage.type',     foreground: '7B9EA6' },

      // Strings — soft sage-green
      { token: 'string',           foreground: '8fb595' },
      { token: 'string.quoted',    foreground: '8fb595' },
      { token: 'string.template',  foreground: '8fb595' },

      // Numbers & booleans — soft dusty rose
      { token: 'number',           foreground: 'a08090' },
      { token: 'number.float',     foreground: 'a08090' },
      { token: 'constant.numeric', foreground: 'a08090' },
      { token: 'constant.language',foreground: '8b9eb8' },

      // Types, classes — lighter teal
      { token: 'type',             foreground: '8bbec8' },
      { token: 'entity.name.type', foreground: '8bbec8' },
      { token: 'support.type',     foreground: '8bbec8' },
      { token: 'entity.name.class',foreground: '8bbec8' },

      // Functions — primary text, slightly brighter
      { token: 'entity.name.function', foreground: 'c8d0f0' },
      { token: 'support.function',     foreground: 'c8d0f0' },

      // Variables / identifiers — default text
      { token: 'variable',         foreground: 'c0c0e0' },
      { token: 'identifier',       foreground: 'c0c0e0' },

      // Operators & punctuation — muted purple
      { token: 'operator',         foreground: '8080b0' },
      { token: 'delimiter',        foreground: '6060a0' },
      { token: 'delimiter.square', foreground: '7070a8' },
      { token: 'delimiter.curly',  foreground: '7070a8' },
      { token: 'delimiter.paren',  foreground: '7070a8' },

      // Annotations / decorators
      { token: 'annotation',       foreground: '7B9EA6', fontStyle: 'italic' },

      // Tags (HTML/JSX)
      { token: 'tag',              foreground: '7B9EA6' },
      { token: 'attribute.name',   foreground: '8bbec8' },
      { token: 'attribute.value',  foreground: '8fb595' },
    ],
    colors: {
      // ── Editor canvas ─────────────────────────────────────────────────
      'editor.background':            '#0d0d14',
      'editor.foreground':            '#c0c0e0',

      // ── Cursor ────────────────────────────────────────────────────────
      'editorCursor.foreground':      '#7B9EA6',

      // ── Line numbers ──────────────────────────────────────────────────
      'editorLineNumber.foreground':        '#3a3a5c',
      'editorLineNumber.activeForeground':  '#6060a0',

      // ── Selection ─────────────────────────────────────────────────────
      'editor.selectionBackground':          '#60609040',
      'editor.inactiveSelectionBackground':  '#60609020',
      'editor.selectionHighlightBackground': '#60609028',

      // ── Current line ──────────────────────────────────────────────────
      'editor.lineHighlightBackground':      '#13131f',
      'editor.lineHighlightBorder':          '#00000000',

      // ── Find / word highlight ─────────────────────────────────────────
      'editor.wordHighlightBackground':      '#7B9EA620',
      'editor.findMatchBackground':          '#7B9EA640',
      'editor.findMatchHighlightBackground': '#7B9EA620',

      // ── Gutter / margin ───────────────────────────────────────────────
      'editorGutter.background':      '#0d0d14',

      // ── Brackets ──────────────────────────────────────────────────────
      'editorBracketMatch.background': '#6060a020',
      'editorBracketMatch.border':     '#6060a0',

      // ── Indentation guides ────────────────────────────────────────────
      'editorIndentGuide.background1':       '#ffffff0a',
      'editorIndentGuide.activeBackground1': '#ffffff18',

      // ── Scrollbar ─────────────────────────────────────────────────────
      'scrollbar.shadow':                    '#00000000',
      'scrollbarSlider.background':          '#6060a018',
      'scrollbarSlider.hoverBackground':     '#6060a030',
      'scrollbarSlider.activeBackground':    '#6060a050',

      // ── Widget (hover docs, suggest) ──────────────────────────────────
      'editorWidget.background':             '#13131f',
      'editorWidget.border':                 '#3a3a5c',
      'editorSuggestWidget.background':      '#13131f',
      'editorSuggestWidget.border':          '#3a3a5c',
      'editorSuggestWidget.foreground':      '#c0c0e0',
      'editorSuggestWidget.selectedBackground': '#6060a030',
      'editorHoverWidget.background':        '#13131f',
      'editorHoverWidget.border':            '#3a3a5c',

      // ── Peek view ─────────────────────────────────────────────────────
      'peekView.border':                     '#7B9EA6',
      'peekViewEditor.background':           '#0d0d14',
      'peekViewResult.background':           '#13131f',

      // ── Errors / warnings ─────────────────────────────────────────────
      'editorError.foreground':              '#a05050',
      'editorWarning.foreground':            '#a08030',
      'editorInfo.foreground':               '#7B9EA6',
    },
  });
}
