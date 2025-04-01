export default {
  admin: {
    showContextName: false,
    showGroupName: false,
    showContextTypeControl: false,
    setGroupNameAsEntryIdOnCreate: false,
    setContextNameAsEntryIdOnCreate: false,
  },
  contexttypes: {
    catalogContext: {
      rdfType: 'http://entryscape.com/terms/CatalogContext',
      entryType: 'dcat:Catalog',
    },
    terminologyContext: {
      rdfType: 'http://entryscape.com/terms/TerminologyContext',
      entryType: 'skos:ConceptScheme',
    },
    workbenchContext: {
      rdfType: 'http://entryscape.com/terms/WorkbenchContext',
    },
    context: {
      rdfType: 'http://entryscape.com/terms/Context',
    },
  },
};
