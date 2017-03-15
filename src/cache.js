const DEFAULT_ALLOW_UPDATES = false;

const cache = new Map();

let bytesRead = 0;
let bytesWritten = 0;
let cacheMisses = 0;
let cacheHits = 0;

const Cache = {
  allowUpdates: DEFAULT_ALLOW_UPDATES,
  get: (uri, onlyData = true) => {
    let resource;
    if (!cache.has(uri)) {
      cacheMisses++;
      return null;
    }
    cacheHits++;
    resource = cache.get(uri);
    resource.accessedAt = Date.now();
    if (typeof resource.data.byteLength === 'number') {
      bytesRead += resource.data.byteLength;
    }
    if (onlyData) {
      return resource.data;
    } else {
      return resource;
    }
  },
  put: (uri, data) => {
    if (!Cache.allowUpdates && cache.has(uri)) {
      throw new Error('Cache updates not allowed. Purge first! URI:', uri);
    }
    let createdAt = Date.now();
    let accessedAt = null;
    let resource = {
      uri,
      data,
      createdAt,
      accessedAt
    }
    cache.set(uri, resource);
    if (typeof resource.data.byteLength === 'number') {
      bytesWritten += resource.data.byteLength;
    }
    return Cache;  
  },
  purgeByUri: (uri) => {
    return cache.delete(uri);
  },
  purgeAll: () => {
    cache.clear();
  },
  purgeNotAccessedSince: (timeMillisSince) => {
    let now = Date.now();
    cache.forEach((resource, uri) => {
      if (resource.accessedAt === null // never accessed
        || resource.accessedAt < now - timeMillisSince) 
      cache.delete(uri);
    });
  },
  purgeCreatedBefore: (timestamp) => {
    cache.forEach((resource, uri) => {
      if (createdAt < timestamp) 
      cache.delete(uri);
    });
  }
}

export default {
  Cache
};