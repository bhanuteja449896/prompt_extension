// AI Prompt Enhancer - Content Script
console.log('AI Prompt Enhancer loaded');

function addEnhanceButton() {
  // Check if button already exists
  if (document.getElementById('enhance-btn')) {
    return;
  }

  // Find the Tools button in ChatGPT interface using the specific structure
  const toolsButton = document.querySelector('button[aria-label="Choose tool"]') ||
                     document.querySelector('button[data-testid="composer-footer-actions"] button') ||
                     document.querySelector('button:has(span:contains("Tools"))');

  if (toolsButton) {
    // Create the Enhance button
    const enhanceButton = document.createElement('button');
    enhanceButton.id = 'enhance-btn';
    enhanceButton.className = 'enhance-button';
    enhanceButton.type = 'button';
    enhanceButton.title = 'Enhance your prompt';
    
    // Create and add the icon
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('icon.png');
    icon.alt = 'Enhance';
    icon.className = 'enhance-icon';
    enhanceButton.appendChild(icon);
    
    // Add click event with visual feedback
    enhanceButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Add loading state
      enhanceButton.style.opacity = '0.7';
      
      // Find the textarea using the specific structure
      const textarea = document.querySelector('#prompt-textarea') ||
                      document.querySelector('.ProseMirror[contenteditable="true"]');
      
      if (textarea) {
        // Get the current prompt
        const currentPrompt = textarea.textContent;
        
        // Here you can add your prompt enhancement logic
        // For now, we'll just add a simple enhancement
        const enhancedPrompt = `Enhanced: ${currentPrompt}`;
        
        // Update the textarea
        textarea.textContent = enhancedPrompt;
        
        // Trigger input event to ensure ChatGPT recognizes the change
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Reset button state after a short delay
      setTimeout(() => {
        enhanceButton.style.opacity = '1';
      }, 1000);
    });

    // Insert the button right after the Tools button
    toolsButton.parentNode.insertBefore(enhanceButton, toolsButton.nextSibling);
    console.log('Enhance button added successfully');
  } else {
    // Retry after a short delay if Tools button not found
    setTimeout(addEnhanceButton, 1000);
  }
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addEnhanceButton);
} else {
  addEnhanceButton();
}

// Also monitor for dynamic changes in ChatGPT interface
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && !document.getElementById('enhance-btn')) {
      setTimeout(addEnhanceButton, 500);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Retry periodically to ensure button stays visible
setInterval(function() {
  if (!document.getElementById('enhance-btn')) {
    addEnhanceButton();
  }
}, 3000);