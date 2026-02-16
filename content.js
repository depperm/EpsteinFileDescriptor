// Storage for metadata loaded from JSON file
let metadata = {};

// Load metadata from JSON file
async function loadMetadata() {
  try {
    const url = chrome.runtime.getURL("metadata.json");
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    metadata = await response.json();
    return true;
  } catch (error) {
    console.error("Error loading metadata:", error);
    console.error("URL attempted:", chrome.runtime.getURL("metadata.json"));
    return false;
  }
}

// Function to extract document ID from result item
function getDocumentId(resultItem) {
  const link = resultItem.querySelector("h3 a");
  if (link) {
    const href = link.getAttribute("href");
    const filename = href.split("/").pop();
    return filename.replace(".pdf", "");
  }
  return null;
}

// Function to create tags element
function createTagsElement(tags) {
  const tagsDiv = document.createElement("div");
  tagsDiv.className = "enhanced-tags";

  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = `tag-chip ${tag}`;
    chip.textContent = tag;
    tagsDiv.appendChild(chip);
  });

  return tagsDiv;
}

// Function to create description element
function createDescriptionElement(description) {
  const descDiv = document.createElement("div");
  descDiv.className = "enhanced-description";
  descDiv.textContent = description;
  return descDiv;
}

// Function to enhance a single result item
function enhanceResultItem(resultItem) {
  // Check if already enhanced
  if (resultItem.querySelector(".enhanced-tags")) {
    return;
  }

  const docId = getDocumentId(resultItem);
  if (!docId || !metadata[docId]) {
    return;
  }

  const data = metadata[docId];

  // Find the excerpt paragraph to insert after
  const excerpt = resultItem.querySelector(".result-excerpt");
  if (!excerpt) {
    return;
  }

  // Create and insert tags
  const tagsElement = createTagsElement(data.tags);
  excerpt.parentNode.insertBefore(tagsElement, excerpt.nextSibling);

  // Create and insert description
  const descElement = createDescriptionElement(data.description);
  tagsElement.parentNode.insertBefore(descElement, tagsElement.nextSibling);
}

// Function to enhance all result items on the page
function enhanceAllResults() {
  const resultItems = document.querySelectorAll(".result-item");
  resultItems.forEach(enhanceResultItem);
}

// Initialize when DOM is ready
async function initialize() {
  await loadMetadata();
  enhanceAllResults();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}

// Watch for dynamically added content
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        // Element node
        if (node.classList && node.classList.contains("result-item")) {
          enhanceResultItem(node);
        }
        // Check children
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
