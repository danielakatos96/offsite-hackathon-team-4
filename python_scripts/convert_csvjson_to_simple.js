// Converts python_scripts/csvjson.json into a simplified format similar to csvjson_simple.json
// Output: python_scripts/csvjson_simple_full.json

const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'csvjson.json');
const outputPath = path.join(__dirname, 'csvjson_simple_full.json');

function readJsonSafe(file) {
  const raw = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Try to sanitize BOM or stray chars
    const cleaned = raw.replace(/^\uFEFF/, '').trim();
    return JSON.parse(cleaned);
  }
}

function val(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.join(', ').trim();
  return String(v).trim();
}

function normalizeLabel(label) {
  return String(label).replace(/\s+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
}

function splitToTags(str) {
  const s = val(str);
  if (!s) return [];
  return s
    .split(/[;,|]/)
    .map(t => t.trim())
    .filter(Boolean);
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function buildText(obj) {
  const lines = [];
  for (const [k, vRaw] of Object.entries(obj)) {
    const v = val(vRaw);
    if (!v) continue;
    const label = normalizeLabel(k);
    // Collapse internal whitespace in values while preserving readability
    const cleanVal = v.replace(/\s+/g, ' ').trim();
    lines.push(`${label}: ${cleanVal}`);
  }
  return lines.join('\n');
}

function transform(records) {
  const out = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i] || {};

    const title = val(
      r['Project Title in English language\n(Original Project Title from the TOR/Contract)']
    );

    const stream = val(r['Stream']);
    const author = val(r['Project Manager Name']);
    const date = val(r['Start date \n(As per contract)']);

    const billedBy = val(r['Billed by']);
    const clientLocal = val(
      r[
        'Client Name in the local language/ language of the contract \n(End client for which the work is performed)'
      ]
    );
    const clientEnglish = val(
      r[
        'Client name in English\n(In case it is a Ministry/public organization indicate of which country, e.g., Ministry of Education of Ukraine)'
      ]
    );
    const code = val(
      r[
        'Code \n(If one contract/project has mutiple codes, indicate them ALL with a comma between them, e.g, EE ECO 12, EE ECO 12 OLD)'
      ]
    );
    const owner = val(r['Owner']);

    const tags = unique(
      [
        ...splitToTags(stream),
        ...splitToTags(billedBy),
        ...splitToTags(clientLocal),
        ...splitToTags(clientEnglish),
        ...splitToTags(code),
        ...splitToTags(owner),
      ].filter(Boolean)
    );

    out.push({
      id: i + 1,
      title,
      text: buildText(r),
      stream,
      author,
      date,
      tags,
    });
  }

  return out;
}

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const data = readJsonSafe(inputPath);
  if (!Array.isArray(data)) {
    console.error('Expected an array of records in input JSON.');
    process.exit(1);
  }

  const simplified = transform(data);
  const json = JSON.stringify(simplified, null, 2);
  fs.writeFileSync(outputPath, json, 'utf8');
  console.log(`Wrote simplified data to: ${outputPath} (${simplified.length} records)`);
}

if (require.main === module) {
  main();
}
