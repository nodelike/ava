let dpPath = { user: "user.png", system: "system.jpg"}

function refreshDp() {
    document.querySelectorAll('.chat-dp').forEach(function(img) {
        var role = img.closest('.msg-window').querySelector('.message').classList.contains('user') ? 'user' : 'system';
        img.src = dpPath[role];
    });
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
    const input = document.getElementById("input");
    const inputVal = input.value.trim();
    if (!inputVal) return;
    input.value = "";
    updateChat("user", inputVal);
    updateChat("system");

    const source = new EventSource("http://localhost:8080/stream");
    source.onmessage = event => {
        const responseDiv = document.getElementById("response");
        const chatWindow = document.getElementById("chat-window");
        if (event.data === "end-stream") {
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
        body: JSON.stringify({ prompt: inputVal }),
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