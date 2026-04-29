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
const audioLibraryEl = document.getElementById('audio-library');
const dropArea = document.getElementById('drop-area');
const audioBrowserPanel = document.getElementById('audio-browser-panel');
const browserResizer = document.getElementById('browser-resizer');
const workspacePanel = document.getElementById('workspace-panel');
const workspaceResizer = document.getElementById('workspace-resizer');
const playlistResizer = document.getElementById('playlist-resizer');
const timelineContainerEl = document.getElementById('timeline-container');
const pianoRollContainer = document.getElementById('piano-roll-container');
const mixerChannelsEl = document.getElementById('mixer-channels');
const instrumentModal = document.getElementById('instrument-modal');
const instrumentTrackSelect = document.getElementById('instrument-track-select');
const instrumentTypeSelect = document.getElementById('instrument-type');
const pitchInput = document.getElementById('pitch-input');
const rangeInput = document.getElementById('range-input');
const instrumentSaveButton = document.getElementById('instrument-save-button');
const instrumentCloseButton = document.getElementById('instrument-close-button');
const keyboardContainerEl = document.getElementById('keyboard-container');

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
  // Remove previous playhead
  document.querySelectorAll('.playhead').forEach(ph => ph.remove());

  // Add new playhead
  const lanes = document.querySelectorAll('.timeline-track-lane');
  lanes.forEach(lane => {
    const playhead = document.createElement('div');
    playhead.className = 'playhead';
    playhead.style.left = `${(stepIndex / 16) * 100}%`;
    lane.append(playhead);
  });
}

function renderMixerChannels() {
  if (!mixerChannelsEl) return;
  mixerChannelsEl.innerHTML = '';
  tracks.forEach(track => {
    const channel = document.createElement('div');
    channel.className = `mixer-channel${track.id === selectedTrackId ? ' selected' : ''}`;
    channel.dataset.trackId = track.id;

    const name = document.createElement('div');
    name.className = 'mixer-channel-name';
    name.textContent = track.name;

    const volumeControl = document.createElement('div');
    volumeControl.className = 'mixer-control';

    const volumeLabel = document.createElement('label');
    volumeLabel.textContent = 'Vol';

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.01';
    volumeSlider.value = track.volume;
    volumeSlider.addEventListener('input', (e) => {
      track.volume = parseFloat(e.target.value);
    });

    volumeControl.append(volumeLabel, volumeSlider);

    const panControl = document.createElement('div');
    panControl.className = 'mixer-control';

    const panLabel = document.createElement('label');
    panLabel.textContent = 'Pan';

    const panSlider = document.createElement('input');
    panSlider.type = 'range';
    panSlider.min = '-1';
    panSlider.max = '1';
    panSlider.step = '0.01';
    panSlider.value = track.pan;
    panSlider.addEventListener('input', (e) => {
      track.pan = parseFloat(e.target.value);
    });

    panControl.append(panLabel, panSlider);

    channel.append(name, volumeControl, panControl);
    channel.addEventListener('click', () => selectTrack(track.id));
    mixerChannelsEl.append(channel);
  });
}

function createTrack(name) {
  const track = {
    id: nextTrackId++,
    name,
    instrument: 'Keyboard',
    instrumentType: 'Keyboard',
    pitch: 'C4',
    range: '2 octaves',
    volume: 1.0,
    pan: 0,
    clips: [],
    notes: [],
    muted: false,
    solo: false,
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
      step.className = `track-step${track.steps[i] ? ' active' : ''}`;
      step.dataset.step = i;
      step.addEventListener('click', () => {
        track.steps[i] = !track.steps[i];
        step.classList.toggle('active', track.steps[i]);
      });
      steps.append(step);
    }

    row.append(heading, controls, steps);
    trackGridEl.append(row);
  });
}

