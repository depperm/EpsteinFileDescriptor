#!/usr/bin/env node
// Usage: node inflate-csv.js

const fs = require("fs");

const inputCSV = "metadata-condensed.csv";
const tagsFile = "tags.json";
const outputCSV = "metadata-inflated.csv";

if (!fs.existsSync(inputCSV)) {
  console.error(`Error: Input CSV file not found: ${inputCSV}`);
  process.exit(1);
}

if (!fs.existsSync(tagsFile)) {
  console.error(`Error: Tags file not found: ${tagsFile}`);
  process.exit(1);
}

let tagsDictionary;
try {
  const tagsData = fs.readFileSync(tagsFile, "utf8");
  tagsDictionary = JSON.parse(tagsData);
} catch (error) {
  console.error(`Error loading tags file: ${error.message}`);
  process.exit(1);
}

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      if (values.length === 0) {
        values.push(`EFTA${current}`);
      } else {
        values.push(current);
      }

      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}

function escapeCSVField(field) {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

function expandTags(tagIndices) {
  if (!tagIndices) return "";

  const indices = tagIndices.split("|").map((i) => i.trim());
  const tags = indices.map((index) => {
    const idx = parseInt(index);
    if (isNaN(idx) || idx < 0 || idx >= tagsDictionary.length) {
      console.error(`Warning: Invalid tag index: ${index}`);
      return `INVALID_TAG_${index}`;
    }
    return tagsDictionary[idx];
  });

  return tags.join("|");
}

// Process CSV
try {
  const csvData = fs.readFileSync(inputCSV, "utf8");
  const lines = csvData.split("\n");

  if (lines.length === 0) {
    console.error("Error: CSV file is empty");
    process.exit(1);
  }

  const outputLines = [];
  const headers = parseCSVLine(lines[0]);

  const tagsColumnIndex = headers.findIndex(
    (h) => h.toLowerCase().trim() === "tags" || h.toLowerCase().trim() === "t",
  );

  if (tagsColumnIndex === -1) {
    console.error('Error: Could not find "tags" or "t" column in CSV');
    process.exit(1);
  }

  outputLines.push(lines[0]);

  let processedCount = 0;
  let errorCount = 0;

  // Process each line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line);

      // Expand tags
      if (values[tagsColumnIndex]) {
        values[tagsColumnIndex] = expandTags(values[tagsColumnIndex]);
      }

      // Reconstruct CSV line
      const expandedLine = values.map(escapeCSVField).join(",");
      outputLines.push(expandedLine);
      processedCount++;
    } catch (error) {
      console.error(`Error processing line ${i}: ${error.message}`);
      errorCount++;
    }
  }

  const outputContent = outputLines.join("\n");

  if (outputCSV) {
    fs.writeFileSync(outputCSV, outputContent);
    console.error(`\nSuccess! Expanded CSV written to: ${outputCSV}`);
  } else {
    console.log(outputContent);
  }

  console.error(`Processed ${processedCount} rows`);
  if (errorCount > 0) {
    console.error(`Errors: ${errorCount} rows`);
  }
} catch (error) {
  console.error(`Error processing CSV: ${error.message}`);
  process.exit(1);
}
