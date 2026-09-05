import fs from 'fs';
import { analyzeSentenceIssues } from '../src/core/engine/deterministicRules';

const lines = fs.readFileSync('./fixtures/gec/en.jsonl', 'utf-8').trim().split('\n');
const corpus = lines.map(l => JSON.parse(l));

let totalSpelling = 0;
let detectedSpelling = 0;

let totalGrammar = 0;
let detectedGrammar = 0;

let totalStyle = 0;
let detectedStyle = 0;

let totalPunct = 0;
let detectedPunct = 0;

let totalRepeat = 0;
let detectedRepeat = 0;

let controlCount = 0;
let controlFalsePositives = 0;

const t0 = performance.now();
const results = corpus.map(item => {
  const sentenceNode = {
    id: 's-' + item.id,
    paragraphIndex: 0,
    sentenceIndex: 0,
    text: item.sentence,
    trimmedText: item.sentence,
    startOffset: 0,
    endOffset: item.sentence.length,
    isHeading: false,
    isCodeBlock: false
  };
  
  const issues = analyzeSentenceIssues(sentenceNode as any, {
    maxSentenceLength: 25,
    checkPassive: true,
    checkTypography: true,
    checkRepetition: true,
    checkConfusion: true,
    checkWordiness: true,
    checkPunctuation: true,
    checkSpelling: true
  });
  
  const hasSpelling = issues.some(i => i.category === 'spelling');
  const hasGrammar = issues.some(i => i.category === 'grammar');
  const hasStyle = issues.some(i => i.category === 'wordiness' || i.category === 'passive' || i.category === 'length');
  const hasPunct = issues.some(i => i.category === 'punctuation' || i.category === 'typography');
  const hasRepeat = issues.some(i => i.category === 'repetition');

  if (item.expected_category === 'spelling') {
    totalSpelling++;
    if (hasSpelling) detectedSpelling++;
  } else if (item.expected_category === 'grammar') {
    totalGrammar++;
    if (hasGrammar) detectedGrammar++;
  } else if (item.expected_category === 'style') {
    totalStyle++;
    if (hasStyle) detectedStyle++;
  } else if (item.expected_category === 'punctuation') {
    totalPunct++;
    if (hasPunct) detectedPunct++;
  } else if (item.expected_category === 'repetition') {
    totalRepeat++;
    if (hasRepeat) detectedRepeat++;
  } else if (item.expected_category === 'control') {
    controlCount++;
    if (issues.length > 0) {
      controlFalsePositives++;
    }
  }

  return {
    id: item.id,
    sentence: item.sentence,
    expected_category: item.expected_category,
    detected_count: issues.length,
    detected_categories: issues.map(i => i.category),
    detected_titles: issues.map(i => i.title)
  };
});
const totalElapsedMs = performance.now() - t0;
const perSentenceUs = (totalElapsedMs / corpus.length) * 1000;

console.log('=== TYPESCRIPT REGEX ENGINE BASELINE RESULTS ===');
console.log('Total Sentences:', corpus.length);
console.log('Total Evaluation Wall Time:', totalElapsedMs.toFixed(3), 'ms');
console.log('Mean Per-Sentence Latency:', perSentenceUs.toFixed(1), 'µs');
console.log('');
console.log(`Spelling (${totalSpelling} items): Detected ${detectedSpelling} / ${totalSpelling} (${(detectedSpelling/totalSpelling*100).toFixed(1)}%)`);
console.log(`Grammar (${totalGrammar} items): Detected ${detectedGrammar} / ${totalGrammar} (${(detectedGrammar/totalGrammar*100).toFixed(1)}%)`);
console.log(`Style/Wordiness (${totalStyle} items): Detected ${detectedStyle} / ${totalStyle} (${(detectedStyle/totalStyle*100).toFixed(1)}%)`);
console.log(`Punctuation (${totalPunct} items): Detected ${detectedPunct} / ${totalPunct} (${(detectedPunct/totalPunct*100).toFixed(1)}%)`);
console.log(`Repetition (${totalRepeat} items): Detected ${detectedRepeat} / ${totalRepeat} (${(detectedRepeat/totalRepeat*100).toFixed(1)}%)`);
console.log(`Controls (${controlCount} items): Clean (0 FP) ${controlCount - controlFalsePositives} / ${controlCount} (FP rate: ${(controlFalsePositives/controlCount*100).toFixed(1)}%)`);
console.log('');
console.log('Details on missed grammar items:');
results.filter(r => r.expected_category === 'grammar' && !r.detected_categories.includes('grammar')).forEach(r => {
  console.log(`  - [ID ${r.id}] "${r.sentence}" -> caught: [${r.detected_categories.join(', ')}]`);
});