function renderMixerChannels() {
  if (!mixerChannelsEl) return;
  mixerChannelsEl.innerHTML = '';
  tracks.forEach(track => {
    const channel = document.createElement('div');
    channel.className = `mixer-channel${track.id === selectedTrackId ? ' selected' : ''}`;
    channel.dataset.trackId = track.id;

    const name = document.createElement('div');
    name.className = 'mixer-channel-name';
    name.textContent = track.name;

    const faderTrack = document.createElement('div');
    faderTrack.className = 'fader-track';

    const faderThumb = document.createElement('div');
    faderThumb.className = 'fader-thumb';
    faderThumb.style.bottom = `${track.volume * 100}%`;
    faderTrack.append(faderThumb);

    const buttons = document.createElement('div');
    buttons.className = 'mixer-button-row';

    const muteButton = document.createElement('button');
    muteButton.type = 'button';
    muteButton.className = 'mixer-button';
    muteButton.textContent = track.muted ? 'Unmute' : 'Mute';
    muteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      track.muted = !track.muted;
      updateTrackUI();
    });

    const soloButton = document.createElement('button');
    soloButton.type = 'button';
    soloButton.className = 'mixer-button';
    soloButton.textContent = track.solo ? 'Unsolo' : 'Solo';
    soloButton.addEventListener('click', (e) => {
      e.stopPropagation();
      track.solo = !track.solo;
      updateTrackUI();
    });

    buttons.append(muteButton, soloButton);

    faderThumb.addEventListener('mousedown', (event) => {
      event.preventDefault();
      const startY = event.clientY;
      const startVolume = track.volume;

      function onMouseMove(moveEvent) {
        const delta = startY - moveEvent.clientY;
        const newVolume = Math.min(1, Math.max(0, startVolume + delta / 120));
        track.volume = newVolume;
        faderThumb.style.bottom = `${newVolume * 100}%`;
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        updateTrackUI();
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    channel.append(name, faderTrack, buttons);
    channel.addEventListener('click', () => selectTrack(track.id));
    mixerChannelsEl.append(channel);
  });
}

function updateTrackUI() {
  renderTimeline();
  renderMixerChannels();
  renderPianoRoll();
  updateInstrumentTrackOptions();
  updateAudioLibraryUI();
}

function renderTimeline() {
  if (!timelineContainerEl) return;
  timelineContainerEl.innerHTML = '';

  if (tracks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No tracks yet. Add one to get started.';
    timelineContainerEl.append(empty);
    return;
  }

  // Timeline header with time markers
  const header = document.createElement('div');
  header.className = 'timeline-header';
  for (let i = 0; i < 16; i++) {
    const marker = document.createElement('div');
    marker.className = 'time-marker';
    marker.textContent = i + 1;
    header.append(marker);
  }
  timelineContainerEl.append(header);

  // Track rows
  tracks.forEach(track => {
    const trackRow = document.createElement('div');
    trackRow.className = `timeline-track-row${track.id === selectedTrackId ? ' selected' : ''}`;
    trackRow.dataset.trackId = track.id;

    const trackName = document.createElement('div');
    trackName.className = 'timeline-track-name';
    trackName.textContent = track.name;
    trackName.addEventListener('click', () => selectTrack(track.id));

    const trackLane = document.createElement('div');
    trackLane.className = 'timeline-track-lane';
    trackLane.dataset.trackId = track.id;

    // Add drop event for placing clips
    trackLane.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    trackLane.addEventListener('drop', (e) => {
      e.preventDefault();
      const fileId = e.dataTransfer.getData('text/plain');
      if (fileId) {
        const rect = trackLane.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const step = Math.floor(x / (rect.width / 16));
        placeClipOnTrack(track.id, fileId, step);
      }
    });

    // Render existing clips
    track.clips.forEach((clip, index) => {
      const clipEl = document.createElement('div');
      clipEl.className = 'timeline-clip';
      clipEl.style.left = `${(clip.startTime / 16) * 100}%`;
      clipEl.style.width = `${(clip.duration / 16) * 100}%`;
      clipEl.textContent = audioFiles.find(f => f.id === clip.fileId)?.name || 'Clip';
      clipEl.dataset.clipIndex = index;
      clipEl.dataset.trackId = track.id;

      // Add resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'clip-resize-handle';
      clipEl.append(resizeHandle);

      // Add resize functionality
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startWidth = clipEl.offsetWidth;
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
      });

      function resize(e) {
        if (!isResizing) return;
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(20, startWidth + deltaX); // Min width
        const laneWidth = trackLane.offsetWidth;
        const newDuration = Math.round((newWidth / laneWidth) * 16);
        clip.duration = Math.max(1, newDuration);
        clipEl.style.width = `${(clip.duration / 16) * 100}%`;
      }

      function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        updateTrackUI(); // To refresh if needed
      }

      trackLane.append(clipEl);
    });

    trackRow.append(trackName, trackLane);
    timelineContainerEl.append(trackRow);
  });
}

