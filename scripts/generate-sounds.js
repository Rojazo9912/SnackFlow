const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../apps/web/public');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`Directory not found: ${OUTPUT_DIR}`);
    process.exit(1);
}

// WAV Header Helper
function writeWavHeader(sampleRate, numChannels, numSamples) {
    const blockAlign = numChannels * 2;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const chunkSize = 36 + dataSize;

    const buffer = Buffer.alloc(44);

    // RIFF chunk
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(chunkSize, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // BitsPerSample

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
}

// Sound Generators
function generateTone(freq, duration, type = 'sine', sampleRate = 44100) {
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = Buffer.alloc(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;

        // Simple Envelope
        let amplitude = 0.5;
        if (t < 0.05) amplitude *= t / 0.05; // Attack
        if (t > duration - 0.1) amplitude *= (duration - t) / 0.1; // Decay

        if (type === 'sine') {
            sample = Math.sin(2 * Math.PI * freq * t);
        } else if (type === 'sawtooth') {
            sample = 2 * (t * freq - Math.floor(t * freq + 0.5));
        } else if (type === 'square') {
            sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
        }

        // Apply Envelope
        sample *= amplitude;

        // Write 16-bit PCM
        const val = Math.max(-1, Math.min(1, sample)) * 32767;
        buffer.writeInt16LE(Math.floor(val), i * 2);
    }
    return { buffer, numSamples };
}

function generateRamp(startFreq, endFreq, duration, type = 'sine', sampleRate = 44100) {
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = Buffer.alloc(numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Linear chirp
        const currentFreq = startFreq + (endFreq - startFreq) * (t / duration);

        let sample = 0;
        // Phase accumulator would be better but this is 'good enough' for short fx
        const phase = 2 * Math.PI * (startFreq * t + (endFreq - startFreq) / (2 * duration) * t * t);

        let amplitude = 0.5;
        if (t < 0.05) amplitude *= t / 0.05;
        if (t > duration - 0.1) amplitude *= (duration - t) / 0.1;

        if (type === 'sine') {
            sample = Math.sin(phase);
        } else if (type === 'sawtooth') {
            // Approximation for ramp saw
            sample = 2 * ((t * currentFreq) % 1) - 1;
        }

        sample *= amplitude;

        const val = Math.max(-1, Math.min(1, sample)) * 32767;
        buffer.writeInt16LE(Math.floor(val), i * 2);
    }

    return { buffer, numSamples };
}

function saveWav(filename, { buffer, numSamples }, sampleRate = 44100) {
    const header = writeWavHeader(sampleRate, 1, numSamples);
    const finalBuffer = Buffer.concat([header, buffer]);
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), finalBuffer);
    console.log(`Generated ${filename}`);
}

// 1. Success: Cha-ching
// Combining two tones
const sampleRate = 44100;
const tone1 = generateTone(800, 0.15, 'sine', sampleRate);
const tone2 = generateTone(1200, 0.4, 'sine', sampleRate);
const successBuffer = Buffer.concat([tone1.buffer, tone2.buffer]);
const successSamples = tone1.numSamples + tone2.numSamples;
saveWav('success.wav', { buffer: successBuffer, numSamples: successSamples });

// 2. Error: Low Buzz
const errorTone = generateRamp(150, 100, 0.4, 'sawtooth', sampleRate);
saveWav('error.wav', errorTone);

// 3. Scan: Short High Beep
const scanTone = generateTone(1500, 0.1, 'sine', sampleRate);
saveWav('scan.wav', scanTone);

// 4. Delete: Descending
const deleteTone = generateRamp(600, 300, 0.25, 'sine', sampleRate);
saveWav('delete.wav', deleteTone);

console.log('All sounds generated in ' + OUTPUT_DIR);
