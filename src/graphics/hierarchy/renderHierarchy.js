import registry from 'blocks/registry';
import initTree from './hierarchy';
import './hierarchy.css';
import getEntry from '../../utils/getEntry';

const es = registry.get('entrystore');

const getTypeForRelations = (relationsByType, md) =>
  Object.keys(relationsByType).find(type => md.find(null, 'rdf:type', type).length !== 0);

const getRelations = (relationsByType, md) => relationsByType[getTypeForRelations(relationsByType, md)];

const hasChildren = (relations, md) => md.findFirstValue(null, relations.forward) != null;

const rdfutils = registry.get('rdfutils');
const loadChildrenFactory = (context, relationsByType) => (d) => {
  if (!d.children && d.hasChildren) {
    d.children = [];
    const query = es.newSolrQuery();
    if (registry.get('blocks_forcePublicRequests') !== false) {
      query.publicRead();
    }
    return query.context(context)
      .uriProperty(d.relations.backward, d.id)
      .forEach((childEntry) => {
        const md = childEntry.getAllMetadata();
        const relations = getRelations(relationsByType, md);
        d.children.push({
          id: childEntry.getResourceURI(),
          name: rdfutils.getLabel(childEntry),
          hasChildren: hasChildren(relations, md),
          relations,
        });
      });
  }
  return Promise.resolve(1);
};

export default (node, data) => {
  const relationsByType = data.relationsByType || {
    'skos:ConceptScheme': {
      forward: 'skos:hasTopConcept',
      backward: 'skos:topConceptOf',
    },
    'skos:Concept': {
      forward: 'skos:narrower',
      backward: 'skos:broader',
    },
  };
  getEntry(data, (entry) => {
    const md = entry.getAllMetadata();
    const relations = getRelations(relationsByType, md);
    const root = {
      id: entry.getResourceURI(),
      name: rdfutils.getLabel(entry),
      hasChildren: hasChildren(relations, md),
      relations,
    };
    const load = loadChildrenFactory(entry.getContext(), relationsByType);
    load(root).then(() => {
      initTree(root, load, node, data);
    });
  });
};
