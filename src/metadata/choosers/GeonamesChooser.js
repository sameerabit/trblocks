import registry from 'blocks/registry';
import renderingContext from '@entryscape/rdforms/src/view/renderingContext';

const username = 'metasolutions'; // TODO @valentino this should be moved to config
const APIconfig = {
  startId: '6295630', // World
  URIPrefix: 'http://sws.geonames.org/',
  hierarchyURL: `http://api.geonames.org/hierarchyJSON?userName=${username}&lang=en&geonameId=`,
  childrenURL: `http://api.geonames.org/childrenJSON?userName=${username}&lang=en&geonameId=`,
  geonameURL: `http://api.geonames.org/getJSON?userName=${username}&lang=en&geonameId=`,
};

const getHierarchy = (geonameId) => {
  const url = `${APIconfig.hierarchyURL}${geonameId}`;
  return registry.get('entrystore').loadViaProxy(url).then(results => results.geonames);
};

const getGeonameId = uri => uri.substr(APIconfig.URIPrefix.length).replace(/\/$/g, '');

let defaultRegistered = false;
const ext = {
  getChoice(entry, value) {
    const obj = {
      value,
      load(onSuccess) {
        const async = registry.get('asynchandler');
        async.addIgnore('loadViaProxy', async.codes.GENERIC_PROBLEM, true);
        getHierarchy(getGeonameId(value)).then((result) => {
          if (result.length > 0 && result[result.length - 1].name) {
            obj.label = { en: result[result.length - 1].name };
            return obj;
          }
          throw Error('Damn');
        }).then(onSuccess, () => {
          obj.label = { en: obj.value };
          obj.mismatch = true; // TODO replace with something else
          onSuccess();
        });
      },
    };
    if (registry.get('authorizedUser') == null) {
      delete obj.load;
      obj.label = { en: obj.value };
    }
    return obj;
  },
  registerDefaults() {
    if (!defaultRegistered) {
      defaultRegistered = true;
      renderingContext.chooserRegistry
        .style('geonames')
        .predicate('http://purl.org/dc/terms/spatial')
        .register(ext);
      renderingContext.chooserRegistry
        .style('geonames')
        .constraint({
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': 'http://www.geonames.org/ontology#Feature',
        })
        .register(ext);
    }
  },
};

export default ext;
