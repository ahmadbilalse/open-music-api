const { songsCacheKey } = require('../../services/redis/constants');

class SongsHandler {
  constructor(service, validator, cacheService) {
    this._service = service;
    this._validator = validator;
    this._cacheService = cacheService;

    this.postSongHandler = this.postSongHandler.bind(this);
    this.getSongsHandler = this.getSongsHandler.bind(this);
    this.getSongByIdHandler = this.getSongByIdHandler.bind(this);
    this.putSongByIdHandler = this.putSongByIdHandler.bind(this);
    this.deleteSongByIdHandler = this.deleteSongByIdHandler.bind(this);
  }

  async postSongHandler(request, h) {
    this._validator.validateSongPayload(request.payload);
    const { title, year, performer, genre, duration } = request.payload;

    const songId = await this._service.addSong({ title, year, performer, genre, duration });

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan',
      data: {
        songId,
      },
    });
    response.code(201);
    return response;
  }

  async getSongsHandler() {
    let songs;

    try {
      songs = await this._cacheService.get(`${songsCacheKey}`);
      songs = JSON.parse(songs);
    } catch (e) {
      songs = await this._service.getSongs();
    }

    return {
      status: 'success',
      data: {
        songs,
      },
    };
  }

  async getSongByIdHandler(request) {
    const { id } = request.params;

    let song;

    try {
      song = await this._cacheService.get(`${songsCacheKey}:${id}`);
      song = JSON.parse(song);
    } catch (e) {
      song = await this._service.getSongById(id);
    }

    return {
      status: 'success',
      data: {
        song,
      },
    };
  }

  async putSongByIdHandler(request) {
    this._validator.validateSongPayload(request.payload);
    const { id } = request.params;

    await this._service.editSongById(id, request.payload);

    return {
      status: 'success',
      message: 'lagu berhasil diperbarui',
    };
  }

  async deleteSongByIdHandler(request) {
    const { id } = request.params;
    await this._service.deleteSongById(id);

    return {
      status: 'success',
      message: 'lagu berhasil dihapus',
    };
  }
}

module.exports = SongsHandler;
