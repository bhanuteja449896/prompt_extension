// AI Prompt Enhancer - Content Script
console.log("AI Prompt Enhancer loaded");

// Function to call Gemini API
async function enhancePromptWithGemini(prompt) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=AIzaSyCKJPU_4erpvijeTbnuNMHoImmfZCu9PfA",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are an expert prompt engineer. Your task is to improve the given prompt by:
1. Making it more specific and detailed
2. Adding relevant context and constraints
3. Identifying key technical terms that could be improved
4. Suggesting alternative terms that are more precise or commonly used

For each key term, suggest 2-3 alternatives that are more specific or commonly used in the field.

Format your response as a valid JSON object with this exact structure:
{
"enhanced_prompt": "improved version of the prompt without any prefixes",
"keywords": [
  {
    "original": "original term",
    "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
  }
]
}

Original prompt: ${prompt}

Remember:
- Do not add any prefixes like "Enhanced:" to the prompt
- Keep the core intent of the original prompt
- Make the enhanced prompt more specific and detailed
- Focus on technical accuracy and clarity`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );
    console.log("bhanu :", response);
    const data = await response.json();
    console.log("Gemini API Response:", data);

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let responseText = data.candidates[0].content.parts[0].text;

      // Remove Markdown code block if present
      responseText = responseText.replace(/```json|```/g, "").trim();

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing cleaned JSON response:", parseError);
        return {
          enhanced_prompt: prompt,
          keywords: [],
        };
      }
    } else if (data.error) {
      console.error("API Error:", data.error);
      throw new Error(data.error.message || "API call failed");
    } else {
      console.error("Unexpected API response structure:", data);
      return {
        enhanced_prompt: prompt,
        keywords: [],
      };
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      enhanced_prompt: prompt,
      keywords: [],
    };
  }
}

// Function to update the textarea with enhanced prompt
function updateTextarea(textarea, enhancedPrompt) {
    // Store the enhanced prompt and keywords
    textarea.dataset.enhancedPrompt = enhancedPrompt.enhanced_prompt;
    textarea.dataset.keywords = JSON.stringify(enhancedPrompt.keywords);

    // Update the textarea or ProseMirror content
    if (textarea.tagName.toLowerCase() === 'textarea') {
        textarea.value = enhancedPrompt.enhanced_prompt;
    } else {
        textarea.innerText = enhancedPrompt.enhanced_prompt;
    }

    // Trigger input so ChatGPT sees the change
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    // Keyword click listeners (optional keyword suggestions)
    enhancedPrompt.keywords.forEach(keywordData => {
        const { original, suggestions } = keywordData;

        const keywordRegex = new RegExp(`\\b${original}\\b`, 'gi');
        const match = enhancedPrompt.enhanced_prompt.match(keywordRegex);
        if (match) {
            // You could optionally add buttons/icons/popups near the field here
            console.log(`Keyword "${original}" detected — suggestions:`, suggestions);
        }
    });

    // Enter key: send enhanced prompt
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();

            const finalPrompt = textarea.dataset.enhancedPrompt;

            if (textarea.tagName.toLowerCase() === 'textarea') {
                textarea.value = finalPrompt;
            } else {
                textarea.innerText = finalPrompt;
            }

            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            // Click ChatGPT send button
            const sendButton = document.querySelector('button[data-testid="send-button"]');
            if (sendButton) {
                sendButton.click();
            }

            textarea.removeEventListener('keydown', handleKeyDown);
        }
    };

    textarea.addEventListener('keydown', handleKeyDown);
}


// Helper function to create suggestion popup
function createSuggestionPopup(word, keywordData, textarea, wrapper) {
  const popup = document.createElement("div");
  popup.className = "keyword-popup";
  popup.style.cssText = `
        position: fixed;
        background-color: #343541;
        border: 1px solid #4a4a4a;
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 9999;
        max-width: 200px;
    `;

  const suggestionsList = document.createElement("ul");
  suggestionsList.style.cssText = `
        margin: 0;
        padding: 0;
        list-style: none;
    `;

  keywordData.suggestions.forEach((suggestion) => {
    const li = document.createElement("li");
    li.textContent = suggestion;
    li.style.cssText = `
            padding: 4px 0;
            cursor: pointer;
            border-bottom: 1px solid #4a4a4a;
            color: #58A6FF;
        `;

    li.addEventListener("mouseover", () => {
      li.style.backgroundColor = "#40414F";
    });

    li.addEventListener("mouseout", () => {
      li.style.backgroundColor = "transparent";
    });

    li.addEventListener("click", () => {
      // Update the text
      const newText = textarea.dataset.enhancedPrompt.replace(
        new RegExp(`\\b${word}\\b`, "gi"),
        suggestion
      );
      textarea.dataset.enhancedPrompt = newText;
      textarea.value = newText;

      // Re-render the wrapper with the new text
      const newWords = newText.split(/\s+/);
      wrapper.innerHTML = "";

      newWords.forEach((newWord, newIndex) => {
        const newSpan = document.createElement("span");
        newSpan.textContent =
          newWord + (newIndex < newWords.length - 1 ? " " : "");
        newSpan.style.color = "#ECECF1";

        // Check if this word is a keyword
        const isNewKeyword = JSON.parse(textarea.dataset.keywords).some(
          (k) => k.original.toLowerCase() === newWord.toLowerCase()
        );

        if (isNewKeyword) {
          newSpan.className = "enhanced-keyword";
          newSpan.style.cssText = `
                        color: #58A6FF !important;
                        cursor: pointer;
                        text-decoration: underline;
                    `;

          // Add click handler for the new keyword
          newSpan.addEventListener("click", (e) => {
            e.stopPropagation();
            const keywordData = JSON.parse(textarea.dataset.keywords).find(
              (k) => k.original.toLowerCase() === newWord.toLowerCase()
            );
            if (keywordData) {
              const newPopup = createSuggestionPopup(
                newWord,
                keywordData,
                textarea,
                wrapper
              );
              document.body.appendChild(newPopup);
            }
          });
        }

        wrapper.appendChild(newSpan);
      });

      popup.remove();
    });

    suggestionsList.appendChild(li);
  });

  popup.appendChild(suggestionsList);

  // Position popup
  const rect = wrapper.getBoundingClientRect();
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.bottom + 5}px`;

  return popup;
}

