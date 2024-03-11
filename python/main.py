from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from ollama import chat
from melo.api import TTS
import logging
import re
from queue import Queue

logging.getLogger("transformers.configuration_utils").setLevel(logging.ERROR)
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)

tmodel = "sam"
smodel = TTS(language='EN', device="cpu")
speaker_ids = smodel.hps.data.spk2id

app = Flask(__name__)
CORS(app)
responses = Queue()

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    data = request.json
    prompt = data.get('prompt', '')
    messages = [{'role': 'user', 'content': prompt}]

    response = ""
    for part in chat(tmodel, messages=messages, stream=True):
        responses.put(part['message']['content'])
        response += part['message']['content']
    responses.put("end-stream")

    # pattern = r'```python(?:.|\n)*?```'
    # matches = re.findall(pattern, response)
    # exec_result = None
    # if matches:
    #     exec_result = eval(matches[0][10:-4])

    # smodel.tts_to_file(response, speaker_ids['EN-US'], "response.wav", speed=1.0, quiet=True)

    return jsonify(success=True)

@app.route('/stream')
def stream():
    def generate():
        while True:
            if not responses.empty():
                message = responses.get()
                yield f"data: {message}\n\n"
                if message == "end-stream":
                    break

    return Response(generate(), mimetype='text/event-stream')

if __name__ == '__main__':
    app.run(port=8080, debug=True)

