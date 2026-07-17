(function() {
    'use strict';

    // ─── DOM refs ──────────────────────────────────────────────
    const inputArea = document.getElementById('inputArea');
    const outputArea = document.getElementById('outputArea');
    const compressBtn = document.getElementById('compressBtn');
    const importBtn = document.getElementById('importBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const saveBtn = document.getElementById('saveBtn');
    const fileInput = document.getElementById('fileInput');
    const filenameInput = document.getElementById('filenameInput');
    const extSelect = document.getElementById('extSelect');
    const chkLive = document.getElementById('chkLive');
    const processingIndicator = document.getElementById('processingIndicator');

    const chkStopwords = document.getElementById('chkStopwords');
    const chkConj = document.getElementById('chkConj');
    const chkSuffix = document.getElementById('chkSuffix');
    const chkMarkdown = document.getElementById('chkMarkdown');
    const chkPunct = document.getElementById('chkPunct');
    const chkSpace = document.getElementById('chkSpace');
    const chkNumeric = document.getElementById('chkNumeric');
    const chkTwoPass = document.getElementById('chkTwoPass');
    const chkSlimDown = document.getElementById('chkSlimDown');
    const chkHuffman = document.getElementById('chkHuffman');
    const aliasRadios = document.querySelectorAll('input[name="aliasMode"]');

    const inputTokens = document.getElementById('inputTokens');
    const outputTokens = document.getElementById('outputTokens');
    const inputCharLabel = document.getElementById('inputCharLabel');
    const outputCharLabel = document.getElementById('outputCharLabel');
    const ratioBadge = document.getElementById('ratioBadge');
    const savedPercent = document.getElementById('savedPercent');
    const contextLoss = document.getElementById('contextLoss');
    const slimdownIndicator = document.getElementById('slimdownIndicator');
    const huffmanIndicator = document.getElementById('huffmanIndicator');

    // ─── TOAST ──────────────────────────────────────────────────
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const emoji = type === 'success' ? '✔' : type === 'error' ? '✖' : '◈';
        toast.innerHTML = `<span class="emoji">${emoji}</span> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('exit');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ─── TOKEN ESTIMATOR ───────────────────────────────────────
    function estimateTokens(text) {
        if (!text) return 0;
        return Math.max(1, Math.floor(text.length / 4));
    }

    // ─── CONTEXT LOSS ESTIMATOR ──────────────────────────────
    function computeContextLoss(opts) {
        let loss = 0;
        if (opts.stopwords) loss += 2;
        if (opts.conj) loss += 1;
        if (opts.suffix) loss += 1;
        if (opts.markdown) loss += 0.5;
        if (opts.punct) loss += 8;
        if (opts.space) loss += 0.5;
        if (opts.numeric) loss += 2;
        if (opts.aliasMode === 'inline') loss += 1;
        if (opts.slimdown) loss -= 2;
        if (opts.huffman) loss -= 1;
        loss = Math.min(25, Math.max(0, loss));
        return Math.round(loss * 10) / 10;
    }

    // ─── RECOMMENDATION PRESETS ────────────────────────────────
    const RECOMMENDATION_PRESETS = {
        none: {
            label: 'Minimal',
            title: 'Minimal Mode',
            detail: 'All filters off — pure passthrough, no compression overhead.',
            savings: 0,
            loss: 0,
            settings: {
                stopwords: false,
                conj: false,
                suffix: false,
                markdown: false,
                punct: false,
                space: false,
                numeric: false,
                alias: 'none',
                twoPass: false,
                slimdown: false,
                huffman: false
            }
        },
        classic: {
            label: 'Classic',
            title: 'Classic Mode',
            detail: 'Stopwords · conjunctions · suffix crunch · Markdown · whitespace · two‑pass · inline alias.',
            savings: 21,
            loss: 6,
            settings: {
                stopwords: true,
                conj: true,
                suffix: true,
                markdown: true,
                punct: false,
                space: true,
                numeric: false,
                alias: 'inline',
                twoPass: true,
                slimdown: false,
                huffman: false
            }
        },
        slimdown: {
            label: 'SlimDown',
            title: 'SlimDown Mode',
            detail: 'Stopwords · conjunctions · suffix crunch · Markdown · whitespace · numeric · SlimDown · two‑pass · inline alias.',
            savings: 55,
            loss: 3,
            settings: {
                stopwords: true,
                conj: true,
                suffix: true,
                markdown: true,
                punct: false,
                space: true,
                numeric: true,
                alias: 'inline',
                twoPass: true,
                slimdown: true,
                huffman: false
            }
        },
        huffman: {
            label: 'Huffman',
            title: 'Huffman Mode',
            detail: 'Stopwords · conjunctions · Markdown · whitespace · Huffman codebook.',
            savings: 55,
            loss: 3,
            settings: {
                stopwords: true,
                conj: true,
                suffix: false,
                markdown: true,
                punct: false,
                space: true,
                numeric: false,
                alias: 'none',
                twoPass: false,
                slimdown: false,
                huffman: true
            }
        }
    };

    // ─── DETERMINE RECOMMENDATION ──────────────────────────────
    function getRecommendation(tokens) {
        if (tokens < 2000) {
            return { key: 'none', ...RECOMMENDATION_PRESETS.none };
        } else if (tokens < 8000) {
            return { key: 'classic', ...RECOMMENDATION_PRESETS.classic };
        } else if (tokens < 500000) {
            return { key: 'slimdown', ...RECOMMENDATION_PRESETS.slimdown };
        } else {
            return { key: 'huffman', ...RECOMMENDATION_PRESETS.huffman };
        }
    }

    // ─── APPLY RECOMMENDATION SETTINGS ─────────────────────────
    let applyingRecommendation = false;
    let settingsAreRecommended = false;

    function applyRecommendationSettings(settings) {
        applyingRecommendation = true;
        chkStopwords.checked = settings.stopwords;
        chkConj.checked = settings.conj;
        chkSuffix.checked = settings.suffix;
        chkMarkdown.checked = settings.markdown;
        chkPunct.checked = settings.punct;
        chkSpace.checked = settings.space;
        chkNumeric.checked = settings.numeric;
        chkTwoPass.checked = settings.twoPass;
        chkSlimDown.checked = settings.slimdown;
        chkHuffman.checked = settings.huffman;
        aliasRadios.forEach(r => {
            r.checked = (r.value === settings.alias);
        });
        applyingRecommendation = false;
        settingsAreRecommended = true;
    }

    // ─── UPDATE ADAPTIVE BANNER ────────────────────────────────
    function updateAdaptiveBanner(tokens) {
        const banner = document.getElementById('adaptiveBanner');
        if (tokens === 0) {
            banner.classList.add('hidden');
            return;
        }
        const rec = getRecommendation(tokens);
        banner.classList.remove('hidden');
        document.getElementById('bannerTitle').textContent = 'Recommended: ' + rec.title;
        document.getElementById('bannerDetail').textContent = rec.detail;
        document.getElementById('bannerSavings').textContent = rec.savings + '%';
        document.getElementById('bannerLoss').textContent = rec.loss + '%';
    }

    // ─── FORCE APPLY RECOMMENDATION ─────────────────────────────
    function forceApplyRecommendation(tokens) {
        if (tokens === 0) return;
        const rec = getRecommendation(tokens);
        applyRecommendationSettings(rec.settings);
        updateAdaptiveBanner(tokens);
    }

    // ─── HELPERS ─────────────────────────────────────────────────
    function getAliasMode() {
        for (const r of aliasRadios)
            if (r.checked) return r.value;
        return 'classic';
    }

    function getMaxAliases(textLength, slimdown, passNum) {
        let base = slimdown ? 14 : 8;
        if (textLength > 200000) base += 24;
        else if (textLength > 100000) base += 16;
        else if (textLength > 50000) base += 10;
        else if (textLength > 20000) base += 6;
        else if (textLength > 8000) base += 2;
        if (passNum === 2) base = Math.floor(base * 0.5);
        return Math.min(52, Math.max(6, base));
    }

    // ─── HUFFMAN CODEBOOK GENERATOR ──────────────────────────
    function generateCodebook(freqMap) {
        // freqMap: word (original case) -> count
        const entries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
        const codebook = {}; // word -> code
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

        function toBase62(num) {
            if (num === 0) return chars[0];
            let s = '';
            while (num > 0) {
                s = chars[num % 62] + s;
                num = Math.floor(num / 62);
            }
            return s;
        }
        for (let i = 0; i < entries.length; i++) {
            const word = entries[i][0];
            const code = toBase62(i);
            codebook[word] = code;
        }
        return codebook;
    }

    // ─── COMPRESSION PIPELINE STEPS ─────────────────────────────

    // Each step receives (text, opts, context) and returns transformed text.
    // 'context' may include { blocks, aliases, footer, generation }.

    function protectCodeBlocks(text) {
        const blocks = [];
        let result = text;
        result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            blocks.push({ type: 'block', lang: lang || '', code });
            return `__PROTECTED_${blocks.length - 1}__`;
        });
        result = result.replace(/`([^`]+)`/g, (match, code) => {
            blocks.push({ type: 'inline', code });
            return `__PROTECTED_${blocks.length - 1}__`;
        });
        return { text: result, blocks };
    }

    function restoreProtectedBlocks(text, blocks) {
        return text.replace(/__PROTECTED_(\d+)__/g, (match, idx) => {
            const b = blocks[parseInt(idx)];
            if (!b) return match;
            if (b.type === 'block') return `@{${b.lang}|${b.code}}`;
            else return `'${b.code}'`;
        });
    }

    function applyMarkdown(text, opts) {
        if (!opts.markdown) return text;
        let t = text;
        t = t.replace(/^(\s*)(#+)\s+/gm, '$1$2');
        t = t.replace(/^(\s*)([-+*])\s+/gm, '$1$2');
        t = t.replace(/^(\s*)>\s+/gm, '$1>');
        t = t.replace(/\*\*([^*]+)\*\*/g, '*$1*');
        t = t.replace(/\*([^*]+)\*/g, '_$1_');
        t = t.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '{$1|$2}');
        t = t.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '!{$1|$2}');
        t = t.replace(/^(\s*)-\s+/gm, '$1•');
        t = t.replace(/\s*\|\s*/g, '|');
        t = t.replace(/---/g, '—');
        return t;
    }

    function applyPunctuationRemoval(text, opts) {
        if (!opts.punct) return text;
        return text.replace(/[.,;:?!]+/g, ' ');
    }

    function applyStopwords(text, opts) {
        if (!opts.stopwords) return text;
        let sw =
            /\b(the|a|an|of|for|with|from|is|are|was|were|have|has|had|to|at|by|in|on|be|been|being|this|that|these|those|which|what|who|whom|whose|does|did|do|will|would|could|should|may|might|must|shall|can|not|but|so|for|nor|yet|as|into|upon|onto|about|than|then|thence|there|therefore|therein|thereof|thereon|thereto|therewith|these|they|thou|though|through|throughout|thru|till|unless|unto|up|upon|us|we|when|where|whereby|wherein|whereupon|wherever|whether|which|while|whilst|with|without|would)\b/gi;
        if (opts.slimdown) {
            sw =
                /\b(the|a|an|of|for|with|from|is|are|was|were|have|has|had|to|at|by|in|on|be|been|being|this|that|these|those|which|what|who|whom|whose|does|did|do|will|would|could|should|may|might|must|shall|can|not|but|so|for|nor|yet|as|into|upon|onto|about|than|then|thence|there|therefore|therein|thereof|thereon|thereto|therewith|these|they|thou|though|through|throughout|thru|till|unless|unto|up|upon|us|we|when|where|whereby|wherein|whereupon|wherever|whether|which|while|whilst|with|without|would|any|every|some|all|both|each|few|many|more|most|other|some|such|no|nor|too|very|can|will|just|should|now|then|than|that|thence|then|thence|thereafter|thereby|therefore|therein|thereof|thereon|thereto|therewith|these|they|thou|though|through|throughout|thru|till|unless|unto|up|upon|us|we|when|where|whereby|wherein|whereupon|wherever|whether|which|while|whilst|with|without|would)\b/gi;
        }
        return text.replace(sw, '');
    }

    function applyConjunctions(text, opts) {
        if (!opts.conj) return text;
        let t = text;
        t = t.replace(/\b(and|or|but|nor|for|so|yet)\b/gi, ' ');
        t = t.replace(/\bto\s+(\w{3,})\b/gi, '$1');
        t = t.replace(/\bof\s+the\b/gi, ' ');
        if (opts.slimdown) {
            t = t.replace(/\b(because|since|although|though|while|whereas|unless|until)\b/gi, ' ');
            t = t.replace(/\b(if|then|else|when|whenever|where|wherever)\b/gi, ' ');
        }
        return t;
    }

    function applySuffixCrunch(text, opts) {
        if (!opts.suffix) return text;
        let t = text;
        t = t.replace(/\b(\w{4,})ing\b/gi, '$1g');
        t = t.replace(/\b(\w{4,})tion\b/gi, '$1n');
        t = t.replace(/\b(\w{4,})sion\b/gi, '$1n');
        t = t.replace(/\b(\w{4,})able\b/gi, '$1bl');
        t = t.replace(/\b(\w{4,})ible\b/gi, '$1bl');
        t = t.replace(/\b(\w{4,})ment\b/gi, '$1mt');
        t = t.replace(/\b(\w{4,})ness\b/gi, '$1ns');
        t = t.replace(/\b(\w{4,})ology\b/gi, '$1ol');
        t = t.replace(/\b(\w{4,})graphy\b/gi, '$1gr');
        t = t.replace(/\b(\w{4,})phone\b/gi, '$1ph');
        t = t.replace(/because/gi, 'bc');
        t = t.replace(/though/gi, 'tho');
        t = t.replace(/through/gi, 'thru');
        t = t.replace(/without/gi, 'wout');
        t = t.replace(/between/gi, 'btwn');
        t = t.replace(/however/gi, 'howev');
        t = t.replace(/therefore/gi, 'thrf');
        t = t.replace(/https?:\/\//gi, '//');
        if (opts.slimdown) {
            t = t.replace(/\b(\w{4,})ly\b/gi, '$1l');
            t = t.replace(/\b(\w{4,})ful\b/gi, '$1fl');
            t = t.replace(/\b(\w{4,})ous\b/gi, '$1us');
            t = t.replace(/\b(\w{4,})ity\b/gi, '$1ty');
            t = t.replace(/\b(\w{4,})ism\b/gi, '$1sm');
            t = t.replace(/\b(\w{4,})ist\b/gi, '$1st');
            t = t.replace(/\b(\w{4,})ive\b/gi, '$1iv');
        }
        return t;
    }

    function applyNumericCompression(text, opts) {
        if (!opts.numeric) return text;
        let t = text;
        t = t.replace(/\b(\d{1,3})(?:,)(\d{3})\b/g, '$1k');
        t = t.replace(/\b(\d+)%\b/g, '$1p');
        t = t.replace(/\b(\d+)\+ tables\b/gi, '$1+tbl');
        t = t.replace(/\b([A-Za-z]{3})\s+(\d{4})\b/g, '$1$2');
        t = t.replace(/\b(\d+)\s*\/\s*(mo|month|yr|year|gb|mb)\b/gi, '$1$2');
        t = t.replace(/\b(\d+)\s*-\s*(\d+)\s*([MB])\b/gi, '$1-$2$3');
        if (opts.slimdown) {
            t = t.replace(/\b(\d+)\s*(thousand|k)\b/gi, '$1k');
            t = t.replace(/\b(\d+)\s*(million|m)\b/gi, '$1m');
            t = t.replace(/\b(\d+)\s*(billion|b)\b/gi, '$1b');
            t = t.replace(/\b(\d+)\s*(percent|pct)\b/gi, '$1p');
        }
        return t;
    }

    function applyHuffmanCompression(text, opts, generation) {
        if (!opts.huffman) return { text, header: '', codebook: null };
        const words = text.match(/\b[a-zA-Z]+\b/g) || [];
        const freq = {};
        for (const w of words) {
            freq[w] = (freq[w] || 0) + 1; // preserve original case
        }
        const codebook = generateCodebook(freq);
        const wordRegex = /\b[a-zA-Z]+\b/g;
        let result = text.replace(wordRegex, (match) => {
            if (codebook.hasOwnProperty(match)) {
                return codebook[match];
            }
            return match;
        });
        // Build dictionary header (code -> original word)
        const dict = {};
        for (const [word, code] of Object.entries(codebook)) {
            dict[code] = word;
        }
        const jsonDict = JSON.stringify(dict);
        const header = `;; dictionary = ${jsonDict}\n;; To decompress, replace each code with its word from the dictionary.\n`;
        return { text: result, header, codebook };
    }

    function applyAliasCompression(text, opts, generation) {
        const aliasMode = opts.aliasMode;
        if (aliasMode === 'none' || opts.huffman) return { text, footer: '', usedAliases: {} };

        const slimdown = opts.slimdown;
        const twoPass = opts.twoPass;
        let usedAliases = {};
        let footer = '';
        let result = text;
        const baseThreshold = slimdown ? 1 : (text.length > 10000 ? 3 : 2);

        function runAliasPass(t, passNum) {
            let r = t;
            const words = r.match(/\b[a-zA-Z]{4,}\b/g) || [];
            const allWords = r.match(/\b[a-zA-Z]+\b/g) || [];
            const bigrams = [];
            for (let i = 0; i < allWords.length - 1; i++) {
                const bg = (allWords[i] + ' ' + allWords[i + 1]).toLowerCase();
                if (bg.length >= 8) bigrams.push(bg);
            }
            const freq = {};
            words.forEach(w => { const key = w.toLowerCase();
                freq[key] = (freq[key] || 0) + 1; });
            bigrams.forEach(b => { const key = b.toLowerCase();
                freq[key] = (freq[key] || 0) + 1; });

            const minLen = slimdown ? 3 : 4;
            const threshold = (passNum === 1) ? baseThreshold : Math.max(baseThreshold, slimdown ? 2 : 3);
            const sorted = Object.entries(freq)
                .filter(([word, count]) => count >= threshold && word.length >= minLen)
                .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);

            const maxAliases = getMaxAliases(t.length, slimdown, passNum);
            const top = sorted.slice(0, maxAliases);
            const used = new Set();
            const aliases = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
            let idx = 0;

            top.forEach(([phrase, count]) => {
                if (phrase.length < minLen || used.has(phrase)) return;
                const alias = aliases[idx % aliases.length];
                idx++;
                used.add(phrase);
                const regex = new RegExp('\\b' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                usedAliases[alias] = phrase;

                if (aliasMode === 'inline' && passNum === 1) {
                    let first = true;
                    r = r.replace(regex, (match) => {
                        if (first) {
                            first = false;
                            return `${match} (${alias})`;
                        }
                        return alias;
                    });
                } else {
                    r = r.replace(regex, alias);
                    footer += (footer ? ';' : '') + alias + '=' + phrase;
                }
            });
            return r;
        }

        result = runAliasPass(result, 1);
        if (twoPass) {
            result = runAliasPass(result, 2);
        }

        return { text: result, footer, usedAliases };
    }

    function applyWhitespaceCollapse(text, opts) {
        if (!opts.space) return text.replace(/ +/g, ' ');
        let t = text;
        t = t.replace(/\n\s*\n/g, ' | ');
        t = t.replace(/\n/g, ' ');
        t = t.replace(/ +/g, ' ');
        t = t.replace(/\s*#/g, '#');
        t = t.replace(/#\s+/g, '#');
        t = t.replace(/\s*\*/g, '*');
        t = t.replace(/\*\s+/g, '*');
        t = t.replace(/\s*_/g, '_');
        t = t.replace(/_\s+/g, '_');
        t = t.replace(/\s*\{/g, '{');
        t = t.replace(/\}\s*/g, '}');
        t = t.replace(/\s*\|\s*/g, '|');
        t = t.replace(/\s*!/g, '!');
        t = t.replace(/!\s*/g, '!');
        t = t.replace(/\s*-\s*/g, '-');
        t = t.replace(/\s*>\s*/g, '>');
        return t.trim();
    }

    function buildSlimDownHeader(compressedText, aliasMap, opts) {
        // unchanged from original
        const lines = [];
        const sep = '══════════════════════════════════════════════════════════════════';
        lines.push(';; ═' + sep + '═');
        lines.push(';;  SLIMDOWN v2 · SEMANTIC COMPRESSION PROTOCOL');
        lines.push(';; ═' + sep + '═');
        lines.push(';;');
        lines.push(';;  This document uses semantic compression (~55-60% token reduction).');
        lines.push(';;  The original text has been compressed using the following rules:');
        lines.push(';;');
        lines.push(';;  [RULES]');
        const rules = [];
        if (opts.stopwords) rules.push('  • Stopwords (the, a, an, of, for, with, etc.) removed');
        if (opts.conj) rules.push('  • Conjunctions (and, or, but, etc.) inferred from context');
        if (opts.suffix) rules.push(
            '  • Suffix compression: -ing→g, -tion→n, -able→bl, -ment→mt, -ly→l, -ful→fl'
        );
        if (opts.punct) rules.push('  • All punctuation replaced with spaces');
        if (opts.numeric) rules.push('  • Numbers: k=thousand, p=percent, m=million, b=billion');
        if (opts.markdown) rules.push('  • Markdown symbols compressed (#Header, •item, {link})');
        if (opts.space) rules.push('  • Whitespace collapsed, newlines → spaces');
        if (opts.aliasMode !== 'none') rules.push(
            `  • Aliases: ${Object.keys(aliasMap).length} terms replaced with single-letter codes`
        );
        if (opts.twoPass) rules.push('  • Two-pass alias compression applied');
        lines.push(...rules.map(r => ';; ' + r));
        lines.push(';;');
        lines.push(';;  [ABBREVIATIONS]');
        if (Object.keys(aliasMap).length > 0) {
            const entries = Object.entries(aliasMap).slice(0, 16);
            const parts = entries.map(([k, v]) => `  ${k} = "${v}"`);
            lines.push(...parts.map(p => ';; ' + p));
            if (entries.length < Object.keys(aliasMap).length) {
                lines.push(';;  ... and ' + (Object.keys(aliasMap).length - entries.length) +
                    ' more aliases in text');
            }
        } else {
            lines.push(';;  (No aliases used)');
        }
        lines.push(';;');
        lines.push(';;  [DECODER INSTRUCTION]');
        lines.push(
            ';;  To reconstruct the original meaning: read the compressed text, expand'
        );
        lines.push(
            ';;  abbreviations, restore function words (articles, conjunctions),'
        );
        lines.push(';;  infer sentence boundaries from spacing, and use context to fill gaps.');
        lines.push(';;  The alias codes are defined above and inline in the text.');
        lines.push(';;');
        lines.push(';;  [METADATA]');
        lines.push(';;  • Compression mode: SlimDown v2 (experimental)');
        lines.push(';;  • Aliases used: ' + Object.keys(aliasMap).length);
        lines.push(';;  • Two-pass: ' + (opts.twoPass ? 'yes' : 'no'));
        lines.push(';;  • Token reduction: target ~55-60%');
        lines.push(';; ═' + sep + '═');
        lines.push(';;');
        return lines.join('\n');
    }

    // ─── MAIN COMPRESS (orchestrator) ─────────────────────────
    function compress(text, opts, generation) {
        if (!text) return '';

        // Check cancellation
        function isCancelled() {
            return (generation !== undefined && generation !== currentGeneration);
        }

        // Step 1: protect code blocks
        let { text: t, blocks } = protectCodeBlocks(text);
        if (isCancelled()) return '';

        // Step 2: Markdown
        t = applyMarkdown(t, opts);
        if (isCancelled()) return '';

        // Step 3: Punctuation
        t = applyPunctuationRemoval(t, opts);
        if (isCancelled()) return '';

        // Step 4: Stopwords
        t = applyStopwords(t, opts);
        if (isCancelled()) return '';

        // Step 5: Conjunctions
        t = applyConjunctions(t, opts);
        if (isCancelled()) return '';

        // Step 6: Suffix crunch
        t = applySuffixCrunch(t, opts);
        if (isCancelled()) return '';

        // Step 7: Numeric
        t = applyNumericCompression(t, opts);
        if (isCancelled()) return '';

        // Step 8: Huffman
        let huffmanHeader = '';
        let codebook = null;
        if (opts.huffman) {
            const result = applyHuffmanCompression(t, opts, generation);
            if (isCancelled()) return '';
            t = result.text;
            huffmanHeader = result.header;
            codebook = result.codebook;
        }

        // Step 9: Alias compression
        let aliasResult;
        if (!opts.huffman) {
            aliasResult = applyAliasCompression(t, opts, generation);
            if (isCancelled()) return '';
            t = aliasResult.text;
        } else {
            aliasResult = { footer: '', usedAliases: {} };
        }

        // Step 10: Whitespace
        t = applyWhitespaceCollapse(t, opts);
        if (isCancelled()) return '';

        // Step 11: Restore protected blocks
        t = restoreProtectedBlocks(t, blocks);
        if (isCancelled()) return '';

        // Step 12: Append footer (if classic alias and not huffman)
        let footer = '';
        if (!opts.huffman && opts.aliasMode === 'classic' && aliasResult.footer) {
            footer = ' ;; ' + aliasResult.footer;
        }
        t = t + footer;
        t = t.replace(/ +/g, ' ').trim();

        // Step 13: Add headers
        let header = '';
        if (opts.huffman) {
            header = huffmanHeader;
        } else if (opts.slimdown) {
            header = buildSlimDownHeader(t, aliasResult.usedAliases, opts);
        }

        return header ? header + '\n\n' + t : t;
    }

    // ─── GET OPTIONS ─────────────────────────────────────────────
    function getOptions() {
        return {
            stopwords: chkStopwords.checked,
            conj: chkConj.checked,
            suffix: chkSuffix.checked,
            markdown: chkMarkdown.checked,
            punct: chkPunct.checked,
            space: chkSpace.checked,
            numeric: chkNumeric.checked,
            aliasMode: getAliasMode(),
            twoPass: chkTwoPass.checked,
            slimdown: chkSlimDown.checked,
            huffman: chkHuffman.checked
        };
    }

    // ─── UPDATE STATS ────────────────────────────────────────────
    function updateStats(input, output, loss) {
        const inC = input.length,
            outC = output.length;
        const inT = estimateTokens(input),
            outT = estimateTokens(output);
        inputTokens.textContent = inT;
        outputTokens.textContent = outT;
        inputCharLabel.textContent = `${inC} chars`;
        outputCharLabel.textContent = `${outC} chars`;

        updateAdaptiveBanner(inT);

        if (outC === 0 || inC === 0) {
            ratioBadge.textContent = '—';
            savedPercent.textContent = '0';
            contextLoss.textContent = '0';
            return;
        }
        const pct = Math.round((1 - outT / inT) * 100);
        ratioBadge.textContent = `${outT} / ${inT} tokens`;
        savedPercent.textContent = pct;
        contextLoss.textContent = loss;
    }

    // ─── COMPRESS EXECUTION WITH CANCELLATION ──────────────────
    let currentGeneration = 0;
    let isCompressing = false;
    let pendingCompress = false;

    function runCompress() {
        if (isCompressing) {
            pendingCompress = true;
            return;
        }

        const input = inputArea.value;
        if (!input) {
            outputArea.value = '';
            updateStats('', '', 0);
            slimdownIndicator.style.display = 'none';
            huffmanIndicator.style.display = 'none';
            return;
        }

        const opts = getOptions();
        const generation = ++currentGeneration;
        isCompressing = true;
        processingIndicator.classList.add('active');

        // Use setTimeout to yield UI
        setTimeout(() => {
            try {
                // Check if cancelled before starting
                if (generation !== currentGeneration) {
                    isCompressing = false;
                    processingIndicator.classList.remove('active');
                    return;
                }
                const output = compress(input, opts, generation);
                // After compression, check again
                if (generation !== currentGeneration) {
                    // cancelled during processing – discard
                    isCompressing = false;
                    processingIndicator.classList.remove('active');
                    return;
                }
                const loss = computeContextLoss(opts);
                outputArea.value = output;
                updateStats(input, output, loss);

                if (opts.huffman) {
                    huffmanIndicator.style.display = 'inline-block';
                    slimdownIndicator.style.display = 'none';
                } else if (opts.slimdown) {
                    slimdownIndicator.style.display = 'inline-block';
                    huffmanIndicator.style.display = 'none';
                } else {
                    slimdownIndicator.style.display = 'none';
                    huffmanIndicator.style.display = 'none';
                }
            } catch (err) {
                showToast('Compression error: ' + err.message, 'error');
            } finally {
                isCompressing = false;
                processingIndicator.classList.remove('active');
                if (pendingCompress) {
                    pendingCompress = false;
                    runCompress();
                }
            }
        }, 20);
    }

    // ─── TRIGGER ────────────────────────────────────────────────
    let compressTimer;

    function triggerCompress() {
        if (chkLive.checked) {
            clearTimeout(compressTimer);
            compressTimer = setTimeout(runCompress, 600);
        }
    }

    // ─── FILE IMPORT ─────────────────────────────────────────────
    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            inputArea.value = ev.target.result;
            const tokens = estimateTokens(inputArea.value);
            if (tokens > 0) {
                forceApplyRecommendation(tokens);
            }
            triggerCompress();
            const size = (file.size / 1024).toFixed(1);
            showToast(`Loaded ${file.name} (${size} KB) — optimal settings applied.`, 'success');
            const baseName = file.name.replace(/\.[^.]+$/, '');
            filenameInput.value = baseName ? `${baseName}-optimized` : 'compressed-text';
        };
        reader.onerror = () => showToast('Failed to read file.', 'error');
        reader.readAsText(file);
        e.target.value = '';
    });

    // ─── SAVE ─────────────────────────────────────────────────────
    function saveFile() {
        const content = outputArea.value;
        if (!content) { showToast('Nothing to save', 'error'); return; }
        const base = filenameInput.value.trim() || 'compressed';
        const ext = extSelect.value;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = base + ext;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showToast(`Saved as ${base}${ext}`, 'success');
    }

    // ─── EVENTS ──────────────────────────────────────────────────
    inputArea.addEventListener('input', triggerCompress);
    compressBtn.addEventListener('click', runCompress);
    saveBtn.addEventListener('click', saveFile);
    filenameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveFile(); });

    document.querySelectorAll('.settings-groups input, .alias-radio-group input').forEach(el => {
        el.addEventListener('change', () => {
            if (applyingRecommendation) return;
            settingsAreRecommended = false;
            if (el.id === 'chkHuffman' && chkHuffman.checked) {
                showToast('⧩ Huffman mode enabled – codebook header will be added.', 'info');
            }
            if (el.id === 'chkSlimDown' && chkSlimDown.checked) {
                showToast('⧩ SlimDown mode enabled – decoder header added.', 'info');
            }
            triggerCompress();
        });
    });

    chkLive.addEventListener('change', () => {
        if (!chkLive.checked) clearTimeout(compressTimer);
        else triggerCompress();
    });

    clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        outputArea.value = '';
        updateStats('', '', 0);
        slimdownIndicator.style.display = 'none';
        huffmanIndicator.style.display = 'none';
        inputArea.focus();
        settingsAreRecommended = false;
        showToast('Cleared', 'info');
    });

    copyBtn.addEventListener('click', async () => {
        const out = outputArea.value;
        if (!out) { showToast('Nothing to copy', 'error'); return; }
        try {
            await navigator.clipboard.writeText(out);
            showToast('Copied to clipboard!', 'success');
        } catch {
            outputArea.select();
            document.execCommand('copy');
            showToast('Copied!', 'success');
        }
    });

    // ─── INIT ────────────────────────────────────────────────────
    runCompress();
    window.showToast = showToast;

})();