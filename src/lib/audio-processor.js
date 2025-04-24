// public/audio-processor.js
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.port.onmessage = (event) => {
        // Можно получать сообщения от основного потока, если нужно
        console.log('AudioWorkletProcessor received message:', event.data);
      };
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0]; // Первый входной канал
      if (input.length > 0) {
        const inputData = input[0]; // Первый канал данных (моно)
        if (inputData && inputData.length > 0) {
          // Отправляем данные в основной поток через port.postMessage
          this.port.postMessage(inputData);
        }
      }
      return true; // Продолжать обработку
    }
  }
  
  registerProcessor('audio-processor', AudioProcessor);