import { describe, it, expect } from 'vitest';
import { parseSections } from './promptSections';

describe('parseSections', () => {
  it('全セクションが揃った正常系を抽出できる', () => {
    const raw = `
<!-- @section:core -->
core body
<!-- @endsection:core -->

<!-- @section:initial -->
initial body
<!-- @endsection:initial -->

<!-- @section:continuing -->
continuing body
<!-- @endsection:continuing -->

<!-- @section:backside -->
backside body
<!-- @endsection:backside -->
`;
    const result = parseSections(raw);
    expect(result.sections.core).toBe('core body');
    expect(result.sections.initial).toBe('initial body');
    expect(result.sections.continuing).toBe('continuing body');
    expect(result.sections.backside).toBe('backside body');
    expect(result.warnings).toEqual([]);
    expect(result.unknownSections).toEqual([]);
  });

  it('一部セクションが欠けていても他は無事に取れる', () => {
    const raw = `
<!-- @section:core -->
core only
<!-- @endsection:core -->
`;
    const result = parseSections(raw);
    expect(result.sections.core).toBe('core only');
    expect(result.sections.initial).toBe('');
    expect(result.sections.continuing).toBe('');
    expect(result.sections.backside).toBe('');
  });

  it('同一IDが複数出現したら順序通り連結される', () => {
    const raw = `
<!-- @section:core -->
first chunk
<!-- @endsection:core -->

<!-- @section:initial -->
initial
<!-- @endsection:initial -->

<!-- @section:core -->
second chunk
<!-- @endsection:core -->
`;
    const result = parseSections(raw);
    expect(result.sections.core).toBe('first chunk\n\nsecond chunk');
    expect(result.sections.initial).toBe('initial');
  });

  it('閉じタグが抜けていたら warnings に積まれる', () => {
    const raw = `
<!-- @section:core -->
unclosed body without end tag

<!-- @section:initial -->
initial body
<!-- @endsection:initial -->
`;
    const result = parseSections(raw);
    expect(result.sections.initial).toBe('initial body');
    // core は閉じタグ抜けなのでマッチせず空のまま（leftover として吸収される可能性はある）
    expect(result.warnings.some(w => w.includes('Unclosed'))).toBe(true);
  });

  it('未知セクション名は unknownSections に積まれる', () => {
    const raw = `
<!-- @section:core -->
ok
<!-- @endsection:core -->

<!-- @section:misspelled -->
typo
<!-- @endsection:misspelled -->
`;
    const result = parseSections(raw);
    expect(result.sections.core).toBe('ok');
    expect(result.unknownSections).toContain('misspelled');
    expect(result.warnings.some(w => w.includes('misspelled'))).toBe(true);
  });

  it('マーカー外の本文は core 末尾に結合される', () => {
    const raw = `
leftover line 1
leftover line 2

<!-- @section:core -->
core body
<!-- @endsection:core -->
`;
    const result = parseSections(raw);
    expect(result.sections.core).toContain('core body');
    expect(result.sections.core).toContain('leftover line 1');
    expect(result.sections.core).toContain('leftover line 2');
  });

  it('マーカー間の "---" 区切りは leftover に取り込まれない', () => {
    const raw = `
<!-- @section:core -->
core body
<!-- @endsection:core -->

---

<!-- @section:initial -->
initial body
<!-- @endsection:initial -->
`;
    const result = parseSections(raw);
    expect(result.sections.core).toBe('core body');
    expect(result.sections.initial).toBe('initial body');
  });

  it('実プロンプト相当のレイアウトを処理できる', () => {
    const raw = `
<!-- @section:core -->
# 命令
ボクは「めし助」
<!-- @endsection:core -->

---

<!-- @section:initial -->
## 【初回フォームモード】
ブロック1: キッチン装備
<!-- @endsection:initial -->

---

<!-- @section:continuing -->
## 【継続モード】
Step 0 制約フィルタ
<!-- @endsection:continuing -->

---

<!-- @section:backside -->
## 内部実装メモ
profile.json スキーマ
<!-- @endsection:backside -->

---

<!-- @section:core -->
## よくある失敗パターン集
パターン1: 一人称崩れ
<!-- @endsection:core -->
`;
    const result = parseSections(raw);
    expect(result.sections.core).toContain('# 命令');
    expect(result.sections.core).toContain('よくある失敗パターン集');
    expect(result.sections.initial).toContain('初回フォームモード');
    expect(result.sections.continuing).toContain('継続モード');
    expect(result.sections.backside).toContain('内部実装メモ');
    expect(result.warnings).toEqual([]);
  });
});
