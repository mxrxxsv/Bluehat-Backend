let ioInstance = null;

function init(io) {
  ioInstance = io;
}

function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized. Call init(io) in index.js first.");
  }
  return ioInstance;
}

function emitToUser(credentialId, event, payload) {
  if (!ioInstance || !credentialId) return;
  const room = `user:${String(credentialId)}`;
  ioInstance.to(room).emit(event, payload);
}

function emitToUsers(credentialIds, event, payload) {
  if (!ioInstance || !Array.isArray(credentialIds)) return;
  credentialIds.forEach((id) => emitToUser(id, event, payload));
}

module.exports = { init, getIO, emitToUser, emitToUsers };
