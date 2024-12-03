let botInstance = null;

function setBotInstance(bot) {
  if (botInstance) {
    throw new Error('Bot instance already exists');
  }
  botInstance = bot;
}

function getBotInstance() {
  if (!botInstance) {
    throw new Error('Bot instance not initialized');
  }
  return botInstance;
}

function clearBotInstance() {
  if (!botInstance) {
    throw new Error('No bot instance to clear');
  }
  botInstance = null;
}

export { setBotInstance, getBotInstance, clearBotInstance };