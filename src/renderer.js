let dpPath = { user: "user.png", system: "system.jpg" };
let messages = [];

function refreshDp() {
    document.querySelectorAll('.chat-dp').forEach(img => {
        img.src = dpPath[img.closest('.msg-window').querySelector('.message').classList.contains('user') ? 'user' : 'system'];
    });
}

function updateMemory(role) {
    messages.push({
        role: role,
        content: role === "user" ? document.getElementById("input").value : document.getElementById("response").textContent
    });
}

function clearHistory() {
    messages = [];
    document.getElementById("chat-window").innerHTML = '';
}

function updateModelDropdown() {
    fetch('http://localhost:8080/get_models')
        .then(response => response.json())
        .then(models => {
            const modelSelect = document.getElementById('model-list');
            modelSelect.innerHTML = '';
            models.forEach(model => modelSelect.add(new Option(model, model)));
            modelSelect.addEventListener('change', clearHistory);
        })
        .catch(console.error);
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

function updateChat(role, message = '') {
    const chatWindow = document.getElementById("chat-window");
    const msgWindow = document.createElement('div');
    const persona = document.getElementById('system-prompt-list').options[document.getElementById('system-prompt-list').selectedIndex].text.trim();
    msgWindow.className = "msg-window";
    msgWindow.innerHTML = `
        <img class="chat-dp ${role}" src="${dpPath[role]}">
        <div class="msg-container">
            <h3>${role === "user" ? "You" : persona}</h3>
            <div class="message ${role}" ${role !== "user" && !document.getElementById("response") ? 'id="response"' : ''}>${message}</div>
        </div>
    `;
    chatWindow.appendChild(msgWindow);
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

function sendMessage() {
    const systemPrompt = document.getElementById('system-prompt-box').value.trim();
    const input = document.getElementById("input");
    const inputVal = input.value.trim();
    const enableVoice = document.getElementById("voice").checked;
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
    updateChat("system");
    

    const source = new EventSource("http://localhost:8080/stream");
    source.onmessage = event => {
        const responseDiv = document.getElementById("response");
        const chatWindow = document.getElementById("chat-window");
        if (event.data === "end-stream") {
            updateMemory("assistant");
            responseDiv.removeAttribute("id");
            source.close();
        } else {
            const formattedMessage = event.data.replace(/\n/g, '<br>');
            responseDiv.innerHTML += formattedMessage;
            chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
        }
    };

    fetch('http://localhost:8080/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messages, enable_voice: enableVoice, model: model }),
    })
    .then(() => {
        if (enableVoice) {
            fetch('http://localhost:8080/audio')
                .then(response => response.json())
                .then(data => {
                    if (data.audio_data) {
                        const audioBlob = new Blob([Uint8Array.from(atob(data.audio_data), c => c.charCodeAt(0))], { type: 'audio/wav' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        const audio = new Audio(audioUrl);
                        audio.play();
                    } else {
                        console.log(data.message);
                    }
                })
                .catch(console.error);
        }
    })
    .catch(console.error);
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