function renderPianoRoll() {
  if (!pianoRollContainer) return;
  pianoRollContainer.innerHTML = '';
  const track = tracks.find((item) => item.id === selectedTrackId);
  if (!track) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Select a track to edit the piano roll.';
    pianoRollContainer.append(empty);
    return;
  }

  const notes = [
    'C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3', 'C3', 'B2', 'A2', 'G2', 'F2'
  ];
  const grid = document.createElement('div');
  grid.className = 'piano-roll-grid';
  grid.style.gridTemplateRows = `repeat(${notes.length}, 32px)`;

  for (let row = 0; row < notes.length; row += 1) {
    for (let col = 0; col < 16; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'piano-roll-cell';
      cell.dataset.note = notes[row];
      cell.dataset.step = col;
      const hasNote = track.notes.some(note => note.step === col && note.note === notes[row]);
      if (hasNote) cell.classList.add('active');
      cell.addEventListener('click', () => {
        const noteIndex = track.notes.findIndex(note => note.step === col && note.note === notes[row]);
        if (noteIndex >= 0) {
          track.notes.splice(noteIndex, 1);
        } else {
          track.notes.push({ step: col, note: notes[row], duration: 1 });
        }
        renderPianoRoll();
      });
      grid.append(cell);
    }
  }

  pianoRollContainer.append(grid);

  track.notes.forEach((note) => {
    const noteEl = document.createElement('div');
    noteEl.className = 'piano-roll-note';
    noteEl.textContent = note.note;
    noteEl.style.left = `${(note.step / 16) * 100}%`;
    const rowIndex = notes.indexOf(note.note);
    noteEl.style.top = `${(rowIndex / notes.length) * 100}%`;
    noteEl.style.width = `${(note.duration / 16) * 100}%`;
    pianoRollContainer.append(noteEl);
  });
}

function placeClipOnTrack(trackId, fileId, startStep) {
  const track = tracks.find(t => t.id === trackId);
  if (!track) return;
  // Default duration = 4 steps
  const duration = 4;
  track.clips.push({ fileId, startTime: startStep, duration });
  updateTrackUI();
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
    item.draggable = true;
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', file.id);
    });

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

    controls.append(playButton);
    item.append(title, controls);
    audioLibraryEl.append(item);
  });
}

