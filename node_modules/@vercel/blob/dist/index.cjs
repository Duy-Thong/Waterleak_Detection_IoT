"use strict";Object.defineProperty(exports, "__esModule", {value: true});























var _chunkRHJI2NPCcjs = require('./chunk-RHJI2NPC.cjs');

// src/del.ts
async function del(url, options) {
  await _chunkRHJI2NPCcjs.requestApi.call(void 0, 
    "/delete",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: Array.isArray(url) ? url : [url] }),
      signal: options == null ? void 0 : options.abortSignal
    },
    options
  );
}

// src/head.ts
async function head(url, options) {
  const searchParams = new URLSearchParams({ url });
  const response = await _chunkRHJI2NPCcjs.requestApi.call(void 0, 
    `?${searchParams.toString()}`,
    // HEAD can't have body as a response, so we use GET
    {
      method: "GET",
      signal: options == null ? void 0 : options.abortSignal
    },
    options
  );
  return {
    url: response.url,
    downloadUrl: response.downloadUrl,
    pathname: response.pathname,
    size: response.size,
    contentType: response.contentType,
    contentDisposition: response.contentDisposition,
    cacheControl: response.cacheControl,
    uploadedAt: new Date(response.uploadedAt)
  };
}

// src/list.ts
async function list(options) {
  var _a;
  const searchParams = new URLSearchParams();
  if (options == null ? void 0 : options.limit) {
    searchParams.set("limit", options.limit.toString());
  }
  if (options == null ? void 0 : options.prefix) {
    searchParams.set("prefix", options.prefix);
  }
  if (options == null ? void 0 : options.cursor) {
    searchParams.set("cursor", options.cursor);
  }
  if (options == null ? void 0 : options.mode) {
    searchParams.set("mode", options.mode);
  }
  const response = await _chunkRHJI2NPCcjs.requestApi.call(void 0, 
    `?${searchParams.toString()}`,
    {
      method: "GET",
      signal: options == null ? void 0 : options.abortSignal
    },
    options
  );
  if ((options == null ? void 0 : options.mode) === "folded") {
    return {
      folders: (_a = response.folders) != null ? _a : [],
      cursor: response.cursor,
      hasMore: response.hasMore,
      blobs: response.blobs.map(mapBlobResult)
    };
  }
  return {
    cursor: response.cursor,
    hasMore: response.hasMore,
    blobs: response.blobs.map(mapBlobResult)
  };
}
function mapBlobResult(blobResult) {
  return {
    url: blobResult.url,
    downloadUrl: blobResult.downloadUrl,
    pathname: blobResult.pathname,
    size: blobResult.size,
    uploadedAt: new Date(blobResult.uploadedAt)
  };
}

// src/copy.ts
async function copy(fromUrl, toPathname, options) {
  if (!options) {
    throw new (0, _chunkRHJI2NPCcjs.BlobError)("missing options, see usage");
  }
  if (options.access !== "public") {
    throw new (0, _chunkRHJI2NPCcjs.BlobError)('access must be "public"');
  }
  if (toPathname.length > _chunkRHJI2NPCcjs.MAXIMUM_PATHNAME_LENGTH) {
    throw new (0, _chunkRHJI2NPCcjs.BlobError)(
      `pathname is too long, maximum length is ${_chunkRHJI2NPCcjs.MAXIMUM_PATHNAME_LENGTH}`
    );
  }
  for (const invalidCharacter of _chunkRHJI2NPCcjs.disallowedPathnameCharacters) {
    if (toPathname.includes(invalidCharacter)) {
      throw new (0, _chunkRHJI2NPCcjs.BlobError)(
        `pathname cannot contain "${invalidCharacter}", please encode it if needed`
      );
    }
  }
  const headers = {};
  if (options.addRandomSuffix !== void 0) {
    headers["x-add-random-suffix"] = options.addRandomSuffix ? "1" : "0";
  }
  if (options.contentType) {
    headers["x-content-type"] = options.contentType;
  }
  if (options.cacheControlMaxAge !== void 0) {
    headers["x-cache-control-max-age"] = options.cacheControlMaxAge.toString();
  }
  const response = await _chunkRHJI2NPCcjs.requestApi.call(void 0, 
    `/${toPathname}?fromUrl=${fromUrl}`,
    {
      method: "PUT",
      headers,
      signal: options.abortSignal
    },
    options
  );
  return {
    url: response.url,
    downloadUrl: response.downloadUrl,
    pathname: response.pathname,
    contentType: response.contentType,
    contentDisposition: response.contentDisposition
  };
}

// src/index.ts
var put = _chunkRHJI2NPCcjs.createPutMethod.call(void 0, {
  allowedOptions: ["cacheControlMaxAge", "addRandomSuffix", "contentType"]
});
var createMultipartUpload = _chunkRHJI2NPCcjs.createCreateMultipartUploadMethod.call(void 0, {
  allowedOptions: ["cacheControlMaxAge", "addRandomSuffix", "contentType"]
});
var createMultipartUploader = _chunkRHJI2NPCcjs.createCreateMultipartUploaderMethod.call(void 0, {
  allowedOptions: ["cacheControlMaxAge", "addRandomSuffix", "contentType"]
});
var uploadPart = _chunkRHJI2NPCcjs.createUploadPartMethod.call(void 0, {
  allowedOptions: ["cacheControlMaxAge", "addRandomSuffix", "contentType"]
});
var completeMultipartUpload = _chunkRHJI2NPCcjs.createCompleteMultipartUploadMethod.call(void 0, {
  allowedOptions: ["cacheControlMaxAge", "addRandomSuffix", "contentType"]
});

























exports.BlobAccessError = _chunkRHJI2NPCcjs.BlobAccessError; exports.BlobClientTokenExpiredError = _chunkRHJI2NPCcjs.BlobClientTokenExpiredError; exports.BlobContentTypeNotAllowedError = _chunkRHJI2NPCcjs.BlobContentTypeNotAllowedError; exports.BlobError = _chunkRHJI2NPCcjs.BlobError; exports.BlobFileTooLargeError = _chunkRHJI2NPCcjs.BlobFileTooLargeError; exports.BlobNotFoundError = _chunkRHJI2NPCcjs.BlobNotFoundError; exports.BlobPathnameMismatchError = _chunkRHJI2NPCcjs.BlobPathnameMismatchError; exports.BlobRequestAbortedError = _chunkRHJI2NPCcjs.BlobRequestAbortedError; exports.BlobServiceNotAvailable = _chunkRHJI2NPCcjs.BlobServiceNotAvailable; exports.BlobServiceRateLimited = _chunkRHJI2NPCcjs.BlobServiceRateLimited; exports.BlobStoreNotFoundError = _chunkRHJI2NPCcjs.BlobStoreNotFoundError; exports.BlobStoreSuspendedError = _chunkRHJI2NPCcjs.BlobStoreSuspendedError; exports.BlobUnknownError = _chunkRHJI2NPCcjs.BlobUnknownError; exports.completeMultipartUpload = completeMultipartUpload; exports.copy = copy; exports.createFolder = _chunkRHJI2NPCcjs.createFolder; exports.createMultipartUpload = createMultipartUpload; exports.createMultipartUploader = createMultipartUploader; exports.del = del; exports.getDownloadUrl = _chunkRHJI2NPCcjs.getDownloadUrl; exports.head = head; exports.list = list; exports.put = put; exports.uploadPart = uploadPart;
//# sourceMappingURL=index.cjs.map