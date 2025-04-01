import merge from 'blocks/utils/merge';
import adminConfig from 'blocks/migration/adminConfig';
import catalogConfig from 'blocks/migration/catalogConfig';
import termsConfig from 'blocks/migration/termsConfig';
import workbenchConfig from 'blocks/migration/workbenchConfig';
import { namespaces } from '@entryscape/rdfjson';
import { queryToObject } from 'blocks/utils/browserUtil';
import { i18n } from 'esi18n';
import blocksConfig from './blocksConfig';
import { extractNodes, extractParameters, normalizeNode } from './nodes';
import extractRouteInfo from './router';

const objToArray = (oOrArr) => {
  if (typeof oOrArr === 'object') {
    const arr = [];
    Object.keys(oOrArr).forEach((key) => {
      const o = oOrArr[key];
      o.name = o.name || key;
      arr.push(o);
    });
    return arr;
  }
  return oOrArr;
};

/**
 * Replace template parameter in Entitytype object when match is found for rdfType.
 * Otherwise, creates a new object for that rdfType and template.
 *
 * @param {object} type2template
 * @param {Array<object>} inOutEntityTypes
 */
const updateEntityTypesFromType2template = (type2template, inOutEntityTypes) => {
  Object.keys(type2template).forEach((type) => {
    const rdfType = namespaces.expand(type);
    let noMatchingEntityType = true;
    inOutEntityTypes.forEach((entitytype) => {
      if (entitytype.rdfType?.includes(rdfType)) {
        noMatchingEntityType = false;
        entitytype.template = type2template[type];
      }
    });
    if (noMatchingEntityType) {
      inOutEntityTypes.push({ rdfType: [namespaces.expand(type)], template: type2template[type], name: type });
    }
  });
};

let globalConfig = window.__esb_config ? window.__esb_config : window.__entryscape_config;
if (Array.isArray(globalConfig)) {
  globalConfig = merge(...globalConfig);
}
const econfig = merge(window.__entryscape_plugin_config || {}, globalConfig || {});
econfig.blocks = econfig.blocks || window.__entryscape_blocks;
let entrystore = econfig.entrystore_base;
let entitytypes = [];
let type2template = {};
let projecttypes = [];
let bundles = [];
let labelProperties;

/**
 * This is a utility function that extracts global level parameters from the provided object.
 * The results are saved in the following variables (that are available via closure to the function)
 * econfig, namespaces, labelProperties, entrystore, bundles and entitytypes.
 */
const exctractGlobalParameters = function (obj) {
  if (obj.namespaces) namespaces.add(obj.namespaces);
  if (obj.rdf && obj.rdf.namespaces) namespaces.add(obj.rdf.namespaces);
  if (obj.labelProperties) labelProperties = obj.labelProperties;
  if (obj.rdf && obj.rdf.labelProperties) labelProperties = obj.rdf.labelProperties;
  if (typeof obj.entrystore === 'string') entrystore = obj.entrystore;
  if (obj.block === 'config') {
    if (obj.context != null) econfig.context = obj.context;
    if (obj.jsonp != null) econfig.jsonp = obj.jsonp;
    if (obj.credentials != null) econfig.credentials = obj.credentials;
    if (obj.requestCache != null) econfig.requestCache = obj.requestCache;
    if (obj.clicks != null) econfig.clicks = obj.clicks;
    if (obj.strictStandardHtml != null) econfig.strictStandardHtml = String(obj.strictStandardHtml) === 'true';
    if (obj.baseFilter != null) econfig.baseFilter = obj.baseFilter;
    if (obj.entry != null) econfig.entry = obj.entry;
    if (obj.timeout != null) econfig.timeout = obj.timeout;
    if (obj.relativeBundlePath != null) econfig.relativeBundlePath = obj.relativeBundlePath;
    if (obj.type2template != null) econfig.type2template = obj.type2template;
  }
  if (obj.block === 'config' && obj.state != null) {
    econfig.state = { ...econfig.state, ...obj.state };
  }
  if (obj.bundles != null) {
    if (typeof obj.bundles === 'string') {
      bundles = bundles.concat(obj.bundles.split(','));
    } else if (Array.isArray(obj.bundles)) {
      bundles = bundles.concat(obj.bundles);
    }
  }
  if (obj.itemstore && obj.itemstore.bundles != null) bundles = merge(bundles, obj.itemstore.bundles);
  if (obj.entitytypes != null) {
    entitytypes = objToArray(obj.entitytypes).map((entitytype) => {
      if (!entitytype.rdfType) return entitytype;
      const { rdfType } = entitytype;
      return { ...entitytype, rdfType: Array.isArray(rdfType) ? rdfType : [rdfType] };
    });
  }
  if (obj.type2template != null) {
    type2template = merge(type2template, obj.type2template);
  }
  if (obj.projecttypes != null) projecttypes = obj.projecttypes;
  if (obj.forcePublicRequests !== undefined) econfig.forcePublicRequests = obj.forcePublicRequests;
  if (obj.errorBlock) econfig.errorBlock = true;
  if (obj.sortOptions) econfig.sortOptions = obj.sortOptions;
  if (obj.limitOptions) econfig.limitOptions = obj.limitOptions;
  if (obj.facetLimit) econfig.facetLimit = obj.facetLimit;
  if (obj.facetMinCount) econfig.facetMinCount = obj.facetMinCount;
  if (obj.facetMissing) econfig.facetMissing = obj.facetMissing;
};

