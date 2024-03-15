let dpPath = { user: "user.png", system: "system.jpg"}
let messages = [];

function refreshDp() {
    document.querySelectorAll('.chat-dp').forEach(function(img) {
        var role = img.closest('.msg-window').querySelector('.message').classList.contains('user') ? 'user' : 'system';
        img.src = dpPath[role];
    });
}

function updateMemory(role){
    if(role === "user"){
        const input = document.getElementById("input").value;
        messages.push({"role":"user", "content": input})
    } else {
        const response = document.getElementById("response").textContent;
        messages.push({"role":"assistant", "content": response});
    }
}

function clearHistory() {
    messages = [];
    const chatWindow = document.getElementById("chat-window");
    chatWindow.innerHTML = '';
}


function updateModelDropdown() {
    fetch('http://localhost:8080/get_models')
        .then(response => response.json())
        .then(models => {
            const modelSelect = document.getElementById('model-list');
            modelSelect.innerHTML = '';
            models.forEach(model => {
                const option = new Option(model, model);
                modelSelect.add(option);
            });

            modelSelect.addEventListener('change', clearHistory);
        })
        .catch(console.error);
}


function updateChat(role, message = '') {
    const chatWindow = document.getElementById("chat-window");
    const msgWindow = document.createElement('div');
    const chatdp = document.createElement('img');
    const msgContainer = document.createElement('div');
    const roleHeading = document.createElement('h3');
    const messageDiv = document.createElement('div');

    msgWindow.className = "msg-window";
    chatdp.className = "chat-dp " + role;
    msgContainer.className = "msg-container";
    messageDiv.className = "message " + role;
    chatdp.src = dpPath[role];
    roleHeading.textContent = role === "user" ? "You" : "Ava";

    messageDiv.textContent = message;
    if (role !== "user" && !document.getElementById("response")) {
        messageDiv.id = "response";
    }

    msgWindow.appendChild(chatdp);
    msgContainer.appendChild(roleHeading);
    msgContainer.appendChild(messageDiv);
    msgWindow.appendChild(msgContainer);
    chatWindow.appendChild(msgWindow);
    chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
}

function sendMessage() {
    updateMemory("user")
    const input = document.getElementById("input");
    const inputVal = input.value.trim();
    if (!inputVal) return;
    input.value = "";
    updateChat("user", inputVal);
    updateChat("system");

    const enableVoice = document.getElementById("voice").checked;
    const model = document.getElementById('model-list').value;

    const source = new EventSource("http://localhost:8080/stream");
    source.onmessage = event => {
        const responseDiv = document.getElementById("response");
        const chatWindow = document.getElementById("chat-window");
        if (event.data === "end-stream") {
            updateMemory("system")
            responseDiv.removeAttribute("id");
            source.close();
        } else {
            responseDiv.textContent += event.data;
            chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
        }
    };

    fetch('http://localhost:8080/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messages, enable_voice: enableVoice, model: model}),
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
                .catch((error) => {
                    console.error('Error:', error);
                });
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}


document.getElementById("input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});

document.querySelectorAll('.settings-dp').forEach(function(img, index) {
    img.addEventListener('click', function() {
        document.getElementById('file-input').click();
        document.getElementById('file-input').onchange = function() {
            var file = this.files[0];
            var reader = new FileReader();

            reader.onloadend = function() {
                img.src = reader.result;
                if (index === 0) {
                    dpPath.user = reader.result;
                } else {
                    dpPath.system = reader.result;
                }
                refreshDp();
            };

            if (file) {
                reader.readAsDataURL(file);
            }
        };
    });
});

document.addEventListener('DOMContentLoaded', (event) => {
    updateModelDropdown();
});