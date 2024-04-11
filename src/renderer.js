let dpPath = { user: "user.png", system: "system.jpg" };
let messages = [];
let abortController = null;
let isStreaming = false;

function stopMessage() {
    if (abortController) {
        abortController.abort();
        abortController = null;
        isStreaming = false; // Update streaming state
        toggleButtons();
    }
}

function refreshDp() {
    document.querySelectorAll('.chat-dp').forEach(img => {
        img.src = dpPath[img.closest('.msg-window').querySelector('.message').classList.contains('user') ? 'user' : 'system'];
    });
}

function updateMemory(role) {
    messages.push({
      role: role,
      content: role === "user" ? document.getElementById("input").value : document.getElementById("chat-window").lastElementChild.querySelector('.message').textContent
    });
}

function clearHistory() {
    messages = [];
    document.getElementById("chat-window").innerHTML = '';
}

async function updateModelDropdown() {
    try {
      const response = await window.ollamaAPI.list();
      const modelSelect = document.getElementById('model-list');
      modelSelect.innerHTML = '';
  
      if (response && response.models && Array.isArray(response.models)) {
        response.models.forEach(model => modelSelect.add(new Option(model.name, model.name)));
      } else {
        console.warn('Unexpected response from ollama.list():', response);
      }
  
      modelSelect.addEventListener('change', clearHistory);
    } catch (error) {
      console.error('Error:', error);
    }
}

function editSystemPrompt(promptName) {
    const savedPrompts = JSON.parse(localStorage.getItem('systemPrompts')) || [];
    const promptToEdit = savedPrompts.find(prompt => prompt.name === promptName);
    if (promptToEdit) {
      document.getElementById('prompt-name-input').value = promptToEdit.name;
      document.getElementById('prompt-name-input').readOnly = true;
      document.getElementById('prompt-input').value = promptToEdit.content;

      adjustTextareaHeight(document.getElementById('prompt-input'));
    }
}

function loadSystemPrompts() {
    const systemPromptList = document.getElementById('system-prompt-list');
    const savedPrompts = JSON.parse(localStorage.getItem('systemPrompts')) || [];
    systemPromptList.innerHTML = '';
    savedPrompts.forEach(prompt => systemPromptList.add(new Option(prompt.name, prompt.content)));

    const promptList = document.getElementById('prompt-list');
    promptList.innerHTML = '';
    savedPrompts.forEach(prompt => {
        const btnDiv = document.createElement('div');
        const listItem = document.createElement('li');
        listItem.textContent = prompt.name;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteSystemPrompt(prompt.name));
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editSystemPrompt(prompt.name));
        btnDiv.appendChild(editBtn);
        btnDiv.appendChild(deleteBtn);
        listItem.appendChild(btnDiv);
        promptList.appendChild(listItem);
      });

    systemPromptList.dispatchEvent(new Event('change'));
}

function saveSystemPrompt() {
    const promptNameInput = document.getElementById('prompt-name-input');
    const promptInput = document.getElementById('prompt-input');
    const promptName = promptNameInput.value.trim();
    const promptContent = promptInput.value.trim();
    if (promptName && promptContent) {
      const savedPrompts = JSON.parse(localStorage.getItem('systemPrompts')) || [];
      const promptIndex = savedPrompts.findIndex(prompt => prompt.name === promptName);
      if (promptIndex !== -1) {
        savedPrompts[promptIndex].content = promptContent;
      } else {
        savedPrompts.push({ name: promptName, content: promptContent });
      }
      localStorage.setItem('systemPrompts', JSON.stringify(savedPrompts));
      loadSystemPrompts();
      promptNameInput.value = promptInput.value = '';
      promptNameInput.readOnly = false;
    }
  }

function deleteSystemPrompt(promptName) {
    const savedPrompts = JSON.parse(localStorage.getItem('systemPrompts')) || [];
    const updatedPrompts = savedPrompts.filter(prompt => prompt.name !== promptName);
    localStorage.setItem('systemPrompts', JSON.stringify(updatedPrompts));

    const systemPromptList = document.getElementById('system-prompt-list');
    const selectedPromptName = systemPromptList.options[systemPromptList.selectedIndex].text;

    loadSystemPrompts();

    if (promptName === selectedPromptName) {
        const systemPromptBox = document.getElementById('system-prompt-box');
        systemPromptBox.value = systemPromptList.value;
        adjustTextareaHeight(systemPromptBox);
    }
}

function toggleButtons() {
    const sendButton = document.getElementById('send');
    const stopButton = document.getElementById('stop');
    if (isStreaming) {
        sendButton.style.display = 'none';
        stopButton.style.display = 'block';
    } else {
        sendButton.style.display = 'block';
        stopButton.style.display = 'none';
    }
}

