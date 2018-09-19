const winston = require('winston');

module.exports = (name) => {
  const logger = winston.loggers.add(name, {
    transports: [
      new (winston.transports.Console)({
        level: 'info',
        label: name,
        colorize: true,
      }),
    ],
  });

  logger.stream = {
    write: (message) => {
      logger.info(message);
    },
  };

  return logger;
};
