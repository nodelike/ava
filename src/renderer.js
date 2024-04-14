let dpPath = { user: "user.png", assistant: "assets/icon.ico" };
let messages = [];
let abortController = null;
let isStreaming = false;
// const osimages = ['os-face.gif', 'os-face1.gif', 'os-face2.gif', 'os-face3.gif', 'os-face4.gif', 'os-face5.gif'];
const osimages = ['os-face1.gif'];
let currentSessionId = '';
let currentPersonaId = '';

async function loadChats(){
  let sessions = []

  try {
    const chatHistoryPath = 'chat-history.json';
    const fileExists = await window.fileSystem.readFile(chatHistoryPath).then(() => true).catch(() => false);

    if (fileExists) {
      const response = await window.fileSystem.readFile(chatHistoryPath);
      if (response) {
        sessions = JSON.parse(response);
      }
    }
  } catch (error) {
    console.log("Failed to fetch chat-history.json:", error);
  }

  const chatListDiv = document.getElementById("chat-session-list");
  chatListDiv.innerHTML = "";
  for (const session of sessions) {
    let li = document.createElement("li");
    li.textContent = `chat-session-${session.session}`;
    li.addEventListener("click", () => loadChatSession(session.session));
    chatListDiv.appendChild(li);
  }
}

async function loadChatSession(sessionId) {
  currentSessionId = sessionId;
  messages = [];

  try {
    const chatHistoryPath = 'chat-history.json';
    const response = await window.fileSystem.readFile(chatHistoryPath);
    if (response) {
      const sessions = JSON.parse(response);
      const session = sessions.find(s => s.session === sessionId);
      if (session) {
        messages = session.messages;
        currentPersonaId = session.personaId;
        renderChatMessages();
      }
    }
  } catch (error) {
    console.log("Failed to load chat session:", error);
  }
}

function renderChatMessages() {
  const chatWindow = document.getElementById("chat-window");
  chatWindow.innerHTML = "";

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (i === 0 && message.role === "system") {
      continue; // Skip the first message if it has the role "system"
    }
    updateChat(message.role, message.content);
  }
}

async function updateChatHistory() {
  let sessions = [];

  try {
    const chatHistoryPath = 'chat-history.json';
    const fileExists = await window.fileSystem.readFile(chatHistoryPath).then(() => true).catch(() => false);

    if (fileExists) {
      const response = await window.fileSystem.readFile(chatHistoryPath);
      if (response) {
        sessions = JSON.parse(response);
      }
    }
  } catch (error) {
    console.log("Failed to fetch chat-history.json:", error);
  }

  if (currentSessionId == '') {
    let lastSessionNumber = 0;
    for (const session of sessions) {
      const sessionNumber = parseInt(session.session, 10);
      if (sessionNumber > lastSessionNumber) {
        lastSessionNumber = sessionNumber;
      }
    }
    currentSessionId = (lastSessionNumber + 1).toString().padStart(3, "0");
  }

  let currentSession = null;
  for (const session of sessions) {
    if (session.session == currentSessionId) {
      currentSession = session;
      break;
    }
  }

  if (!currentSession) {
    currentSession = {
      session: currentSessionId,
      personaId: currentPersonaId,
      messages: []
    };
    sessions.push(currentSession);
  }

  currentSession.messages = messages;

  try {
    const dataToWrite = JSON.stringify(sessions, null, 2);
    await window.fileSystem.writeFile('chat-history.json', dataToWrite);
    console.log('Chat history saved successfully');
  } catch (error) {
    console.error('Error writing to chat-history.json:', error);
  }

  loadChats();
}

function toggleChatHistory() {
    const chatHistoryPane = document.querySelector('.chat-history-pane');
    chatHistoryPane.classList.toggle('show');
}

function toggleSettings(event) {
    event.stopPropagation();
    const chatSettingsPane = document.querySelector('.chat-settings-pane');
    chatSettingsPane.classList.toggle('show');
  }
  
