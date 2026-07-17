# 🧠 slimDown – Semantic Token Compressor for LLM Context (v2.4)

> **Maximize your LLM’s context window – compress prose by up to 55% with minimal semantic loss.**

---

## What it does

`slimDown` is a browser‑based tool that reduces the token count of natural‑language text (books, transcripts, reports, etc.) while preserving meaning. It applies a combination of filters – stopword removal, conjunction reduction, suffix crunching, Markdown compression, whitespace collapsing, numeric shorthand, and alias substitution – and optionally adds a decoder header for future expansion.

The result: **more text fits into your LLM’s context, you pay less per API call, and you can process longer documents without truncation.**

---

## 🔧 Key Features

- **Adaptive Mode Selection** – automatically chooses the best compression strategy based on input size:  
  - **Minimal** (< 2K tokens) – passthrough, no overhead  
  - **Classic** (2K–8K) – stopwords, conjunctions, suffix, Markdown, whitespace, two‑pass inline aliases  
  - **SlimDown** (8K–500K) – all classic filters + numeric compression + SlimDown header  
  - **Huffman** (> 500K) – frequency‑based shortcodes for extreme compression  

- **Live Preview** – compress as you type or paste; toggle Live mode on/off.

- **Fine‑grained Controls** – individually toggle stopwords, conjunctions, suffix crunch, Markdown, punctuation, whitespace, numeric compression, two‑pass aliases, and experimental SlimDown/Huffman modes.

- **Alias Strategies** – choose between no aliasing, classic (footer dictionary), or inline (first‑use definition).

- **File Import** – load `.txt`, `.md`, `.json`, `.csv`, and many other plain‑text formats.

- **Save & Copy** – export compressed output as `.slimdown` or `.md`.

- **Context‑Loss Estimation** – get a rough indicator of semantic preservation.

---

## 📊 Example Compression Stats

| Mode      | Input Tokens | Output Tokens | Reduction |
|-----------|--------------|---------------|-----------|
| Classic   | 5,000        | 3,950         | 21%       |
| SlimDown  | 50,000       | 22,500        | 55%       |
| Huffman   | 600,000      | 270,000       | 55%       |

*Actual results depend on text density and filter selection.*

---

## 🚀 How to Use

1. **Open the tool** – it’s a single HTML file. Just double‑click it in your browser (or host it on GitHub Pages / any static host).  
2. **Paste** your text or use the **Load** button to upload a file.  
3. The **adaptive banner** will suggest a mode and automatically set the optimal switches.  
4. Tweak any filter manually – your changes are respected and will not be overwritten.  
5. Watch the output panel update instantly (if **Live** is ON) or hit **Execute** for manual control.  
6. **Copy** the result or **Save** it as a `.slimdown` or `.md` file.

---

## ⚠️ Intended Use

- ✅ **Books, articles, transcripts, long‑form reports**  
- ❌ **Source code** – compression removes punctuation and syntax, breaking executability.

---

## 🔗 Get It

The tool is a standalone HTML file. You can download it, run it locally, or host it anywhere.

**Repository:** [GitHub link – place your repo URL here]  
**Live Demo:** [Link to hosted version – e.g., GitHub Pages]

---

## 💬 Feedback & Contributions

Open an issue or pull request if you have ideas, find bugs, or want to add new compression techniques.

---

*Made with ♥ by [waferflopai](https://waferflopai.vercel.app/)*
