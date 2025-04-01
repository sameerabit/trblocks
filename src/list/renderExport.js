import registry from 'blocks/registry';
import Papa from 'papaparse';
import labels from 'blocks/utils/labels';
import { Graph, converters, namespaces } from '@entryscape/rdfjson';
import { saveAs } from 'file-saver/FileSaver';
import getLookupStore from 'blocks/utils/lookupStoreUtil';

const extractURIs = async (entries, forLabels) => {
  const uris = new Set();
  for (const entry of entries) {
    const lookupStore = await getLookupStore(entry);
    const entityType = await lookupStore.inUse(entry);
    const properties = forLabels ? entityType.get('projectionLabels') : entityType.get('relations');
    if (properties) {
      const propertyArray = Array.isArray(properties) ? properties : [properties];
      const md = entry.getAllMetadata();
      propertyArray.forEach((property) => {
        md.find(null, property).forEach((stmt) => {
          if (stmt.getType() === 'uri') {
            uris.add(stmt.getValue());
          }
        });
      });
    }
  }
  return Array.from(uris);
};

const extractURIsForLabels = (entries) => extractURIs(entries, true);
const extractURIsForRelated = (entries) => extractURIs(entries, false);

const findKey = (proj, prop) => {
  const eProp = namespaces.expand(prop);
  return Object.keys(proj).find((k) => {
    const projprop = proj[k];
    const resolvedprop = Array.isArray(projprop) ? projprop[projprop.length - 1] : projprop;
    return namespaces.expand(resolvedprop) === eProp;
  });
};

const cleanKey = (key) => (key[0] === '*' ? key.substr(1) : key);

const resolveLabelsForProp = (obj, proj, prop, uri2label) => {
  const key = findKey(proj, prop);
  if (key) {
    const cKey = cleanKey(key);
    const values = obj[cKey];
    if (values) {
      if (Array.isArray(values) && typeof values[0] === 'string') {
        obj[cKey] = values.map((value) => uri2label[value] || value);
      } else if (typeof values === 'string') {
        obj[cKey] = uri2label[values] || values;
      }
    }
  }
};
const resolveLabels = (obj, projectionLabels, projection, uri2label) => {
  (Array.isArray(projectionLabels) ? projectionLabels : [projectionLabels]).forEach((property) =>
    resolveLabelsForProp(obj, projection, property, uri2label)
  );
};

const objFromURI = async (uri, uri2entry) => {
  const entry = uri2entry[uri];
  if (entry) {
    const obj = {
      entry: entry.getURI(),
      resource: entry.getResourceURI(),
    };
    const md = entry.getAllMetadata();
    const lookupStore = await getLookupStore(entry);
    const entityType = await lookupStore.inUse(entry);
    const projection = entityType.get('projection');
    if (projection) {
      obj.metadata = md.projection(entry.getResourceURI(), projection);
    }
    return obj;
  }
  return uri;
};

const resolveObjectsForProp = (obj, proj, prop, uri2entry) => {
  const key = findKey(proj, prop);
  if (key) {
    const cKey = cleanKey(key);
    const values = obj[cKey];
    if (values) {
      if (Array.isArray(values) && typeof values[0] === 'string') {
        obj[cKey] = values.map((value) => objFromURI(value, uri2entry));
      } else if (typeof values === 'string') {
        obj[cKey] = objFromURI(values, uri2entry);
      }
    }
  }
};

const resolveObjects = (obj, relations, projection, uri2entry) => {
  (Array.isArray(relations) ? relations : [relations]).forEach((property) =>
    resolveObjectsForProp(obj, projection, property, uri2entry)
  );
};

const getRelatedEntries = async (entries) => {
  const esutil = registry.get('entrystoreutil');
  const relatedURIs = await extractURIsForRelated(entries);
  const relatedEntries = await esutil.loadEntriesByResourceURIs(relatedURIs, undefined, true);
  const uri2entry = {};
  relatedEntries.forEach((e) => {
    uri2entry[e.getResourceURI()] = e;
  });
  return uri2entry;
};

