const AudioSynth = require('./audiosynth');

const synth = new AudioSynth();
let audio;
exports.play = (note, octave = 4, duration = 1) => {
  if (duration <= 0) return;
  audio = synth.play(0, note.toUpperCase(), octave, duration);
}

const c = new AudioContext();
const ramp = 0.05;

exports.sound = (freq, duration = 1) => {
  if (duration <= 0) return;

  duration = duration - ramp;  

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.frequency.value = freq;
  osc.start()
  
  setTimeout(() => {    
    gain.gain.exponentialRampToValueAtTime(0.00001, c.currentTime + 0.05);
  }, duration * 1000);
}

exports.close = () => {
  c.close();
  if (audio) audio.pause();
};