function handleDocumentClick(event) {
    const chatSettingsPane = document.querySelector('.chat-settings-pane');
    const chatHistoryPane = document.querySelector('.chat-history-pane');
    const target = event.target;

    if (!chatSettingsPane.contains(target)) {
        chatSettingsPane.classList.remove('show');
    }

    if (!chatHistoryPane.contains(target) && target.id !== 'history-btn') {
        chatHistoryPane.classList.remove('show');
    }
}

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert hours to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // Handle midnight (0 hours)
    
    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;
    document.getElementById('clock').textContent = timeString;
}
  
function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function setRandomBackgroundImage() {
    const container = document.getElementById("app")
    const shuffledImages = shuffleArray(osimages);
    const randomImage = shuffledImages[0];
    container.style.backgroundImage = `url('assets/os-faces/${randomImage}')`;
}

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
        img.src = dpPath[img.closest('.msg-window').querySelector('.message').classList.contains('user') ? 'user' : 'assistant'];
    });
}

function updateMemory(role) {
    messages.push({
      role: role,
      content: role === "user" ? document.getElementById("input").value : document.getElementById("chat-window").lastElementChild.querySelector('.message').textContent
    });
    updateChatHistory();
}

function clearHistory() {
  currentSessionId = '';
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


function loadSelectedOptions() {
  const selectedModel = localStorage.getItem('selectedModel');
  const selectedPersonaId = localStorage.getItem('selectedPersonaId');

  if (selectedModel) {
      document.getElementById('model-list').value = selectedModel;
  }

  if (selectedPersonaId) {
      const promptList = JSON.parse(localStorage.getItem('systemPrompts')) || [];
      const selectedPersona = promptList.find(prompt => prompt.id === selectedPersonaId);
      if (selectedPersona) {
        document.getElementById('system-prompt-list').value = selectedPersona.id;
        document.getElementById('system-prompt-box').value = selectedPersona.content;
        currentPersonaId = selectedPersonaId;
        adjustTextareaHeight(document.getElementById('system-prompt-box'));
      }
  }
}

function saveSelectedOptions() {
  const selectedModel = document.getElementById('model-list').value;
  const selectedPersonaId = currentPersonaId;
  localStorage.setItem('selectedModel', selectedModel);
  localStorage.setItem('selectedPersonaId', selectedPersonaId);
}

function editSystemPrompt(promptId) {
  const savedPrompts = JSON.parse(localStorage.getItem('systemPrompts')) || [];
  const promptToEdit = savedPrompts.find(prompt => prompt.id === promptId);
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
  savedPrompts.forEach(prompt => systemPromptList.add(new Option(prompt.name, prompt.id)));

  const promptList = document.getElementById('prompt-list');
  promptList.innerHTML = '';
  savedPrompts.forEach(prompt => {
      const btnDiv = document.createElement('div');
      const listItem = document.createElement('li');
      listItem.textContent = prompt.name;
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteSystemPrompt(prompt.id));
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => editSystemPrompt(prompt.id));
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
    const existingPrompt = savedPrompts.find(prompt => prompt.name === promptName);
    if (existingPrompt) {
      existingPrompt.content = promptContent;
    } else {
      const newPromptId = Date.now().toString(); // Generate a unique id based on timestamp
      savedPrompts.push({ id: newPromptId, name: promptName, content: promptContent });
    }
    localStorage.setItem('systemPrompts', JSON.stringify(savedPrompts));
    loadSystemPrompts();
    promptNameInput.value = promptInput.value = '';
    promptNameInput.readOnly = false;
  }
}

function clearPromptInputs() {
    document.getElementById('prompt-name-input').value = '';
    document.getElementById('prompt-input').value = '';
    document.getElementById('prompt-name-input').readOnly = false;
    adjustTextareaHeight(document.getElementById('prompt-input'));
}

