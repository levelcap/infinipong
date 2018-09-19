const logger = require('../cfg/logger')('infinipong');

async function addEvent (event) {
  try {
    await event.save();
  } catch (err) {
    logger.error('Unexpected error in addEvent', err);
  }
}

module.exports = {
  addEvent,
};