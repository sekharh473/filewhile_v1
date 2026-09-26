import * as prettier from 'prettier/standalone';
import * as babelPlugin from 'prettier/plugins/babel';
import * as estreePlugin from 'prettier/plugins/estree';
import * as htmlPlugin from 'prettier/plugins/html';
import * as postcssPlugin from 'prettier/plugins/postcss';
import * as markdownPlugin from 'prettier/plugins/markdown';

const PLUGINS = [babelPlugin, estreePlugin, htmlPlugin, postcssPlugin, markdownPlugin];

/**
 * Format code using Prettier with auto-detection and smart fallback.
 * @param {string} code - Code or snippet to format
 * @param {string} language - 'auto' | 'json' | 'javascript' | 'html' | 'css' | 'markdown'
 * @returns {Promise<{ success: boolean, formatted: string, detected: string, error?: string }>}
 */
export async function formatCodeSnippet(code, language = 'auto') {
  if (!code || !code.trim()) {
    return { success: true, formatted: code, detected: 'empty' };
  }

  const trimmed = code.trim();

  // Determine candidate parsers
  let candidateParsers = [];
  if (language === 'json') {
    candidateParsers = ['json'];
  } else if (language === 'javascript' || language === 'typescript') {
    candidateParsers = ['babel'];
  } else if (language === 'html') {
    candidateParsers = ['html'];
  } else if (language === 'css') {
    candidateParsers = ['css'];
  } else if (language === 'markdown') {
    candidateParsers = ['markdown'];
  } else {
    // Auto detection
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      candidateParsers = ['json', 'babel', 'html'];
    } else if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      candidateParsers = ['html', 'babel', 'markdown'];
    } else if (trimmed.includes('{') && trimmed.includes(':') && (trimmed.includes(';') || trimmed.includes('\n'))) {
      candidateParsers = ['css', 'babel', 'json'];
    } else {
      candidateParsers = ['babel', 'markdown', 'json', 'html'];
    }
  }

  // Attempt Prettier formatting
  for (const parser of candidateParsers) {
    try {
      const formatted = await prettier.format(code, {
        parser,
        plugins: PLUGINS,
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        printWidth: 80
      });
      return { success: true, formatted, detected: parser };
    } catch {
      // Try next parser
    }
  }

  // Graceful fallback: clean up indentation & trailing whitespace
  try {
    const lines = code.split('\n');
    const cleaned = lines.map(line => line.trimEnd()).join('\n');
    return {
      success: true,
      formatted: cleaned,
      detected: 'plain-text'
    };
  } catch (err) {
    return {
      success: false,
      formatted: code,
      detected: 'unknown',
      error: err.message
    };
  }
}
