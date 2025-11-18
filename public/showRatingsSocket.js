// showRatingsSocket.js
// Handles real-time Show Ratings updates via WebSocket

const socket = new WebSocket(`ws://${location.hostname}:${location.port || 3001}`);

socket.addEventListener('message', function(event) {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'showRatingsUpdate') {
      localStorage.setItem('showRatingsDashboard', data.value ? 'true' : 'false');
      // Optionally, trigger a UI update if needed
      if (typeof fetchCompanies === 'function') fetchCompanies();
    }
  } catch (e) {}
});

// For admin: send update
function sendShowRatingsUpdate(value) {
  socket.send(JSON.stringify({ type: 'showRatingsUpdate', value }));
}

window.showRatingsSocket = { socket, sendShowRatingsUpdate };