// Function to create keyword suggestions popup
function createKeywordPopup(keyword, suggestions) {
  const popup = document.createElement("div");
  popup.className = "keyword-popup";

  const suggestionsList = document.createElement("div");
  suggestionsList.className = "suggestions-list";

  suggestions.forEach((suggestion) => {
    const suggestionItem = document.createElement("div");
    suggestionItem.className = "suggestion-item";
    suggestionItem.textContent = suggestion;
    suggestionItem.onclick = () => {
      // Replace the keyword with the selected suggestion
      const textarea =
        document.querySelector("#prompt-textarea") ||
        document.querySelector('.ProseMirror[contenteditable="true"]');
      if (textarea) {
        const text = textarea.textContent;
        textarea.textContent = text.replace(keyword, suggestion);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
      popup.remove();
    };
    suggestionsList.appendChild(suggestionItem);
  });

  const customInput = document.createElement("input");
  customInput.type = "text";
  customInput.placeholder = "Type custom suggestion...";
  customInput.className = "custom-suggestion-input";

  const applyButton = document.createElement("button");
  applyButton.textContent = "Apply Custom";
  applyButton.className = "apply-custom-btn";
  applyButton.onclick = () => {
    if (customInput.value.trim()) {
      const textarea =
        document.querySelector("#prompt-textarea") ||
        document.querySelector('.ProseMirror[contenteditable="true"]');
      if (textarea) {
        const text = textarea.textContent;
        textarea.textContent = text.replace(keyword, customInput.value.trim());
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
      popup.remove();
    }
  };

  popup.appendChild(suggestionsList);
  popup.appendChild(customInput);
  popup.appendChild(applyButton);

  return popup;
}

// Function to highlight keywords in the text
function highlightKeywords(text, keywords) {
  let highlightedText = text;
  keywords.forEach((keyword) => {
    const regex = new RegExp(keyword.original, "gi");
    highlightedText = highlightedText.replace(regex, (match) => {
      return `<span class="enhanced-keyword" data-keyword="${match}">${match}</span>`;
    });
  });
  return highlightedText;
}

function addEnhanceButton() {
  // Check if button already exists
  if (document.getElementById("enhance-btn")) {
    return;
  }

  // Find the Tools button in ChatGPT interface using the specific structure
  const toolsButton =
    document.querySelector('button[aria-label="Choose tool"]') ||
    document.querySelector(
      'button[data-testid="composer-footer-actions"] button'
    ) ||
    document.querySelector('button:has(span:contains("Tools"))');

  if (toolsButton) {
    // Create the Enhance button
    const enhanceButton = document.createElement("button");
    enhanceButton.id = "enhance-btn";
    enhanceButton.className = "enhance-button";
    enhanceButton.type = "button";
    enhanceButton.title = "Enhance your prompt";

    // Create and add the icon
    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("icon.png");
    icon.alt = "Enhance";
    icon.className = "enhance-icon";
    enhanceButton.appendChild(icon);

    // Add click event with visual feedback
    enhanceButton.addEventListener("click", async function (e) {
      e.preventDefault();

      // Add loading state
      enhanceButton.style.opacity = "0.7";

      // Find the textarea using the specific structure
      const textarea =
        document.querySelector("#prompt-textarea") ||
        document.querySelector('.ProseMirror[contenteditable="true"]');

      if (textarea) {
        // Get the current prompt
        const currentPrompt = textarea.textContent;

        // Call Gemini API to enhance the prompt
        const enhancedData = await enhancePromptWithGemini(currentPrompt);

        if (enhancedData) {
          // Update the textarea with enhanced prompt
          updateTextarea(textarea, enhancedData);

          // Add click handlers for keywords
          const keywordElements =
            textarea.querySelectorAll(".enhanced-keyword");
          keywordElements.forEach((element) => {
            element.addEventListener("click", (e) => {
              const keyword = e.target.dataset.keyword;
              const keywordData = enhancedData.keywords.find(
                (k) => k.original.toLowerCase() === keyword.toLowerCase()
              );

              if (keywordData) {
                const popup = createKeywordPopup(
                  keyword,
                  keywordData.suggestions
                );
                document.body.appendChild(popup);

                // Position the popup near the clicked keyword
                const rect = e.target.getBoundingClientRect();
                popup.style.top = `${rect.bottom + window.scrollY}px`;
                popup.style.left = `${rect.left + window.scrollX}px`;
              }
            });
          });

          // Trigger input event to ensure ChatGPT recognizes the change
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }

      // Reset button state after a short delay
      setTimeout(() => {
        enhanceButton.style.opacity = "1";
      }, 1000);
    });

    // Insert the button right after the Tools button
    toolsButton.parentNode.insertBefore(enhanceButton, toolsButton.nextSibling);
    console.log("Enhance button added successfully");
  } else {
    // Retry after a short delay if Tools button not found
    setTimeout(addEnhanceButton, 1000);
  }
}

// Run when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addEnhanceButton);
} else {
  addEnhanceButton();
}

// Also monitor for dynamic changes in ChatGPT interface
const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (
      mutation.type === "childList" &&
      !document.getElementById("enhance-btn")
    ) {
      setTimeout(addEnhanceButton, 500);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Retry periodically to ensure button stays visible
setInterval(function () {
  if (!document.getElementById("enhance-btn")) {
    addEnhanceButton();
  }
}, 3000);
