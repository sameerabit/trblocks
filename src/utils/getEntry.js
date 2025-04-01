import registry from 'blocks/registry';
import params from 'blocks/boot/params';
import { Entry } from '@entryscape/entrystore-js';
import config from 'blocks/config/config';
import constraints from 'blocks/utils/constraints';

const es = registry.get('entrystore');
const esu = registry.get('entrystoreutil');

export default (data, callback, useSearch = true) => {
  let cid;
  let eid;

  const f = (entry) => {
    data.entry = entry;
    if (data.define) {
      setTimeout(() => {
        registry.set(`blocks_${data.define}`, entry);
      }, 1);
    }
    return entry;
  };

  const useRelation = (entry) => {
    if (data.relationinverse) {
      const qo = es.newSolrQuery().uriProperty(data.relationinverse, entry.getResourceURI());
      if (registry.get('blocks_forcePublicRequests') !== false) {
        qo.publicRead();
      }
      if (data.rdftype) {
        qo.rdfType(data.rdftype);
      }
      if (data.sortOrder) {
        if (data.sortOrder === 'title') {
          qo.sort(`title.${l}+asc`);
        } else {
          qo.sort(data.sortOrder);
        }
      }
      if (data.constraints) {
        constraints(so, data.constraints);
      }
      qo.limit(1).list().getEntries().then((arr) => {
        if (arr.length > 0) {
          f(arr[0]);
          callback(arr[0]);
        }
      });
    } else if (data.relation) {
      const subject = !data.nested ? entry.getResourceURI() : undefined;
      const stmts = entry.getAllMetadata().find(subject, data.relation)
        .filter(stmt => stmt.getType() === 'uri');
      if (stmts.length > 0) {
        esu.getEntryByResourceURI(stmts[0].getValue()).then(f).then(callback);
      }
    }
  };

  const onEntry = (entry) => {
    if (useSearch && (data.relation || data.relationinverse)) {
      useRelation(entry);
    } else if (useSearch && data.rdftype) {
      esu.getEntryByType(data.rdftype, cid ? es.getContextById(cid) : null)
        .then(f).then(callback);
    } else {
      f(entry);
      callback(entry);
    }
  };

  if (data.use) {
    registry.onChange(`blocks_${data.use}`, (entry) => {
      if (useSearch && (data.relation || data.relationinverse)) {
        useRelation(entry);
      } else {
        data.entry = entry;
        callback(entry);
      }
    }, true);
    return;
  }
  if (data.entry instanceof Entry) {
    onEntry(data.entry);
    return;
  }

  params.onInit((urlParams) => {
    const ncid = data.context || urlParams.context || config.econfig.context;
    const neid = data.entry || urlParams.entry || config.econfig.entry;
    if (neid === undefined) {
      cid = ncid;
      if (urlParams.uri && urlParams.constraints) {
        const q = es.newSolrQuery().resource(urlParams.uri).context(ncid);
        constraints(q, urlParams.constraints).limit(2);
        q.getEntries().then((entries) => {callback(entries[0])}, () => {
          callback();
        })
      } else if (data.uri || urlParams.uri) {
        const resourceUri = data.uri || Array.isArray(urlParams.uri) ? urlParams.uri[0] : urlParams.uri;
        esu.getEntryByResourceURI(resourceUri, ncid).then(f).then(callback, () => {
          callback();
        });
      } else if (urlParams.lookup) {
        const query = es.newSolrQuery().context(ncid).limit(1);
        if (registry.get('blocks_forcePublicRequests') !== false) {
          query.publicRead();
        }
        const lookupLiteral = data.lookupLiteral || config.econfig.lookupLiteral || urlParams.lookupLiteral;
        const lookupURI = data.lookupLiteral || config.econfig.lookupURI || urlParams.lookupURI;
        if (lookupLiteral) {
          query.literalProperty(lookupLiteral, urlParams.lookup, undefined, 'string');
        } else if (lookupURI) {
          query.uriProperty(lookupURI, urlParams.lookup);
        } else {
          console.warn('No lookup property specified, assuming dcterms:identifier');
          query.literalProperty('dcterms:identifier', urlParams.lookup, undefined, 'string');
        }
        query.getEntries().then(arr => arr[0]).then(callback);
      } else {
        callback();
      }
    } else {
      cid = ncid;
      eid = neid;
      const euri = es.getEntryURI(cid, eid);
      const errorhandler = registry.get('asynchandler');
      es.getEntry(euri).then(onEntry, () => {
        console.warn(`Failed loading entry: ${euri}`);
        callback();
      });
    }
  });
};
