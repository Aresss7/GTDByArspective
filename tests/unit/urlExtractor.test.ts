import { describe, it, expect } from 'vitest';
import { extractLinkUrls } from '../../src/renderer/src/components/MarkdownEditor/urlExtractor';

describe('extractLinkUrls', () => {
  it('extracts autolinks formatted with angle brackets <...>', () => {
    const text = '<https://youtu.be/qBZOHqKPgfw?si=Z3ll4LcHE3kOHyie>\n<https://youtu.be/2LjUOstW4ik?si=O9kZC6f3VION03sf>';
    const urls = extractLinkUrls(text);
    expect(urls).toEqual([
      'https://youtu.be/qBZOHqKPgfw?si=Z3ll4LcHE3kOHyie',
      'https://youtu.be/2LjUOstW4ik?si=O9kZC6f3VION03sf',
    ]);
  });

  it('extracts all 9 links from the user screenshot', () => {
    const text = `
https://youtu.be/qBZOHqKPgfw?si=Z3ll4LcHE3kOHyie
<https://youtu.be/2LjUOstW4ik?si=O9kZC6f3VION03sf>
https://youtu.be/mkMp6Uz40cY?si=7IFrlKliuK1fgLnU
<https://youtu.be/ny5gfzcPpPc?si=bsgQ0ZbFgb4g7Fae>\\
https://www.youtube.com/live/j6Cp2MbxR6g?si=frIEkiKlXd3NF0m3
https://youtu.be/GYcFS\\_7\\_JPM?si=LbPX\\_oZaOOg18mjq
https://www.youtube.com/live/MmjUbj1a7e8
https://www.youtube.com/live/iwZE4OQ7HQU?si=P2Wl58QjNtS9MrnE
https://www.youtube.com/watch?v=9ptHMoOp7AU
    `;
    const urls = extractLinkUrls(text);
    expect(urls.length).toBe(9);
    expect(urls).toContain('https://youtu.be/GYcFS_7_JPM?si=LbPX_oZaOOg18mjq');
    expect(urls).toContain('https://www.youtube.com/watch?v=9ptHMoOp7AU');
  });

  it('extracts markdown links [title](url)', () => {
    const text = 'Check [Demaster Video](https://www.youtube.com/watch?v=dQw4w9WgXcQ) for more info.';
    const urls = extractLinkUrls(text);
    expect(urls).toEqual(['https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
  });

  it('ignores invalid non-http/https protocols', () => {
    const text = 'file:///C:/test.txt javascript:alert(1) data:text/html,abc';
    const urls = extractLinkUrls(text);
    expect(urls).toEqual([]);
  });
});
