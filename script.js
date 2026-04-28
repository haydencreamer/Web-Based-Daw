const startButton = document.getElementById('start-button');
if (startButton) {
  startButton.addEventListener('click', () => {
    window.location.href = 'daw.html';
  });
}

const bpmInput = document.getElementById('bpm-input');
const playButton = document.getElementById('play-button');
const pauseButton = document.getElementById('pause-button');
const stopButton = document.getElementById('stop-button');
const timeDisplay = document.getElementById('time-display');
const addTrackButton = document.getElementById('add-track-button');
const instrumentsButton = document.getElementById('instruments-button');
const insertFileButton = document.getElementById('insert-file-button');
const fileInput = document.getElementById('file-input');
const trackListEl = document.getElementById('track-list');
const trackGridEl = document.getElementById('track-grid');
const dropArea = document.getElementById('drop-area');
const audioLibraryEl = document.getElementById('audio-library');
const instrumentModal = document.getElementById('instrument-modal');
const instrumentTrackSelect = document.getElementById('instrument-track-select');
const instrumentTypeSelect = document.getElementById('instrument-type');
const pitchInput = document.getElementById('pitch-input');
const rangeInput = document.getElementById('range-input');
const instrumentSaveButton = document.getElementById('instrument-save-button');
const instrumentCloseButton = document.getElementById('instrument-close-button');

let tempo = 120;
let isPlaying = false;
let currentStep = 0;
let elapsedMs = 0;
let lastTickTime = 0;
let selectedTrackId = null;
let nextTrackId = 1;
const tracks = [];
const audioFiles = [];
const previewAudioElements = {};
const sampleLibrary = [
  { id: 'sample-808-kick', name: '808 Kick', url: 'samples/808-kick.wav' },
  { id: 'sample-808-snare', name: '808 Snare', url: 'samples/808-snare.wav' },
  { id: 'sample-808-clap', name: '808 Clap', url: 'samples/808-clap.wav' },
  { id: 'sample-808-hihat', name: '808 Hi-Hat', url: 'samples/808-hihat.wav' },
  { id: 'sample-808-bass', name: '808 Bass', url: 'samples/808-bass.wav' },
];

function clampTempo(value) {
  return Math.min(240, Math.max(40, Number(value) || 120));
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimeDisplay() {
  if (timeDisplay) {
    timeDisplay.textContent = formatTime(elapsedMs);
  }
}

function highlightStep(stepIndex) {
  document.querySelectorAll('.track-step').forEach((stepEl, index) => {
    const trackStepIndex = index % 16;
    stepEl.classList.toggle('active', trackStepIndex === stepIndex);
  });
}

function updateTrackUI() {
  renderTrackList();
  renderTrackGrid();
  updateInstrumentTrackOptions();
  updateAudioLibraryUI();
}

function createTrack(name) {
  const track = {
    id: nextTrackId++,
    name,
    instrument: 'Keyboard',
    instrumentType: 'Keyboard',
    pitch: 'C4',
    range: '2 octaves',
    audioClipId: null,
  };
  tracks.push(track);
  selectedTrackId = track.id;
  updateTrackUI();
}

function removeTrack(id) {
  const index = tracks.findIndex((track) => track.id === id);
  if (index === -1) return;
  tracks.splice(index, 1);
  if (selectedTrackId === id) {
    selectedTrackId = tracks.length ? tracks[0].id : null;
  }
  updateTrackUI();
}

function renameTrack(id) {
  const track = tracks.find((item) => item.id === id);
  if (!track) return;
  const newName = prompt('Rename track:', track.name);
  if (typeof newName === 'string' && newName.trim().length > 0) {
    track.name = newName.trim();
    updateTrackUI();
  }
}

function selectTrack(id) {
  selectedTrackId = id;
  updateTrackUI();
}

function assignClipToTrack(trackId, fileId) {
  const track = tracks.find((item) => item.id === trackId);
  if (!track) return;
  track.audioClipId = fileId;
  updateTrackUI();
}

function renderTrackList() {
  if (!trackListEl) return;
  trackListEl.innerHTML = '';
  if (tracks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No tracks yet. Add one to get started.';
    trackListEl.append(empty);
    return;
  }
  tracks.forEach((track) => {
    const card = document.createElement('div');
    card.className = `track-card${track.id === selectedTrackId ? ' selected' : ''}`;
    card.dataset.trackId = track.id;

    const title = document.createElement('div');
    title.textContent = track.name;

    const renameButton = document.createElement('button');
    renameButton.className = 'track-rename-btn';
    renameButton.textContent = '✎';
    renameButton.title = 'Rename track';
    renameButton.addEventListener('click', (event) => {
      event.stopPropagation();
      renameTrack(track.id);
    });

    const removeButton = document.createElement('button');
    removeButton.className = 'track-remove-btn';
    removeButton.textContent = '×';
    removeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      removeTrack(track.id);
    });

    const actionGroup = document.createElement('div');
    actionGroup.className = 'track-card-actions';
    actionGroup.append(renameButton, removeButton);

    card.append(title, actionGroup);
    card.addEventListener('click', () => selectTrack(track.id));
    trackListEl.append(card);
  });
}

