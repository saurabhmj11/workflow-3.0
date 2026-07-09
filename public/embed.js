(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  function initWidget() {
    // Find the script tag to get the data-bot-id
    var scriptTag = document.currentScript || document.querySelector('script[src*="embed.js"]');
    var botId = scriptTag ? scriptTag.getAttribute('data-bot-id') : 'demo';
    
    // Base URL of the OpenWorkflow platform (can be dynamic based on script src)
    var scriptSrc = scriptTag ? scriptTag.src : '';
    var baseUrl = scriptSrc ? new URL(scriptSrc).origin : 'http://localhost:3000';
    var chatUrl = baseUrl + '/chat/' + botId;

    // Inject CSS for the widget
    var style = document.createElement('style');
    style.innerHTML = `
      #owf-widget-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      #owf-chat-iframe {
        display: none;
        width: 380px;
        height: 600px;
        max-height: 80vh;
        border: none;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        background: transparent;
        transition: all 0.3s ease;
        transform-origin: bottom right;
        transform: scale(0);
        opacity: 0;
        margin-bottom: 16px;
      }
      #owf-chat-iframe.owf-open {
        display: block;
        transform: scale(1);
        opacity: 1;
      }
      #owf-toggle-btn {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: #3b82f6;
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, background-color 0.2s;
        float: right;
      }
      #owf-toggle-btn:hover {
        transform: scale(1.05);
        background-color: #2563eb;
      }
      #owf-toggle-btn svg {
        width: 28px;
        height: 28px;
        transition: transform 0.3s;
      }
      #owf-toggle-btn.owf-open svg {
        transform: rotate(90deg);
      }
      
      @media (max-width: 480px) {
        #owf-chat-iframe {
          width: calc(100vw - 32px);
          height: calc(100vh - 100px);
          max-height: calc(100vh - 100px);
          right: 16px;
          bottom: 90px;
          position: fixed;
        }
      }
    `;
    document.head.appendChild(style);

    // Create Container
    var container = document.createElement('div');
    container.id = 'owf-widget-container';

    // Create Iframe
    var iframe = document.createElement('iframe');
    iframe.id = 'owf-chat-iframe';
    iframe.src = chatUrl;
    iframe.allow = "microphone; camera"; // If you add voice later
    
    // Create Toggle Button
    var btn = document.createElement('button');
    btn.id = 'owf-toggle-btn';
    
    // Chat Icon SVG
    var chatIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    // Close Icon SVG
    var closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    
    btn.innerHTML = chatIcon;
    
    var isOpen = false;
    
    btn.onclick = function() {
      isOpen = !isOpen;
      if (isOpen) {
        iframe.classList.add('owf-open');
        btn.classList.add('owf-open');
        btn.innerHTML = closeIcon;
      } else {
        iframe.classList.remove('owf-open');
        btn.classList.remove('owf-open');
        setTimeout(() => {
          if (!isOpen) btn.innerHTML = chatIcon;
        }, 150);
      }
    };

    // Assemble and inject
    container.appendChild(iframe);
    container.appendChild(btn);
    document.body.appendChild(container);
  }
})();
