// src/utils/parseCitations.js

// Splits text on [N] markers into alternating text/citation segments.
// e.g. "The sky is blue [1] due to scattering [2]."
// → [
//     { type: "text",     content: "The sky is blue " },
//     { type: "citation", index: 1 },
//     { type: "text",     content: " due to scattering " },
//     { type: "citation", index: 2 },
//     { type: "text",     content: "." },
//   ]
export function parseCitations(text) {
  const segments = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "citation", index: parseInt(match[1], 10) });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

// Returns the unique set of [N] indices found in a string.
// Used to split sources into "cited" vs "also retrieved" in the accordion.
export function extractCitedIndices(text) {
  const matches = [...text.matchAll(/\[(\d+)\]/g)];
  return [...new Set(matches.map(m => parseInt(m[1], 10)))];
}