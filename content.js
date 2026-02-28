let TAGS;
async function loadTags() {
  try {
    const url = chrome.runtime.getURL("tags.json");
    const response = await fetch(url);
    TAGS = await response.json();
  } catch (error) {
    console.error("Error loading tags:", error);
  }
}
let metadata = {};

async function loadMetadata() {
  const url = chrome.runtime.getURL("metadata.csv.gz");
  console.log(">>>", url);

  await loadTags();

  await fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
      return new Response(stream).text();
    })
    .then((text) => {
      const lines = text.split("\n").map((line) => {
        const fields = [];
        let value = "";
        let insideQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === "," && !insideQuotes) {
            fields.push(value);
            value = "";
          } else {
            value += char;
          }
        }
        fields.push(value);
        return fields;
      });
      lines.forEach((line) => {
        metadata[line[0]] = {
          tags: line[1].split("-"),
          description: line[2],
          len: line[3],
          date: line[4],
        };
      });
      return true;
    })
    .catch((error) => {
      console.error("Error loading metadata:", error);
      console.error("URL attempted:", chrome.runtime.getURL("metadata.csv.gz"));
      return false;
    });
}

function getDocumentId(resultItem) {
  const link = resultItem.querySelector("h3 a");
  if (link) {
    const href = link.getAttribute("href");
    const filename = href.split("/").pop();
    return filename.replace(".pdf", "");
  }
  return null;
}

function createTagsElement(tags) {
  const tagsDiv = document.createElement("div");
  tagsDiv.className = "enhanced-tags";

  tags.forEach((tag) => {
    const chip = document.createElement("span");
    console.log("<<<<", TAGS[tag]);
    chip.className = `tag-chip ${TAGS[tag].toLowerCase()}`;
    chip.textContent = TAGS[tag];
    tagsDiv.appendChild(chip);
  });

  return tagsDiv;
}

function createDescriptionElement(description) {
  const descDiv = document.createElement("div");
  descDiv.className = "enhanced-description";
  descDiv.innerHTML = description;
  return descDiv;
}

function createLengthElement(len) {
  const lenDiv = document.createElement("div");
  lenDiv.className = "enhanced-length";
  lenDiv.innerHTML =
    len && !!len.length
      ? `length: <strong>${len}${!isNaN(len) ? ` page${len === "1" ? "" : "s"}` : ""}</strong>`
      : "";
  return lenDiv;
}

function createDateElement(date) {
  const dateDiv = document.createElement("div");
  dateDiv.className = "enhanced-date";
  dateDiv.innerHTML = date && !!date.length ? `date: ${date}` : "";
  return dateDiv;
}

function enhanceResultItem(resultItem) {
  if (resultItem.querySelector(".enhanced-tags")) {
    return;
  }

  const docId = getDocumentId(resultItem).replace("EFTA", "");
  if (!docId || !metadata[docId]) {
    return;
  }

  const data = metadata[docId];

  const excerpt = resultItem.querySelector(".result-excerpt");
  if (!excerpt) {
    return;
  }

  const tagsElement = createTagsElement(data.tags);
  // excerpt.parentNode.insertBefore(tagsElement, excerpt.nextSibling);
  excerpt.appendChild(tagsElement);

  const lenElement = createLengthElement(data.len);
  // excerpt.parentNode.insertBefore(lenElement, excerpt.nextSibling);
  excerpt.appendChild(lenElement);

  const dateElement = createDateElement(data.date);
  // excerpt.parentNode.insertBefore(dateElement, excerpt.nextSibling);
  excerpt.appendChild(dateElement);
  excerpt.appendChild(document.createElement("hr"));

  const descElement = createDescriptionElement(data.description);
  // tagsElement.parentNode.insertBefore(descElement, tagsElement.nextSibling);
  excerpt.appendChild(descElement);
}

function enhanceAllResults() {
  const resultItems = document.querySelectorAll(".result-item");
  resultItems.forEach(enhanceResultItem);
}

async function initialize() {
  await loadMetadata();
  enhanceAllResults();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        if (node.classList && node.classList.contains("result-item")) {
          enhanceResultItem(node);
        }
        const resultItems =
          node.querySelectorAll && node.querySelectorAll(".result-item");
        if (resultItems) {
          resultItems.forEach(enhanceResultItem);
        }
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