function renderTrackGrid() {
  if (!trackGridEl) return;
  trackGridEl.innerHTML = '';
  if (tracks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No tracks to arrange yet.';
    trackGridEl.append(empty);
    return;
  }
  tracks.forEach((track) => {
    const row = document.createElement('div');
    row.className = `track-row${track.id === selectedTrackId ? ' selected' : ''}`;
    row.dataset.trackId = track.id;

    const heading = document.createElement('div');
    heading.className = 'track-heading';
    heading.innerHTML = `
      <div class="track-name">${track.name}</div>
      <div class="track-meta">${track.pitch} · ${track.range}</div>
    `;

    const controls = document.createElement('div');
    controls.className = 'track-controls';

    const assignButton = document.createElement('button');
    assignButton.type = 'button';
    assignButton.className = 'panel-button small';
    assignButton.textContent = 'Assign Clip';
    assignButton.addEventListener('click', () => {
      selectTrack(track.id);
      alert('Then click an audio file from the library below to assign it to this track.');
    });

    const clipLabel = document.createElement('div');
    clipLabel.className = 'track-clip-label';
    clipLabel.textContent = track.audioClipId
      ? `Clip: ${audioFiles.find((file) => file.id === track.audioClipId)?.name || 'Unknown'}`
      : 'No clip assigned';

    controls.append(assignButton, clipLabel);

    const steps = document.createElement('div');
    steps.className = 'track-steps';
    steps.dataset.track = track.id;

    for (let i = 0; i < 16; i += 1) {
      const step = document.createElement('div');
      step.className = 'track-step';
      steps.append(step);
    }

    row.append(heading, controls, steps);
    trackGridEl.append(row);
  });
}

function updateInstrumentTrackOptions() {
  if (!instrumentTrackSelect) return;
  instrumentTrackSelect.innerHTML = '';
  tracks.forEach((track) => {
    const option = document.createElement('option');
    option.value = track.id;
    option.textContent = track.name;
    if (track.id === selectedTrackId) {
      option.selected = true;
    }
    instrumentTrackSelect.append(option);
  });
}

function updateAudioLibraryUI() {
  if (!audioLibraryEl) return;
  audioLibraryEl.innerHTML = '';
  if (audioFiles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No audio files loaded yet. Use insert files or drag audio here.';
    audioLibraryEl.append(empty);
    return;
  }
  audioFiles.forEach((file) => {
    const item = document.createElement('div');
    item.className = 'audio-file-item';

    const title = document.createElement('span');
    title.textContent = file.name;

    const controls = document.createElement('div');
    controls.className = 'audio-file-controls';

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'sample-play-btn';
    playButton.textContent = '▶';
    playButton.title = 'Preview sample';
    playButton.addEventListener('click', (event) => {
      event.stopPropagation();
      previewFile(file.id);
    });

    const assignButton = document.createElement('button');
    assignButton.type = 'button';
    assignButton.className = 'panel-button small';
    assignButton.textContent = 'Assign';
    assignButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!selectedTrackId) {
        alert('Select a track before assigning a clip.');
        return;
      }
      assignClipToTrack(selectedTrackId, file.id);
    });

    controls.append(playButton, assignButton);
    item.append(title, controls);
    audioLibraryEl.append(item);
  });
}

