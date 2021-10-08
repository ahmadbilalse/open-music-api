class UploadsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    this.postUploadPictureHandler = this.postUploadPictureHandler.bind(this);
  }

  async postUploadPictureHandler(request, h) {
    const { data } = request.payload;
    this._validator.validateImageHeaders(data.hapi.headers);

    const fileName = await this._service.writeFile(data, data.hapi);

    const response = h.response({
      status: 'success',
      message: 'Gambar berhasil diunggah',
      data: {
        pictureUrl: `http://${process.env.HOST}:${process.env.PORT}/upload/pictures/${fileName}`,
      },
    });
    response.code(201);
    return response;
  }
}

module.exports = UploadsHandler;
