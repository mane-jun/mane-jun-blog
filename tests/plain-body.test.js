import { describe, expect, it, vi } from 'vitest';
import { createPlainBodyControl, insertImage, installPlainBody, usesPlainBody } from '../static/admin/plain-body.js';

const ANDROID = 'Mozilla/5.0 (Linux; Android 15; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

// createClass returns the spec itself, so a control is the spec plus props.
const control = (props) => {
  const Control = createPlainBodyControl({ createClass: (spec) => spec, h: () => null });
  return Object.assign(Object.create(Control), { props });
};

const mediaPaths = (entries) => ({ get: (id) => entries[id] });

describe('plain body editor on Android', () => {
  it('replaces the body editor only on Android', () => {
    expect(usesPlainBody(ANDROID)).toBe(true);
    expect(usesPlainBody(IPHONE)).toBe(false);
    expect(usesPlainBody(WINDOWS)).toBe(false);
  });

  it('puts an image on its own line at the cursor', () => {
    expect(insertImage('첫 줄\n', { start: 4, end: 4 }, 'a.jpg')).toEqual({ text: '첫 줄\n![](a.jpg)\n', cursor: 14 });
    expect(insertImage('앞뒤', { start: 1, end: 1 }, 'a.jpg')).toEqual({ text: '앞\n![](a.jpg)\n뒤', cursor: 12 });
    expect(insertImage('', { start: 0, end: 0 }, 'a.jpg')).toEqual({ text: '![](a.jpg)\n', cursor: 10 });
    // A selection is replaced by the image.
    expect(insertImage('가나다', { start: 1, end: 2 }, 'a.jpg').text).toBe('가\n![](a.jpg)\n다');
  });

  it('wraps image paths with spaces or parentheses so the markdown stays valid', () => {
    expect(insertImage('', { start: 0, end: 0 }, '사진 1 (2).jpg').text).toBe('![](<사진 1 (2).jpg>)\n');
  });

  it('opens the media library for one image and inserts the chosen path at the saved cursor', () => {
    const props = {
      value: '첫 줄\n둘째 줄',
      field: 'body field',
      mediaPaths: mediaPaths({}),
      onOpenMediaLibrary: vi.fn(),
      onRemoveInsertedMedia: vi.fn(),
      onChange: vi.fn(),
    };
    const body = control(props);
    body.textarea = { selectionStart: 4, selectionEnd: 4, setSelectionRange: vi.fn() };

    body.openMediaLibrary();
    const [request] = props.onOpenMediaLibrary.mock.calls[0];
    expect(request).toMatchObject({ forImage: true, allowMultiple: false, field: 'body field' });

    body.props = { ...props, mediaPaths: mediaPaths({ [request.controlID]: 'photo.jpg' }) };
    body.componentDidUpdate();
    expect(props.onRemoveInsertedMedia).toHaveBeenCalledWith(request.controlID);
    expect(props.onChange).toHaveBeenCalledWith('첫 줄\n![](photo.jpg)\n둘째 줄');

    // The next render moves the cursor to just after the image, and the path is not inserted again.
    body.props = { ...props, value: '첫 줄\n![](photo.jpg)\n둘째 줄' };
    body.componentDidUpdate();
    expect(body.textarea.setSelectionRange).toHaveBeenCalledWith(18, 18);
    expect(props.onChange).toHaveBeenCalledTimes(1);
  });

  it('asks Decap to re-render when an image is chosen, which Decap skips for anything but value and style changes', () => {
    const props = { value: '본문', classNameWrapper: 'wrapper', mediaPaths: mediaPaths({}), onOpenMediaLibrary: vi.fn() };
    const body = control(props);
    body.openMediaLibrary();
    const [{ controlID }] = props.onOpenMediaLibrary.mock.calls[0];

    expect(body.shouldComponentUpdate({ ...props })).toBe(false);
    expect(body.shouldComponentUpdate({ ...props, value: '본문 더' })).toBe(true);
    expect(body.shouldComponentUpdate({ ...props, classNameWrapper: 'active' })).toBe(true);
    expect(body.shouldComponentUpdate({ ...props, mediaPaths: mediaPaths({ [controlID]: 'photo.jpg' }) })).toBe(true);
  });

  it('keeps the original preview and schema when it replaces the markdown widget', () => {
    const markdown = { control: 'rich editor', preview: 'markdown preview', schema: { modes: {} } };
    const CMS = { getWidget: vi.fn(() => markdown), registerWidget: vi.fn() };
    const win = (userAgent) => ({ navigator: { userAgent }, CMS, createClass: (spec) => spec, h: () => null });

    expect(installPlainBody(win(WINDOWS))).toBe(false);
    expect(CMS.registerWidget).not.toHaveBeenCalled();

    expect(installPlainBody(win(ANDROID))).toBe(true);
    expect(CMS.registerWidget).toHaveBeenCalledWith('markdown', expect.any(Object), 'markdown preview', { modes: {} });
  });
});
