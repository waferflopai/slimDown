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

    // ─── UPDATE ADAPTIVE BANNER (display only, no force) ──────
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

    // ─── FORCE APPLY RECOMMENDATION (used on load/clear) ──────
    function forceApplyRecommendation(tokens) {
        if (tokens === 0) return;
        const rec = getRecommendation(tokens);
        applyRecommendationSettings(rec.settings);
        updateAdaptiveBanner(tokens);
    }

    // ─── CORE COMPRESSOR ───────────────────────────────────────
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
        const entries = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
        const codebook = {};
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

    // ─── MAIN COMPRESS FUNCTION ────────────────────────────────
    function compress(text, opts) {
        if (!text) return '';

        const {
            stopwords, conj, suffix, markdown, punct, space, numeric,
            aliasMode, twoPass, slimdown, huffman
        } = opts;

        let aliasMap = {};
        let blocks = [];
        let huffmanCodebook = null;

        // Protect code blocks
        text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            blocks.push({ type: 'block', lang: lang || '', code });
            return `__PROTECTED_${blocks.length - 1}__`;
        });
        text = text.replace(/`([^`]+)`/g, (match, code) => {
            blocks.push({ type: 'inline', code });
            return `__PROTECTED_${blocks.length - 1}__`;
        });

        // Markdown
        if (markdown) {
            text = text.replace(/^(\s*)(#+)\s+/gm, '$1$2');
            text = text.replace(/^(\s*)([-+*])\s+/gm, '$1$2');
            text = text.replace(/^(\s*)>\s+/gm, '$1>');
            text = text.replace(/\*\*([^*]+)\*\*/g, '*$1*');
            text = text.replace(/\*([^*]+)\*/g, '_$1_');
            text = text.replace(/\[([^\]]*)\]\(([^)]*)\)/g, '{$1|$2}');
            text = text.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '!{$1|$2}');
            text = text.replace(/^(\s*)-\s+/gm, '$1•');
            text = text.replace(/\s*\|\s*/g, '|');
            text = text.replace(/---/g, '—');
        }

        // Punctuation
        if (punct) {
            text = text.replace(/[.,;:?!]+/g, ' ');
        }

        // Stopwords
        if (stopwords) {
            let sw =
                /\b(the|a|an|of|for|with|from|is|are|was|were|have|has|had|to|at|by|in|on|be|been|being|this|that|these|those|which|what|who|whom|whose|does|did|do|will|would|could|should|may|might|must|shall|can|not|but|so|for|nor|yet|as|into|upon|onto|about|than|then|thence|there|therefore|therein|thereof|thereon|thereto|therewith|these|they|thou|though|through|throughout|thru|till|unless|unto|up|upon|us|we|when|where|whereby|wherein|whereupon|wherever|whether|which|while|whilst|with|without|would)\b/gi;
            if (slimdown) {
                sw =
                    /\b(the|a|an|of|for|with|from|is|are|was|were|have|has|had|to|at|by|in|on|be|been|being|this|that|these|those|which|what|who|whom|whose|does|did|do|will|would|could|should|may|might|must|shall|can|not|but|so|for|nor|yet|as|into|upon|onto|about|than|then|thence|there|therefore|therein|thereof|thereon|thereto|therewith|these|they|thou|though|through|throughout|thru|till|unless|unto|up|upon|us|we|when|where|whereby|wherein|whereupon|wherever|whether|which|while|whilst|with|without|would|any|every|some|all|both|each|few|many|more|most|other|some|such|no|nor|too|very|can|will|just|should|now|then|than|that|thence|then|thence|thereafter|thereby|therefore|therein|thereof|thereon|thereto|therewith|these|they|thou|though|through|throughout|thru|till|unless|unto|up|upon|us|we|when|where|whereby|wherein|whereupon|wherever|whether|which|while|whilst|with|without|would)\b/gi;
            }
            text = text.replace(sw, '');
        }

        // Conjunctions
        if (conj) {
            text = text.replace(/\b(and|or|but|nor|for|so|yet)\b/gi, ' ');
            text = text.replace(/\bto\s+(\w{3,})\b/gi, '$1');
            text = text.replace(/\bof\s+the\b/gi, ' ');
            if (slimdown) {
                text = text.replace(/\b(because|since|although|though|while|whereas|unless|until)\b/gi,
                    ' ');
                text = text.replace(/\b(if|then|else|when|whenever|where|wherever)\b/gi, ' ');
            }
        }

        // Suffix
        if (suffix) {
            text = text.replace(/\b(\w{4,})ing\b/gi, '$1g');
            text = text.replace(/\b(\w{4,})tion\b/gi, '$1n');
            text = text.replace(/\b(\w{4,})sion\b/gi, '$1n');
            text = text.replace(/\b(\w{4,})able\b/gi, '$1bl');
            text = text.replace(/\b(\w{4,})ible\b/gi, '$1bl');
            text = text.replace(/\b(\w{4,})ment\b/gi, '$1mt');
            text = text.replace(/\b(\w{4,})ness\b/gi, '$1ns');
            text = text.replace(/\b(\w{4,})ology\b/gi, '$1ol');
            text = text.replace(/\b(\w{4,})graphy\b/gi, '$1gr');
            text = text.replace(/\b(\w{4,})phone\b/gi, '$1ph');
            text = text.replace(/because/gi, 'bc');
            text = text.replace(/though/gi, 'tho');
            text = text.replace(/through/gi, 'thru');
            text = text.replace(/without/gi, 'wout');
            text = text.replace(/between/gi, 'btwn');
            text = text.replace(/however/gi, 'howev');
            text = text.replace(/therefore/gi, 'thrf');
            text = text.replace(/https?:\/\//gi, '//');
            if (slimdown) {
                text = text.replace(/\b(\w{4,})ly\b/gi, '$1l');
                text = text.replace(/\b(\w{4,})ful\b/gi, '$1fl');
                text = text.replace(/\b(\w{4,})ous\b/gi, '$1us');
                text = text.replace(/\b(\w{4,})ity\b/gi, '$1ty');
                text = text.replace(/\b(\w{4,})ism\b/gi, '$1sm');
                text = text.replace(/\b(\w{4,})ist\b/gi, '$1st');
                text = text.replace(/\b(\w{4,})ive\b/gi, '$1iv');
            }
        }

        // Numeric
        if (numeric) {
            text = text.replace(/\b(\d{1,3})(?:,)(\d{3})\b/g, '$1k');
            text = text.replace(/\b(\d+)%\b/g, '$1p');
            text = text.replace(/\b(\d+)\+ tables\b/gi, '$1+tbl');
            text = text.replace(/\b([A-Za-z]{3})\s+(\d{4})\b/g, '$1$2');
            text = text.replace(/\b(\d+)\s*\/\s*(mo|month|yr|year|gb|mb)\b/gi, '$1$2');
            text = text.replace(/\b(\d+)\s*-\s*(\d+)\s*([MB])\b/gi, '$1-$2$3');
            if (slimdown) {
                text = text.replace(/\b(\d+)\s*(thousand|k)\b/gi, '$1k');
                text = text.replace(/\b(\d+)\s*(million|m)\b/gi, '$1m');
                text = text.replace(/\b(\d+)\s*(billion|b)\b/gi, '$1b');
                text = text.replace(/\b(\d+)\s*(percent|pct)\b/gi, '$1p');
            }
        }

        // ── HUFFMAN SHORTCODES ────────────────────────────────────
        let huffmanHeader = '';
        if (huffman) {
            const words = text.match(/\b[a-zA-Z]+\b/g) || [];
            const freq = {};
            for (const w of words) {
                const key = w.toLowerCase();
                freq[key] = (freq[key] || 0) + 1;
            }
            const codebook = generateCodebook(freq);
            huffmanCodebook = codebook;
            const wordRegex = /\b[a-zA-Z]+\b/g;
            text = text.replace(wordRegex, (match) => {
                const lower = match.toLowerCase();
                if (codebook.hasOwnProperty(lower)) {
                    return codebook[lower];
                }
                return match;
            });
            const dict = Object.fromEntries(Object.entries(codebook).map(([k, v]) => [v, k]));
            const jsonDict = JSON.stringify(dict);
            huffmanHeader = `;; dictionary = ${jsonDict}\n;; To decompress, replace each code with its word from the dictionary.\n`;
        }

        // ── ALIAS ──────────────────────────────────────────────────
        let footer = '';
        let usedAliases = {};
        if (!huffman) {
            const baseThreshold = slimdown ? 1 : (text.length > 10000 ? 3 : 2);

            function runAliasPass(t, passNum) {
                let result = t;
                const words = result.match(/\b[a-zA-Z]{4,}\b/g) || [];
                const allWords = result.match(/\b[a-zA-Z]+\b/g) || [];
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
                    const regex = new RegExp('\\b' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b',
                        'gi');

                    usedAliases[alias] = phrase;

                    if (aliasMode === 'inline' && passNum === 1) {
                        let first = true;
                        result = result.replace(regex, (match) => {
                            if (first) {
                                first = false;
                                return `${match} (${alias})`;
                            }
                            return alias;
                        });
                    } else {
                        result = result.replace(regex, alias);
                        footer += (footer ? ';' : '') + alias + '=' + phrase;
                    }
                });
                return result;
            }

            if (aliasMode !== 'none') {
                text = runAliasPass(text, 1);
                if (twoPass) {
                    text = runAliasPass(text, 2);
                }
            }
        }

        // ── Whitespace ──────────────────────────────────────────
        if (space) {
            text = text.replace(/\n\s*\n/g, ' | ');
            text = text.replace(/\n/g, ' ');
            text = text.replace(/ +/g, ' ');
            text = text.replace(/\s*#/g, '#');
            text = text.replace(/#\s+/g, '#');
            text = text.replace(/\s*\*/g, '*');
            text = text.replace(/\*\s+/g, '*');
            text = text.replace(/\s*_/g, '_');
            text = text.replace(/_\s+/g, '_');
            text = text.replace(/\s*\{/g, '{');
            text = text.replace(/\}\s*/g, '}');
            text = text.replace(/\s*\|\s*/g, '|');
            text = text.replace(/\s*!/g, '!');
            text = text.replace(/!\s*/g, '!');
            text = text.replace(/\s*-\s*/g, '-');
            text = text.replace(/\s*>\s*/g, '>');
        } else {
            text = text.replace(/ +/g, ' ');
        }
        text = text.trim();

        // ── Restore blocks ──────────────────────────────────────
        text = text.replace(/__PROTECTED_(\d+)__/g, (match, idx) => {
            const b = blocks[parseInt(idx)];
            if (!b) return match;
            if (b.type === 'block') return `@{${b.lang}|${b.code}}`;
            else return `'${b.code}'`;
        });

        // ── Footer ──────────────────────────────────────────────
        if (!huffman && aliasMode === 'classic' && footer) {
            text = text + ' ;; ' + footer;
        }
        text = text.replace(/ +/g, ' ').trim();

        // ── Headers ─────────────────────────────────────────────
        let header = '';
        if (huffman) {
            header = huffmanHeader;
        } else if (slimdown) {
            header = buildSlimDownHeader(text, usedAliases, opts);
        }

        return header ? header + '\n\n' + text : text;
    }

    // ─── BUILD SLIMDOWN HEADER ─────────────────────────────────
    function buildSlimDownHeader(compressedText, aliasMap, opts) {
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

    // ─── COMPRESS EXECUTION ─────────────────────────────────────
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

        isCompressing = true;
        processingIndicator.classList.add('active');

        setTimeout(() => {
            try {
                const output = compress(input, opts);
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
    // No default text – start with empty input
    runCompress();
    window.showToast = showToast;

})();