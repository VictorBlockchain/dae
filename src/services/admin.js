const logger = require('../utils/logger');

class AdminService {
  constructor() {
    this.serviceFee = 0;
    this.focusToken = null;
    this.focusModeEnabled = false;
  }

  setServiceFee(fee) {
    if (fee < 0 || fee > 100) {
      throw new Error('Invalid fee percentage');
    }
    this.serviceFee = fee;
    return this.serviceFee;
  }

  setFocusToken(tokenAddress) {
    this.focusToken = tokenAddress;
    return this.focusToken;
  }

  toggleFocusMode() {
    this.focusModeEnabled = !this.focusModeEnabled;
    return this.focusModeEnabled;
  }
}

module.exports = new AdminService();