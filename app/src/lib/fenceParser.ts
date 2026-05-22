export type FenceBlock =
  | { kind: 'markdown'; payload: string }
  | { kind: 'pantry'; payload: string }
  | { kind: 'choices'; payload: string[] };

export function parseFenceBlocks(text: string): FenceBlock[] {
  const blocks: FenceBlock[] = [];
  
  const regex = /:::(pantry|choices)\s*([\s\S]*?)\s*:::/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        kind: 'markdown',
        payload: text.slice(lastIndex, match.index)
      });
    }
    
    const kind = match[1] as 'pantry' | 'choices';
    const payloadRaw = match[2].trim();
    
    if (kind === 'choices') {
      blocks.push({
        kind: 'choices',
        payload: payloadRaw.split('|').map(s => s.trim()).filter(Boolean)
      });
    } else {
      blocks.push({
        kind: 'pantry',
        payload: payloadRaw
      });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    blocks.push({
      kind: 'markdown',
      payload: text.slice(lastIndex)
    });
  }
  
  return blocks;
}
