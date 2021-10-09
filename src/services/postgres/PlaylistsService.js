const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const { playlistsCacheKey, playlistsongsCacheKey } = require('../redis/constants');
// const { mapDBToModel } = require('../../utils');

class PlaylistsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async verifyPlaylistOwnership({ playlistId, credentialId }) {
    const query = {
      text: `SELECT * 
              FROM playlists as p
              INNER JOIN users as u
              ON p.owner = u.id
              WHERE p.owner = $1
              AND p.id = $2`,
      values: [credentialId, playlistId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0]) {
      throw new AuthorizationError('User tidak terotorisasi');
    }
  }

  async verifyPlaylistAccess({ playlistId, credentialId }) {
    const query = {
      text: `SELECT *
              FROM playlists AS p
              LEFT JOIN collaborations AS c
              ON p.id = c.playlist_id
              WHERE 
              (c.user_id = $2 OR p.owner = $2)
              AND
              (p.id = $1)`,
      values: [playlistId, credentialId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0]) {
      throw new AuthorizationError('User tidak terotorisasi');
    }
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    await this._cacheService.delete(`${playlistsCacheKey}:${owner}`);

    return result.rows[0].id;
  }

  async getPlaylists({ credentialId }) {
    const query = {
      text: `SELECT p.id, p.name, u.username 
              FROM playlists AS p
              LEFT JOIN collaborations AS c
              on p.id = c.playlist_id
              INNER JOIN users AS u
              ON (p.owner = u.id OR c.playlist_id = u.id)
              WHERE p.owner = $1 
              OR c.user_id = $1`,
      values: [credentialId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async deletePlaylistById({ playlistId, credentialId }) {
    await this.verifyPlaylistOwnership({ playlistId, credentialId });
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 AND owner = $2 RETURNING id',
      values: [playlistId, credentialId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. Playlist tidak ditemukan');
    }

    await this._cacheService.delete(`${playlistsCacheKey}:${credentialId}`);
  }

  async postSongToPlaylist({ songId, playlistId, credentialId }) {
    const getSongQuery = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [songId],
    };

    const song = await this._pool.query(getSongQuery);

    if (!song.rows[0].id) {
      throw new NotFoundError('Lagu tidak ditemukan');
    }

    const id = `playlist-${nanoid(16)}`;

    const postSongToPlaylistQuery = {
      text: 'INSERT INTO playlistsongs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(postSongToPlaylistQuery);

    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan ke playlist');
    }

    await this._cacheService.delete(`${playlistsongsCacheKey}:${credentialId}`);
  }

  async getSongsInPlaylist({ playlistId, credentialId }) {
    const query = {
      text: `SELECT s.*
              FROM songs as s
              INNER JOIN
              playlistsongs as ps
              ON s.id = ps.song_id
              INNER JOIN playlists as p
              ON ps.playlist_id = p.id
              LEFT JOIN collaborations as c
              ON p.id = c.playlist_id
              WHERE (p.owner = $1 OR c.user_id = $1)
              AND p.id = $2
              `,
      values: [credentialId, playlistId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async deleteSongInPlaylist({ playlistId, songId, credentialId }) {
    const query = {
      text: `DELETE 
              FROM playlistsongs
              WHERE playlist_id = $1
              AND song_id IN
              (SELECT id FROM songs WHERE id = $2)
              RETURNING ID`,
      values: [playlistId, songId],
    };
    try {
      const result = await this._pool.query(query);
      if (result.rows.length < 1) {
        throw new NotFoundError('Lagu tidak ditemukan');
      }
      await this._cacheService.delete(`${playlistsongsCacheKey}:${credentialId}`);
    } catch (e) {
      throw new InvariantError('Lagu gagal dihapus dari playlist');
    }
  }
}

module.exports = PlaylistsService;