function deleteSystemPrompt(promptId) {
  const savedPrompts = JSON.parse(localStorage.getItem('systemPrompts')) || [];
  const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== promptId);
  localStorage.setItem('systemPrompts', JSON.stringify(updatedPrompts));

  const systemPromptList = document.getElementById('system-prompt-list');
  const selectedPromptId = systemPromptList.value;

  loadSystemPrompts();

  if (promptId === selectedPromptId) {
      const systemPromptBox = document.getElementById('system-prompt-box');
      systemPromptBox.value = systemPromptList.options[systemPromptList.selectedIndex].text;
      currentPersonaId = systemPromptList.value;
      adjustTextareaHeight(systemPromptBox);
  }

  clearPromptInputs();
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
  
    if (role === "assistant") {
      const codeBlocks = msgWindow.querySelectorAll('.message.assistant code');
      codeBlocks.forEach((block) => {
        block.classList.add('language-python');
        Prism.highlightElement(block);
      });
      return msgWindow.querySelector('.message');
    }
}

async function updateSystemStats() {
    try {
      const stats = await window.ipcRenderer.invoke('get-system-stats');
  
      if (stats.cpuUsage) {
        document.getElementById('cpu-usage').textContent = `${stats.cpuUsage}%`;
      }
  
      if (stats.cpuTemp) {
        document.getElementById('cpu-temp').textContent = `${stats.cpuTemp}°C`;
      } else{
        document.getElementById('cpu-temp').textContent = `N/A`;
      }
  
      if (stats.memInfo) {
        document.getElementById('mem-usage').textContent = `${(stats.memInfo.usedMemMb/1000).toFixed(2)} GB`;
        document.getElementById('mem-total').textContent = `${(stats.memInfo.totalMemMb/1000).toFixed(2)} GB`;
      }
  
      if (stats.batteryLevel !== undefined) {
        document.getElementById('battery-level').style.color = stats.isCharging ? "#19ff6a" : stats.batteryLevel > 15 ? "var(--font-color)" : "red"
        document.getElementById('battery-level').textContent = `${stats.batteryLevel}%`;
      }
  
      if (stats.isCharging !== undefined) {
        document.getElementById('battery-charging').textContent = stats.isCharging ? 'Yes' : 'No';
      }
    } catch (error) {
      console.error('Error updating system stats:', error);
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
    const responseDiv = updateChat("assistant");

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
                dpPath[index === 0 ? 'user' : 'assistant'] = reader.result;
                refreshDp();
            };

            if (file) {
                reader.readAsDataURL(file);
            }
        };
    });
});

document.addEventListener('DOMContentLoaded', async () => {
  setRandomBackgroundImage()
  await updateModelDropdown();
  loadSystemPrompts();
  loadSelectedOptions();
  startClock();
  loadChats();

  const systemPromptList = document.getElementById('system-prompt-list');
  const selectedPrompt = JSON.parse(localStorage.getItem('systemPrompts')).find(prompt => prompt.id === systemPromptList.value);
  if (selectedPrompt) {
      document.getElementById('system-prompt-box').value = selectedPrompt.content;
      adjustTextareaHeight(document.getElementById('system-prompt-box'));
  }

  document.getElementById('model-list').addEventListener('change', function() {
      clearHistory();
      saveSelectedOptions();
  });
  
  document.getElementById('system-prompt-list').addEventListener('change', function() {
      const systemPromptBox = document.getElementById('system-prompt-box');
      const selectedPrompt = JSON.parse(localStorage.getItem('systemPrompts')).find(prompt => prompt.id === this.value);
      if (selectedPrompt) {
          systemPromptBox.value = selectedPrompt.content;
          currentPersonaId = selectedPrompt.id;
          adjustTextareaHeight(systemPromptBox);
          clearHistory();
          messages = [];
          saveSelectedOptions();
      }
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

    document.getElementById('clear-btn').addEventListener('click', clearPromptInputs);

    document.querySelector('#settings-btn').addEventListener('click', toggleSettings);
    document.querySelector('#history-btn').addEventListener('click', toggleChatHistory);

    document.addEventListener('click', handleDocumentClick);

    setInterval(updateSystemStats, 5000);
});