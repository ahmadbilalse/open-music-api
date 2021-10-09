const SongHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'song',
  version: '1.0.0',
  register: async (server, { service, validator, cacheService }) => {
    const songHandler = new SongHandler(service, validator, cacheService);
    server.route(routes(songHandler));
  },
};
