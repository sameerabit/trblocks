import registry from 'blocks/registry';

export default function (list, data) {
  if (!data.dependencyproperties && !data.facets) {
    return list;
  }
  const dps = (data.dependencyproperties ?
    data.dependencyproperties.split(',') : []).map(prop => prop.trim());
  list.getEntries2 = list.getEntries;
  list.getEntries = function (page) {
    const es = registry.get('entrystore');
    const cache = es.getCache();

    const loadDependencyProperties = async (entryArr) => {
      const toLoad = {};
      entryArr.forEach((entry) => {
        const md = entry.getAllMetadata();
        const s = entry.getResourceURI();
        dps.forEach((dp) => {
          md.find(s, dp).forEach((stmt) => {
            if (stmt.getType() === 'uri') {
              if (cache.getByResourceURI(stmt.getValue()).size === 0) {
                toLoad[stmt.getValue()] = true;
              }
            }
          });
        });
      });
      const toLoadArr = Object.keys(toLoad);
      if (toLoadArr.length === 0) {
        return entryArr;
      }
      await registry.get('entrystoreutil').loadEntriesByResourceURIs(toLoadArr, undefined, true);
      return entryArr;
    };

    const fetchEntriesRetryOnExpiredCredentials = async () => {
      try {
        const arr = await this.getEntries2(page);
        return await loadDependencyProperties(arr);
      } catch (firstError) {
        if (firstError.response.status === 401) {
          try {
            const arr = await this.getEntries2(page);
            return loadDependencyProperties(arr);
          } catch (secondError) {
            return Promise.reject(secondError.response.status);
          }
        }
        return Promise.reject(firstError.response.status);
      }
    };
    return fetchEntriesRetryOnExpiredCredentials();
  };
  return list;
}
