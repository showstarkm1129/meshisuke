/**
 * システムプロンプトのセクション分割パーサ
 *
 * `<!-- @section:NAME -->` ... `<!-- @endsection:NAME -->` で囲まれたブロックを抽出する。
 * 同じセクション名が複数回出現した場合は、出現順に "\n\n" で連結する。
 * マーカー外の本文は破棄せず、`core` に末尾結合される（フォールバック）。
 */

export type SectionId = 'core' | 'initial' | 'continuing' | 'backside';

const KNOWN_SECTIONS: ReadonlyArray<SectionId> = ['core', 'initial', 'continuing', 'backside'];

export interface ParsedSections {
  /** セクションID → そのセクションの本文（マーカー除去済み）。複数出現時は連結。 */
  sections: Record<SectionId, string>;
  /** 既知でないセクション名（typo 等の検出用） */
  unknownSections: string[];
  /** パース上の警告（閉じタグ抜け等）。例外は投げない */
  warnings: string[];
}

const SECTION_REGEX = /<!--\s*@section:([\w-]+)\s*-->([\s\S]*?)<!--\s*@endsection:\1\s*-->/g;

function isKnownSection(name: string): name is SectionId {
  return (KNOWN_SECTIONS as ReadonlyArray<string>).includes(name);
}

/**
 * マーカー付きテキストをセクション辞書に分解する。
 * パースに失敗してもセクション辞書を「空文字埋め」で返し、warnings に積む。
 */
export function parseSections(raw: string): ParsedSections {
  const sections: Record<SectionId, string> = {
    core: '',
    initial: '',
    continuing: '',
    backside: '',
  };
  const unknownSections: string[] = [];
  const warnings: string[] = [];

  // 1. すべてのマッチを抽出
  const matches = Array.from(raw.matchAll(SECTION_REGEX));

  for (const match of matches) {
    const name = match[1];
    const body = match[2].trim();
    if (isKnownSection(name)) {
      sections[name] = sections[name] ? `${sections[name]}\n\n${body}` : body;
    } else {
      if (!unknownSections.includes(name)) unknownSections.push(name);
      warnings.push(`Unknown section: ${name}`);
    }
  }

  // 2. 開きタグだけ・閉じタグだけの検出（簡易: 全マッチ後に未マッチ部分を見て判定）
  const stripped = raw.replace(SECTION_REGEX, '');
  const danglingOpen = stripped.match(/<!--\s*@section:([\w-]+)\s*-->/g);
  const danglingClose = stripped.match(/<!--\s*@endsection:([\w-]+)\s*-->/g);
  if (danglingOpen) {
    for (const tag of danglingOpen) warnings.push(`Unclosed section tag: ${tag}`);
  }
  if (danglingClose) {
    for (const tag of danglingClose) warnings.push(`Orphan endsection tag: ${tag}`);
  }

  // 3. マーカー外の本文を core 末尾に結合（フォールバック）
  //    開閉タグも除去した残りテキストから空行スパンや区切り線を除いた実質テキストを拾う
  const leftover = stripped
    .replace(/<!--\s*@(end)?section:[\w-]+\s*-->/g, '')
    .split(/\n/)
    .filter((line) => line.trim().length > 0 && line.trim() !== '---')
    .join('\n')
    .trim();
  if (leftover.length > 0) {
    sections.core = sections.core ? `${sections.core}\n\n${leftover}` : leftover;
  }

  return { sections, unknownSections, warnings };
}
