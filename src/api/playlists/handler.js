const { playlistsCacheKey, playlistsongsCacheKey } = require('../../services/redis/constants');

class PlaylistsHandler {
  constructor(service, validator, cacheService) {
    this._service = service;
    this._validator = validator;
    this._cacheService = cacheService;

    this.postPlaylistHandler = this.postPlaylistHandler.bind(this);
    this.getPlaylistsHandler = this.getPlaylistsHandler.bind(this);
    this.deletePlaylistByIdHandler = this.deletePlaylistByIdHandler.bind(this);
    this.getSongsInPlaylistHandler = this.getSongsInPlaylistHandler.bind(this);
    this.deleteSongInPlaylistHandler = this.deleteSongInPlaylistHandler.bind(this);
    this.postSongToPlaylistHandler = this.postSongToPlaylistHandler.bind(this);
  }

  async postPlaylistHandler(request, h) {
    this._validator.validatePostPlaylistPayload(request.payload);
    const { name } = request.payload;
    const { id: owner } = request.auth.credentials;

    const playlistId = await this._service.addPlaylist({ name, owner });

    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil ditambahkan',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    let playlists;

    try {
      playlists = await this._cacheService.get(`${playlistsCacheKey}:${credentialId}`);
      playlists = JSON.parse(playlists);
    } catch (e) {
      playlists = await this._service.getPlaylists({ credentialId });
      await this._cacheService.set(`${playlistsCacheKey}:${credentialId}`, JSON.stringify(playlists));
    }

    return {
      status: 'success',
      data: {
        playlists,
      },
    };
  }

  async deletePlaylistByIdHandler(request) {
    const { playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.deletePlaylistById({ playlistId, credentialId });

    return {
      status: 'success',
      message: 'Playlist berhasil dihapus',
    };
  }

  async postSongToPlaylistHandler(request, h) {
    this._validator.validatePostSongToPlaylistPayload(request.payload);
    const { playlistId } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess({ playlistId, credentialId });
    await this._service.postSongToPlaylist({ songId, playlistId, credentialId });

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan ke playlist',
    });

    response.code(201);
    return response;
  }

  async getSongsInPlaylistHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const { playlistId } = request.params;

    await this._service.verifyPlaylistAccess({ playlistId, credentialId });

    try {
      const result = await this._cacheService.get(`${playlistsongsCacheKey}:${playlistId}`);
      return {
        status: 'success',
        data: {
          songs: JSON.parse(result),
        },
      };
    } catch (e) {
      const songs = await this._service.getSongsInPlaylist({ playlistId, credentialId });
      await this._cacheService.set(`${playlistsongsCacheKey}:${playlistId}`, JSON.stringify(songs));

      return {
        status: 'success',
        data: {
          songs,
        },
      };
    }
  }

  async deleteSongInPlaylistHandler(request) {
    const { playlistId } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyPlaylistAccess({ playlistId, credentialId });
    await this._service.deleteSongInPlaylist({ playlistId, songId, credentialId });

    return {
      status: 'success',
      message: 'Lagu berhasil dihapus',
    };
  }
}

module.exports = PlaylistsHandler;