function initResizablePanels() {
  if (browserResizer && audioBrowserPanel && workspacePanel) {
    let dragging = false;
    browserResizer.addEventListener('mousedown', (event) => {
      dragging = true;
      document.body.style.cursor = 'ew-resize';
      const startX = event.clientX;
      const startWidth = audioBrowserPanel.offsetWidth;

      function onMouseMove(moveEvent) {
        const delta = moveEvent.clientX - startX;
        audioBrowserPanel.style.width = `${Math.max(240, startWidth + delta)}px`;
      }

      function onMouseUp() {
        dragging = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  if (workspaceResizer && workspacePanel && document.getElementById('mixer-panel')) {
    const mixerPanel = document.getElementById('mixer-panel');
    workspaceResizer.addEventListener('mousedown', (event) => {
      document.body.style.cursor = 'ew-resize';
      const startX = event.clientX;
      const startWidth = workspacePanel.offsetWidth;
      const startMixWidth = mixerPanel.offsetWidth;

      function onMouseMove(moveEvent) {
        const delta = moveEvent.clientX - startX;
        workspacePanel.style.width = `${Math.max(440, startWidth + delta)}px`;
        mixerPanel.style.width = `${Math.max(280, startMixWidth - delta)}px`;
      }

      function onMouseUp() {
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  if (playlistResizer && document.getElementById('playlist-panel') && document.getElementById('piano-roll-panel')) {
    const playlistPanel = document.getElementById('playlist-panel');
    const pianoRollPanelEl = document.getElementById('piano-roll-panel');
    playlistResizer.addEventListener('mousedown', (event) => {
      document.body.style.cursor = 'ns-resize';
      const startY = event.clientY;
      const startPlaylistHeight = playlistPanel.offsetHeight;
      const startPianoHeight = pianoRollPanelEl.offsetHeight;

      function onMouseMove(moveEvent) {
        const delta = moveEvent.clientY - startY;
        playlistPanel.style.height = `${Math.max(240, startPlaylistHeight + delta)}px`;
        pianoRollPanelEl.style.height = `${Math.max(180, startPianoHeight - delta)}px`;
      }

      function onMouseUp() {
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
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

let lastStep = -1;

function handlePlayback(now) {
  if (!isPlaying) return;

  const delta = now - lastTickTime;
  elapsedMs += delta;
  lastTickTime = now;

  const intervalMs = (60 / tempo / 4) * 1000;
  currentStep = Math.floor(elapsedMs / intervalMs) % 16;

  if (currentStep !== lastStep) {
    // New step, play clips that start at this step
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.startTime === currentStep) {
          const file = audioFiles.find(f => f.id === clip.fileId);
          if (file && file.audio) {
            const audio = new Audio(file.url);
            audio.volume = track.volume;
            audio.play().catch(() => {});
          }
        }
      });
    });
    lastStep = currentStep;
  }

  highlightStep(currentStep);
  updateTimeDisplay();

  window.requestAnimationFrame(handlePlayback);
}

function startPlayback() {
  if (isPlaying) return;
  isPlaying = true;
  lastTickTime = performance.now();
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

  updateInstrumentUI();
}

function updateInstrumentUI() {
  const isKeyboard = instrumentTypeSelect.value === 'Keyboard';
  const pitchField = pitchInput.closest('.modal-field');
  const rangeField = rangeInput.closest('.modal-field');

  if (isKeyboard) {
    pitchField.classList.add('hidden');
    rangeField.classList.add('hidden');
    keyboardContainerEl.classList.remove('hidden');
    renderKeyboard();
  } else {
    pitchField.classList.remove('hidden');
    rangeField.classList.remove('hidden');
    keyboardContainerEl.classList.add('hidden');
  }
}

function renderKeyboard() {
  const trackId = Number(instrumentTrackSelect.value);
  const track = tracks.find((item) => item.id === trackId);
  if (!track) return;

  keyboardContainerEl.innerHTML = '';

  // Parse range, default to 2 octaves
  const rangeMatch = track.range.match(/(\d+)/);
  const octaves = rangeMatch ? parseInt(rangeMatch[1]) : 2;

  // Start from C4, for simplicity
  const startNote = 60; // C4 MIDI note
  const endNote = startNote + octaves * 12;

  const keyboard = document.createElement('div');
  keyboard.className = 'keyboard';

  const whiteKeys = [];
  const blackKeys = [];

  for (let note = startNote; note < endNote; note++) {
    const noteName = getNoteName(note);
    const isBlack = noteName.includes('#');

    const key = document.createElement('div');
    key.className = `key ${isBlack ? 'black' : 'white'}${noteName === track.pitch ? ' active' : ''}`;
    key.dataset.note = note;
    key.textContent = noteName.replace('#', '♯');

    key.addEventListener('click', () => {
      track.pitch = noteName;
      renderKeyboard(); // Re-render to highlight
    });

    if (isBlack) {
      blackKeys.push(key);
    } else {
      whiteKeys.push(key);
    }
  }

  // Append white keys first
  whiteKeys.forEach(key => keyboard.append(key));
  // Then black keys
  blackKeys.forEach(key => keyboard.append(key));

  keyboardContainerEl.append(keyboard);
}

function getNoteName(midiNote) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteIndex = midiNote % 12;
  return notes[noteIndex] + octave;
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

if (instrumentTypeSelect) {
  instrumentTypeSelect.addEventListener('change', updateInstrumentUI);
}

if (instrumentSaveButton) {
  instrumentSaveButton.addEventListener('click', saveInstrumentSettings);
}

initResizablePanels();
loadDefaultSamples();
createTrack('Track 1');
createTrack('Track 2');
createTrack('Track 3');
selectedTrackId = tracks[0]?.id || null;
updateTrackUI();
updateTimeDisplay();