function getUniqueAudioId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `audio-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function loadFiles(files) {
  Array.from(files).forEach((file) => {
    const lowerName = file.name.toLowerCase();
    if (!file.type.includes('audio') && !lowerName.endsWith('.wav') && !lowerName.endsWith('.mp3')) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.preload = 'metadata';
    audioFiles.push({ id: getUniqueAudioId(), name: file.name, url, audio });
  });
  updateAudioLibraryUI();
}

function loadDefaultSamples() {
  sampleLibrary.forEach((sample) => {
    const audio = new Audio(sample.url);
    audio.preload = 'metadata';
    audioFiles.push({ id: sample.id, name: sample.name, url: sample.url, audio });
  });
}

function stopPreview(fileId) {
  const file = audioFiles.find((item) => item.id === fileId);
  if (!file || !file.audio) return;
  file.audio.pause();
  file.audio.currentTime = 0;
}

function previewFile(fileId) {
  audioFiles.forEach((item) => {
    if (item.audio && item.id !== fileId) {
      item.audio.pause();
      item.audio.currentTime = 0;
    }
  });
  const file = audioFiles.find((item) => item.id === fileId);
  if (!file || !file.audio) return;
  file.audio.currentTime = 0;
  file.audio.play().catch(() => {
    console.warn('Preview play failed:', file.name);
  });
}

function stopAllClips() {
  audioFiles.forEach((file) => {
    file.audio.pause();
    file.audio.currentTime = 0;
  });
}

function pauseAllClips() {
  audioFiles.forEach((file) => {
    file.audio.pause();
  });
}

function playAllClips() {
  audioFiles.forEach((file) => {
    const isAssigned = tracks.some((track) => track.audioClipId === file.id);
    if (!isAssigned) return;
    file.audio.play().catch(() => {});
  });
}

function handlePlayback(now) {
  if (!isPlaying) return;

  const delta = now - lastTickTime;
  elapsedMs += delta;
  lastTickTime = now;

  const intervalMs = (60 / tempo / 4) * 1000;
  currentStep = Math.floor(elapsedMs / intervalMs) % 16;

  highlightStep(currentStep);
  updateTimeDisplay();

  window.requestAnimationFrame(handlePlayback);
}

function startPlayback() {
  if (isPlaying) return;
  isPlaying = true;
  lastTickTime = performance.now();
  playAllClips();
  highlightStep(currentStep);
  window.requestAnimationFrame(handlePlayback);
}

function pausePlayback() {
  if (!isPlaying) return;
  isPlaying = false;
  pauseAllClips();
}

function stopPlayback() {
  isPlaying = false;
  elapsedMs = 0;
  currentStep = 0;
  stopAllClips();
  highlightStep(currentStep);
  updateTimeDisplay();
}

function openInstrumentModal() {
  if (tracks.length === 0) {
    alert('Add a track before opening instruments.');
    return;
  }
  if (!selectedTrackId) {
    selectedTrackId = tracks[0].id;
  }
  updateInstrumentTrackOptions();
  syncInstrumentForm();
  instrumentModal.classList.remove('hidden');
}

function closeInstrumentModal() {
  instrumentModal.classList.add('hidden');
}

function syncInstrumentForm() {
  const trackId = Number(instrumentTrackSelect.value);
  const track = tracks.find((item) => item.id === trackId);
  if (!track) return;
  instrumentTypeSelect.value = track.instrumentType || 'Keyboard';
  pitchInput.value = track.pitch;
  rangeInput.value = track.range;
}

function saveInstrumentSettings() {
  const trackId = Number(instrumentTrackSelect.value);
  const track = tracks.find((item) => item.id === trackId);
  if (!track) return;

  track.instrumentType = instrumentTypeSelect.value;
  track.instrument = instrumentTypeSelect.value;
  track.pitch = pitchInput.value || 'C4';
  track.range = rangeInput.value || '2 octaves';

  updateTrackUI();
  closeInstrumentModal();
}

if (bpmInput) {
  bpmInput.addEventListener('change', (event) => {
    tempo = clampTempo(event.target.value);
    bpmInput.value = tempo;
  });

  bpmInput.addEventListener('wheel', (event) => {
    event.preventDefault();
    const nextValue = clampTempo(Number(bpmInput.value) + (event.deltaY > 0 ? -1 : 1));
    tempo = nextValue;
    bpmInput.value = tempo;
  });
}

if (addTrackButton) {
  addTrackButton.addEventListener('click', () => {
    createTrack(`Track ${tracks.length + 1}`);
  });
}

if (instrumentsButton) {
  instrumentsButton.addEventListener('click', openInstrumentModal);
}

if (insertFileButton && fileInput) {
  insertFileButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (event) => {
    if (event.target.files) {
      loadFiles(event.target.files);
    }
  });
}

if (dropArea) {
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropArea.classList.remove('dragover');
    });
  });

  dropArea.addEventListener('drop', (event) => {
    if (event.dataTransfer?.files) {
      loadFiles(event.dataTransfer.files);
    }
  });

  dropArea.addEventListener('click', () => {
    if (fileInput) fileInput.click();
  });
}

if (playButton) {
  playButton.addEventListener('click', startPlayback);
}

if (pauseButton) {
  pauseButton.addEventListener('click', pausePlayback);
}

if (stopButton) {
  stopButton.addEventListener('click', stopPlayback);
}

if (instrumentCloseButton) {
  instrumentCloseButton.addEventListener('click', closeInstrumentModal);
}

if (instrumentTrackSelect) {
  instrumentTrackSelect.addEventListener('change', syncInstrumentForm);
}

if (instrumentSaveButton) {
  instrumentSaveButton.addEventListener('click', saveInstrumentSettings);
}

loadDefaultSamples();
createTrack('Track 1');
createTrack('Track 2');
createTrack('Track 3');
selectedTrackId = tracks[0]?.id || null;
updateTrackUI();
updateTimeDisplay();
