import re
import io
import base64
import logging
from queue import Queue
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import ollama
from melo.api import TTS
import numpy as np

logging.getLogger("transformers.configuration_utils").setLevel(logging.ERROR)
logging.getLogger("transformers.modeling_utils").setLevel(logging.ERROR)
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

smodel = TTS(language='EN', device="cpu")
speaker_ids = smodel.hps.data.spk2id
app = Flask(__name__)
CORS(app)
responses = Queue()
audio_data = None


@app.route('/get_models')
def get_models():
    model_data = ollama.list()
    model_names = [model['name'] for model in model_data['models']]
    return jsonify(model_names)

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    global audio_data
    audio_data = None
    try:
        data = request.json
        messages = data.get('messages', [])
        enable_voice = data.get('enable_voice', False)
        model = data.get('model', 'dolphin-mistral')
        response = ""
        try:
            for part in ollama.chat(model, messages=messages, stream=True):
                responses.put(part['message']['content'])
                response += part['message']['content']
        except Exception as e:
            app.logger.error(f"Error in chat stream: {e}")
            responses.put("end-stream")
            return jsonify(error=str(e)), 500
        responses.put("end-stream")
        if enable_voice:
            try:
                wav_io = io.BytesIO()
                smodel.tts_to_file(response, speaker_ids['EN-US'], wav_io, format='wav', speed=1.0, quiet=True)
                audio_data = base64.b64encode(wav_io.getvalue()).decode('utf-8')
            except Exception as e:
                app.logger.error(f"Error in TTS conversion: {e}")
                return jsonify(error=str(e)), 500
        return jsonify(success=True)
    except Exception as e:
        app.logger.error(f"Error in chat_endpoint: {e}")
        return jsonify(error=str(e)), 500

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

@app.route('/audio', methods=['GET'])
def get_audio():
    return jsonify(audio_data=audio_data) if audio_data else jsonify(message="No audio data available")

if __name__ == '__main__':
    # print("Server is ready")
    app.run(port=8080)
