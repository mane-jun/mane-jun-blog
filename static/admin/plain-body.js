// On Android, Decap's body editor (Slate) cancels the keyboard's Hangul composition when typing starts on an empty line,
// leaving the first letter as separate jamo (ㅇㅏ instead of 아). slate-react fixed this in 0.126.3, but Decap bundles
// 0.117. So on Android the markdown widget becomes a plain textarea, which the keyboard handles natively, with a button
// that inserts an image from the media library. Other devices keep Decap's editor.

export const usesPlainBody = (userAgent) => /Android/u.test(userAgent);

// CommonMark needs <...> around a destination with spaces or parentheses.
const imageMarkdown = (path) => `![](${/[\s()]/u.test(path) ? `<${path}>` : path})`;

// Puts an image on its own line at the selection. Returns the new text and the cursor position right after the image.
export function insertImage(text, { start, end }, path) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const image = imageMarkdown(path);
  const lead = before === '' || before.endsWith('\n') ? '' : '\n';
  const trail = after.startsWith('\n') ? '' : '\n';
  return { text: `${before}${lead}${image}${trail}${after}`, cursor: before.length + lead.length + image.length };
}

// Built with Decap's createClass and h globals. The media library handshake is the one Decap's image widget uses:
// open the library under a control ID, then read the chosen path from mediaPaths and clear it.
export function createPlainBodyControl({ createClass, h }) {
  let count = 0;
  return createClass({
    controlId() {
      if (!this.id) {
        count += 1;
        this.id = `plain-body-${count}`;
      }
      return this.id;
    },

    // Decap's widget wrapper re-renders a control only on value or style changes unless the control decides itself,
    // and then a chosen image would never arrive.
    shouldComponentUpdate(next) {
      return next.value !== this.props.value
        || next.classNameWrapper !== this.props.classNameWrapper
        || Boolean(next.mediaPaths.get(this.controlId()));
    },

    componentDidUpdate() {
      const { mediaPaths, onRemoveInsertedMedia, onChange, value } = this.props;
      const chosen = mediaPaths.get(this.controlId());
      if (this.cursor !== undefined && this.textarea) {
        this.textarea.setSelectionRange(this.cursor, this.cursor);
        this.cursor = undefined;
      }
      if (!chosen) return;
      onRemoveInsertedMedia(this.controlId());
      const paths = typeof chosen === 'string' ? [chosen] : chosen.toJS();
      let text = value || '';
      let selection = this.selection ?? { start: text.length, end: text.length };
      paths.forEach((path) => {
        const inserted = insertImage(text, selection, path);
        text = inserted.text;
        selection = { start: inserted.cursor, end: inserted.cursor };
      });
      this.selection = selection;
      this.cursor = selection.start;
      onChange(text);
    },

    componentWillUnmount() {
      this.props.onRemoveMediaControl(this.controlId());
    },

    openMediaLibrary() {
      const { field, onOpenMediaLibrary } = this.props;
      if (this.textarea) this.selection = { start: this.textarea.selectionStart, end: this.textarea.selectionEnd };
      onOpenMediaLibrary({ controlID: this.controlId(), forImage: true, privateUpload: false, value: '', allowMultiple: false, field });
    },

    render() {
      const { forID, value, onChange, classNameWrapper, setActiveStyle, setInactiveStyle } = this.props;
      return h('div', { className: 'plain-body' },
        h('div', { className: 'plain-body-bar' },
          h('button', { type: 'button', className: 'plain-body-image', onClick: this.openMediaLibrary }, '이미지 넣기')),
        h('textarea', {
          id: forID,
          className: `${classNameWrapper} plain-body-input`,
          value: value || '',
          ref: (element) => { this.textarea = element; },
          onChange: (event) => onChange(event.target.value),
          onFocus: setActiveStyle,
          onBlur: setInactiveStyle,
        }));
    },
  });
}

export function installPlainBody(win = window) {
  if (!usesPlainBody(win.navigator.userAgent)) return false;
  const { CMS } = win;
  const markdown = CMS.getWidget('markdown');
  CMS.registerWidget('markdown', createPlainBodyControl(win), markdown.preview, markdown.schema);
  return true;
}
