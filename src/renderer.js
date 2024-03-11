function updateMessages(role) {
    var responseDiv = document.getElementById("response");

    var messageDiv = document.createElement('div');
    messageDiv.classList.add("message", role);
    
    if (role === "user") {
        var inputElement = document.getElementById("input");
        if (inputElement) {
            messageDiv.textContent = inputElement.value;
            inputElement.value = "";
        }
    } else {
        
        if (responseDiv) {
            messageDiv.textContent = responseDiv.innerText;
            responseDiv.innerText = "";
        }
    }
    var chatWindow = document.getElementById("chat-window");
    if (chatWindow) {
        chatWindow.insertBefore(messageDiv, responseDiv);
    }
}

function sendMessage() {
    var inputVal = document.getElementById("input").value;

    updateMessages("user");

    const source = new EventSource("http://localhost:8080/stream");

    source.onmessage = function(event) {
        const responseDiv = document.getElementById("response");
        if (responseDiv) {
            if (event.data === "end-stream") {
                updateMessages("system");
                responseDiv.classList.remove("message");
                source.close();
            } else {
                responseDiv.classList.add("message");
                responseDiv.innerText += event.data;
            }
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
