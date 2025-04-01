const formats = {
  'text/csv': 'CSV',
  'application/x-shp': 'SHP',
  'application/gml': 'GML',
  'text/html': 'HTML',
  'application/json': 'JSON',
  'application/msword': 'DOC',
  'application/vnd.google-earth.kml': 'KML',
  'application/vnd.ms-excel': 'XLS',
  'application/n-triples': 'RDF',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet ': 'XLSX',
  'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
  'application/pdf': 'PDF',
  'application/rdf': 'RDF',
  'application/sparql-query': 'SPARQL',
  'text/plain': 'TXT',
  'text/turtle': 'RDF',
  'application/xml': 'XML',
  'application/zip': 'ZIP',
  'application/octet-stream': 'BIN',
};
const types = {
  text: 'TEXT',
  image: 'IMAGE',
  video: 'VIDEO',
  audio: 'AUDIO',
};

const shorten = (str, sep) => {
  const idx = str.indexOf(sep);
  return idx > 0 ? str.substr(0, idx) : str;
};

export default function (ff) {
  let f = ff;
  f = f != null ? f : '';
  f = shorten(f, ';');
  f = shorten(f, '+');
  f = f.toLowerCase();
  let r = formats[f];
  if (r == null) {
    f = shorten(f, '/');
    r = types[f];
  }
  return r || '?';
}
