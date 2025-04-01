import 'jquery';
import { i18n } from 'esi18n';
import getEntry from 'blocks/utils/getEntry';
import handlebars from 'blocks/boot/handlebars';
import { loadCSVFile, vizNamespace } from './visualization/visualizationUtil';
import { fixURL } from './util';

const loadTable = async () => {
  await import('bootstrap-table' /* webpackChunkName: "bootstrap-table" */);
  await import('bootstrap-table/dist/locale/bootstrap-table-de-DE' /* webpackChunkName: "bootstrap-table" */);
  await import('bootstrap-table/dist/locale/bootstrap-table-sv-SE' /* webpackChunkName: "bootstrap-table" */);

  // eslint-disable-next-line no-unused-expressions
  import('bootstrap-table/dist/bootstrap-table.min.css' /* webpackChunkName: "bootstrap-table" */);
};

const showTable = (tnode, entry, data) => loadCSVFile({
  uri: data.uri,
  entry,
  encoding: data.encoding,
  property: data.property,
  ignoreStats: true,
  maxSize: data.maxSize || '10485760',
  allowDotsInHeaders: false,
  proxy: data.proxy ? url => fixURL(url, data) : undefined,
}).then((datatable) => {
  const columns = datatable.meta.fields.map(value => ({
    field: value,
    title: value,
    sortable: true,
    filter: {
      type: 'input',
    },
  }));

  const locale = i18n.getLocale();
  if (locale === 'de') {
    jquery.extend(jquery.fn.bootstrapTable.defaults, jquery.fn.bootstrapTable.locales['de-DE'])
  } else if (locale === 'sv') {
    jquery.extend(jquery.fn.bootstrapTable.defaults, jquery.fn.bootstrapTable.locales['sv-SE'])

  }

  jquery(tnode).bootstrapTable({
    dataField: 'results',
    totalField: 'resultCount',
    sortable: true,
    silentSort: true,
    search: true,
    pagination: true,
    smartDisplay: true,
    showRefresh: true,
    showColumns: true,
    filter: true,
    columns,
    data: datatable.data,
  });
});

export default (node, data) => {
  loadTable().then(() => {
    const tableNode = document.createElement('div');
    node.appendChild(tableNode);
    getEntry(data, (entry) => {
      const ruri = entry.getResourceURI();
      const md = entry.getAllMetadata();
      data.uri = data.uri || md.findFirstValue(ruri, 'dcterms:source');
      data.encoding = data.encoding || md.findFirstValue(ruri, vizNamespace.encoding) || 'UTF-8';
      showTable(tableNode, entry, data).catch((err) => {
        if (err.name === 'SizeError') {
          handlebars.run(tableNode, data, data.tooLargeFileMessage
            || 'The file is too large to load and show as a table');
        } else {
          handlebars.run(tableNode, data, data.failureMessage
            || 'Problem loading data');
        }
      });
    });
  });
};
