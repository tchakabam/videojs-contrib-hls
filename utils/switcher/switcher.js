import runSimulation from './run-simulation';
import displayTimeline from './display-timeline';
import Config from '../../src/config';

// a dynamic number of time-bandwidth pairs may be defined to drive the simulation
let networkTimeline = document.querySelector('.network-timeline');
let $ = document.querySelector.bind(document);

// apply any simulation parameters that were set in the fragment identifier
if (window.location.hash) {
  // time periods are specified as t<seconds>=<bitrate>
  // e.g. #t15=450560&t150=65530
  let params = window.location.hash.substring(1)
    .split('&')
    .map(function(param) {
      return ((/t(\d+)=(\d+)/i).exec(param) || [])
        .map(window.parseFloat).slice(1);
    }).filter(function(pair) {
      return pair.length === 2;
    });

  networkTimeline.innerHTML = '';
}

// collect the simulation parameters
const parameters = function() {
  let networkTrace = $('#network-trace').value
    .trim()
    .split('\n')
    .map((line) => line.split(' ').slice(-2).map(Number));
  let playlists = $('#bitrates').value
    .trim()
    .split('\n')
    .map((line) => {
      let t = line.split(/[,\s]+/).map(Number);
      return [t[0], t[1] || t[0]];
    });

  let segments = {};
  try {
    segments = JSON.parse($('#segments').value);
  } catch(e) {
    console.log('Invalid JSON');
  }

  let goalBufferLength = Math.max(1, Number($('#goal-buffer-length').value));
  let bandwidthVariance = Math.max(0.1, Number($('#bandwidth-variance').value));

  return {
    goalBufferLength,
    bandwidthVariance,
    playlists,
    segments,
    networkTrace
  };
};

let runButton = document.getElementById('run-simulation');
runButton.addEventListener('click', function() {
  runSimulation(parameters(), displayTimeline);
});

runButton.click();