exctractGlobalParameters(econfig);

// Extract all nodes in the webpage together with their parameters (called data)
let nodes = extractNodes().map((node) => {
  // Extract the parameters in the node
  const data = extractParameters(node);
  // Extract all potential global level parameters
  exctractGlobalParameters(data);
  return {
    node: normalizeNode(node),
    data,
  };
});

if (!entrystore) {
  entrystore = `${window.location.origin}/store/`;
}

if (econfig.spa) {
  // If a spa, then throw away all nodes we detected as we will require a separate call to initConfig when
  // initializing blocks on a view, we only loaded the nodes above to potentially detect global parameters.
  nodes = [];
}

if (entrystore) {
  namespaces.add('base', `${entrystore}/`);
}

const urlParams = {};
const extractURLParameters = () => {
  const pageUrl = new URL(window.location.href);
  const hash = pageUrl.hash.substring(1);
  if (hash !== '') {
    const prefix = econfig.hashParamsPrefix || econfig.urlParamsPrefix || 'esc_';
    const up = queryToObject(hash);
    Object.keys(up).forEach((key) => {
      if (key.indexOf(prefix) === 0) {
        if (up[key] && up[key].indexOf(',')) {
          urlParams[key.substring(prefix.length)] = up[key].split(',');
        } else {
          urlParams[key.substring(prefix.length)] = up[key];
        }
      }
    });
  }
  if (pageUrl.search !== '') {
    const prefix = econfig.urlParamsPrefix || 'esc_';
    pageUrl.searchParams.forEach((searchParam, key) => {
      if (key.startsWith(prefix) && key !== `${prefix}page`) {
        urlParams[key.substring(prefix.length)] = searchParam;
      }
    });
  }
};

if (!econfig.spa) {
  extractURLParameters();
  const routeInfo = extractRouteInfo(econfig);
  if (routeInfo) {
    Object.assign(urlParams, routeInfo);
  }
}

const config = merge(adminConfig, catalogConfig, termsConfig, workbenchConfig, blocksConfig, {
  entrystore: { repository: entrystore },
  urlParams,
  entitytypes,
  projecttypes,
  nodes,
  econfig,
  rdf: { labelProperties },
  itemstore: {
    bundles,
    relativeBundlePath: econfig.relativeBundlePath !== undefined ? econfig.relativeBundlePath : true,
    defaultBundles: econfig.defaultBundles !== undefined ? econfig.defaultBundles : true,
  },
  initConfig: (extraConfig) => {
    config.nodes = extractNodes().map((node) => ({
      node: normalizeNode(node),
      data: extractParameters(node),
    }));
    merge(config, extraConfig);
    extractURLParameters();
    config.urlParams = urlParams;
  },
  setLanguage: (language) => {
    if (language) {
      i18n.setLocale(language);
    } else {
      let bestlang;
      for (let i = 0; i < config.locale.supported.length; i++) {
        const l = config.locale.supported[i].lang;
        if (i18n.getLocale().indexOf(l) === 0) {
          if (bestlang == null || bestlang.length < l.length) {
            bestlang = l;
          }
        }
      }

      if (bestlang) {
        i18n.setLocale(bestlang);
      } else {
        i18n.setLocale(config.locale.fallback);
      }
    }
  },
});

updateEntityTypesFromType2template(type2template, config.entitytypes);

config.setLanguage(econfig.page_language);

export default config;
