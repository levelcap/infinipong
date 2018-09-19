const { set } = require('lodash');
const root = require('path').normalize(`${__dirname}  /../..`);

require('dotenv').config({ silent: true });

const envConfig = {
  host: process.env.HOST,
  port: process.env.PORT || 3000,
  mongo: {
    url: process.env.MONGO_URL || 'mongodb://localhost/infinipong',
  },
};

set(envConfig, 'root', root);

module.exports = envConfig;
