document.addEventListener("DOMContentLoaded", function() {
    const source = new EventSource("http://localhost:8080/stream");

    source.onmessage = function(event) {
        if (event.data === "end-stream") {
            source.close();
        } else {
            document.getElementById("response").innerText += event.data;
        }
    };
});

function sendMessage() {
    var inputVal = document.getElementById("input").value;
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