export default (node, data) => {
  const extras = new Set((data.extras || '').split(','));
  const addExtrasObj = (obj, entry) => {
    if (extras.has('entry')) obj.entry = entry.getURI();
    if (extras.has('resource')) obj.resource = entry.getResourceURI();
    const ei = entry.getEntryInfo();
    if (extras.has('created')) obj.created = ei.getCreationDate().toISOString();
    if (extras.has('modified')) obj.modified = ei.getModificationDate().toISOString();
  };
  const addExtraColumns = (columns) => {
    extras.forEach((col) => columns.push(col));
  };
  node.parentElement.onclick = async () => {
    // Todo export code here
    const listInfo = registry.get(data.use);
    const entries = [];
    const limit = listInfo.list.getLimit();
    listInfo.list.setLimit(100);
    await listInfo.list.forEach((entry) => entries.push(entry));
    listInfo.list.setLimit(limit);

    if (data.format === undefined || data.format === 'rdf') {
      const graph = new Graph();
      entries.forEach((entry) => graph.addAll(entry.getAllMetadata()));
      // Related entries
      const uri2entry = await getRelatedEntries(entries);
      Object.values(uri2entry).forEach((entry) => graph.addAll(entry.getAllMetadata()));
      // Export as rdf/xml
      const rdfxml = converters.rdfjson2rdfxml(graph);
      const blob = new Blob([rdfxml], { type: 'application/rdf+xml;charset=utf-8' });
      saveAs(blob, 'export.rdf', true);
    } else if (data.format === 'json') {
      // Related entries
      const uri2entry = await getRelatedEntries(entries);
      const labelURIs = await extractURIsForLabels(entries);
      // Labels to project
      const uri2labels = await labels(labelURIs);
      const rdfUtils = registry.get('rdfutils');
      const results = [];
      const lookupStore = await getLookupStore(entries[0]);
      for (const entry of entries) {
        const obj = {};
        addExtrasObj(obj, entry);
        results.push(obj);
        const md = entry.getAllMetadata();
        const entityType = await lookupStore.inUse(entry);
        const { projection, relations, projectionLabels } = entityType.get();
        if (projection) {
          obj.metadata = md.projection(entry.getResourceURI(), projection);
          resolveObjects(obj.metadata, relations, projection, uri2entry);
          resolveLabels(obj.metadata, projectionLabels, projection, uri2labels);
        } else {
          obj.metadata = {
            label: rdfUtils.getLabel(entry),
            description: rdfUtils.getDescription(entry),
          };
        }
      }
      const blob = new Blob([JSON.stringify(results, null, '  ')], { type: 'application/json' });
      saveAs(blob, 'export.json', true);
    } else if (data.format === 'csv') {
      let results = [];
      const firstEntry = entries[0];
      const lookupStore = await getLookupStore(firstEntry);
      const entityType = await lookupStore.inUse(firstEntry);
      const projection = entityType.get('projection');
      const columns = [];
      if (projection) {
        results = entries.map((entry) => {
          const proj = entry.getAllMetadata().projection(entry.getResourceURI(), projection);
          addExtrasObj(proj, entry);
          return proj;
        });
        Object.keys(projection).forEach((key) => {
          if (key[0] === '*') {
            columns.push(key.slice(1));
          } else {
            columns.push(key);
          }
        });
      }
      addExtraColumns(columns);
      const relatedURIs = await extractURIsForLabels(entries);
      if (relatedURIs.length > 0 && projection) {
        const uri2labels = await labels(relatedURIs);
        const projectionLabels = entityType.get('projectionLabels');
        results.forEach((obj) => resolveLabels(obj, projectionLabels, projection, uri2labels));
      }

      const blob = new Blob([Papa.unparse(results, { columns })], { type: 'text/csv' });
      saveAs(blob, 'export.csv', true);
    }
  };
  node.parentElement.classList.add('entryscape');
};