function updateChat(role, message = '') {
    const chatWindow = document.getElementById("chat-window");
    const msgWindow = document.createElement('div');
    const persona = document.getElementById('system-prompt-list').options[document.getElementById('system-prompt-list').selectedIndex].text.trim();
    msgWindow.className = "msg-window";
    msgWindow.innerHTML = `
      <img class="chat-dp ${role}" src="${dpPath[role]}">
      <div class="msg-container">
        <h3>${role === "user" ? "You" : persona}</h3>
        <div class="message ${role}">${message}</div>
      </div>
    `;

    chatWindow.appendChild(msgWindow);
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
  
    if (role === "system") {
      const codeBlocks = msgWindow.querySelectorAll('.message.system code');
      codeBlocks.forEach((block) => {
        block.classList.add('language-python');
        Prism.highlightElement(block);
      });
      return msgWindow.querySelector('.message');
    }
}

async function sendMessage() {
    const systemPrompt = document.getElementById('system-prompt-box').value.trim();
    const input = document.getElementById("input");
    const inputVal = input.value.trim();
    const model = document.getElementById('model-list').value;

    if (systemPrompt) {
        if (messages.length === 0 || messages[0].role !== "system") {
            messages.unshift({ role: "system", content: systemPrompt });
        } else {
            messages[0].content = systemPrompt;
        }
    } else if (messages.length > 0 && messages[0].role === "system") {
        messages.shift();
    }

    updateMemory("user");
    if (!inputVal) return;
    input.value = "";
    
    updateChat("user", inputVal);
    const responseDiv = updateChat("system");

    isStreaming = true; // Set streaming state to true
    toggleButtons();
    abortController = new AbortController();
    let error = null;

    try {
        const chatWindow = document.getElementById("chat-window");
        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: messages
          }),
          signal: abortController.signal
        });
    
        const reader = response.body.getReader();
        let content = '';
    
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
    
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(Boolean);
    
          for (const line of lines) {
            const data = JSON.parse(line);
    
            if (data.message && data.message.content) {
              content += data.message.content;
              const formattedContent = content.replace(/```(\w+)([\s\S]*?)```/g, '<pre class="code-block"><code class="language-$1">$2</code></pre>');
              responseDiv.innerHTML = formattedContent;
              Prism.highlightAll();
              chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
            }
    
            if (data.done) {
              updateMemory("assistant");
              isStreaming = false;
              toggleButtons();
              break;
            }
          }
        }
    } catch (err) {
        error = err;
        isStreaming = false; // Set streaming state to false
        if (error.name === 'AbortError') {
            console.log('Request aborted');
            toggleButtons();
        } else {
            console.error('Error:', error);
        }
    } finally {
        abortController = null;
        if (!error || error.name !== 'AbortError') {
            toggleButtons();
        }
    }
}

function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 420) + 'px';
}

document.getElementById("input").addEventListener("keypress", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

document.querySelectorAll('.settings-dp').forEach((img, index) => {
    img.addEventListener('click', () => {
        document.getElementById('file-input').click();
        document.getElementById('file-input').onchange = function() {
            const file = this.files[0];
            const reader = new FileReader();

            reader.onloadend = function() {
                img.src = reader.result;
                dpPath[index === 0 ? 'user' : 'system'] = reader.result;
                refreshDp();
            };

            if (file) {
                reader.readAsDataURL(file);
            }
        };
    });
});

document.addEventListener('DOMContentLoaded', () => {
    updateModelDropdown();
    loadSystemPrompts();
    document.getElementById('system-prompt-box').value = document.getElementById('system-prompt-list').value;
    
    adjustTextareaHeight(document.getElementById('system-prompt-box'));

    document.getElementById('system-prompt-list').addEventListener('change', function() {
        const systemPromptBox = document.getElementById('system-prompt-box');
        systemPromptBox.value = this.value;
        adjustTextareaHeight(systemPromptBox);
        clearHistory();
        messages = []
    });

    document.getElementById('prompt-input').addEventListener('input', function() {
        adjustTextareaHeight(this);
    });

    document.getElementById('manage-prompts-btn').addEventListener('click', () => {
        document.getElementById('prompt-popup').style.display = 'flex';
    });

    document.getElementById('close-popup-btn').addEventListener('click', () => {
        document.getElementById('prompt-popup').style.display = 'none';
    });

    document.getElementById('save-prompt-btn').addEventListener('click', saveSystemPrompt);
});