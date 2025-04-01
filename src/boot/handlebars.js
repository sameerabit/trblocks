import block from 'blocks/boot/block';
import handlebars from 'handlebars/dist/cjs/handlebars';
import jquery from 'jquery';
import md5 from 'md5';
import { namespaces } from '@entryscape/rdfjson';
import collectionOptions from 'blocks/utils/options';
import registry from 'blocks/registry';
import error from 'blocks/boot/error';
import utils from '@entryscape/rdforms/src/utils';
import { transformURI } from 'blocks/utils/getHref';
import { blocksState } from 'blocks/utils/stateUtil';
import moment from 'moment';

const dataTypeToMomentDataType = {
  'http://www.w3.org/2001/XMLSchema#dateTime': 'LLL',
  'http://www.w3.org/2001/XMLSchema#date': 'LL',
};
let currentEntry;
const idx = [];
let counter = 0;
let bodycomponentId;
let group = {};
let eachpropExpand = 0;

['rowhead', 'rowexpand', 'listempty', 'listhead', 'listbody', 'listplaceholder', 'expandhead', 'expandbody']
  .forEach((name) => {
    handlebars.registerHelper(name, (options) => {
      group[name] = options.fn();
    });
  });

const safeLabel = str => encodeURIComponent(str.toLowerCase()).replace(/%[0-9A-F]{2}/gi, '_');

let initializeHelpers = () => {
  const useDivPlaceholder = registry.get('blocks_strictStandardHtml');
  block.list.forEach((name) => {
    handlebars.registerHelper(name, (options) => {
      if (block.synchronousList.indexOf(name) !== -1) {
        return `${block.run(name, null, options.data)}`;
      }
      counter += 1;
      const id = `_ebh_${counter}`;
      const obj = {
        id,
        component: name,
        options,
      };

      idx[idx.length - 1][id] = obj;

      if (name === 'template') {
        options.hash.htemplate = options.fn();
      } else if (typeof options.fn === 'function') {
        group = {};
        options.fn();
        obj.templates = group;
      }
      return new handlebars.SafeString(useDivPlaceholder ? `<div id="${id}" class="esbInlineDiv"></div>` : `<span id="${id}"></span>`);
    });
  });
  handlebars.registerHelper('body', () => {
    counter += 1;
    bodycomponentId = `_ebh_${counter}`;
    return new handlebars.SafeString(useDivPlaceholder ? `<div id="${bodycomponentId}" class="esbInlineDiv"></div>` : `<span id="${bodycomponentId}"></span>`);
  });
  handlebars.registerHelper('ifprop', (prop, options) => {
    if (currentEntry) {
      const subject = !options.hash.nested ? currentEntry.getResourceURI() : undefined;
      const props = prop.split(',');
      const stmts = [];
      props.forEach((p) => {
        const propStmts = currentEntry.getAllMetadata().find(subject, p);
        stmts.push(...propStmts);
      });
      const invert = options.hash.invert != null;
      const min = options.hash.min !== undefined && !isNaN(parseInt(options.hash.min, 10))
        ? parseInt(options.hash.min, 10) : 1;
      if (options.hash.uri || options.hash.literal) {
        // Try to interpret values as an JSON array.
        let values = options.hash.uri || options.hash.literal;
        try {
          values = JSON.parse(values);
          // eslint-disable-next-line no-empty
        } catch (e) {
          values = values.split(',');
        }
        values = Array.isArray(values) ? values : [values];
        // make sure everything is strings (handlebars sometimes interprets values as integers or booleans.
        values = values.map(v => `${v}`);
        if (options.hash.uri) {
          values = values.map(v => namespaces.expand(v));
        }
        const found = stmts.find(stmt => values.indexOf(stmt.getValue()) !== -1);
        if ((found && !invert) || (!found && invert)) {
          return options.fn(options.data.root);
        }
      } else if ((stmts.length >= min && !invert) || (stmts.length < min && invert)) {
        return options.fn(options.data.root);
      }
    }
    return null;
  });

  const propExtractor = (params) => {
    const { prop, options, stmt, val2named, val2choice, localize, es, rdfutils } = params;
    let label;
    let description;
    const val = stmt.getValue();
    const option = collectionOptions.labelFromOptions(prop, val);
    const choice = val2choice[val];

    const namedLabel = val2named[val.toLowerCase()];
    const fallback = options.hash.fallback ? options.hash.fallback : '';
    if (option) {
      label = option.label;
    } else if (namedLabel) {
      label = localize(namedLabel);
    } else if (choice && choice.label && !options.hash.forceNamed) {
      label = localize(choice.label);
      if (choice.description) {
        description = localize(choice.description);
      }
    } else if (stmt.getType() === 'uri') {
      /** @type Set */
      const entriesSet = es.getCache().getByResourceURI(val);
      if (entriesSet.size > 0) {
        label = rdfutils.getLabel(Array.from(entriesSet)[0]); // @todo perhaps getByResourceURI should return only one entry
        description = rdfutils.getDescription(Array.from(entriesSet)[0]); // @todo perhaps getByResourceURI should return only one entry
      } else {
        const g = stmt.getGraph();
        const r = stmt.getValue();
        const props = options.hash.labelprop;
        if (props) {
          label = utils.getLocalizedValue(
            utils.getLocalizedMap(g, r, options.hash.labelprop.split(','))).value;
        }
        if (!label) {
          label = rdfutils.getLabel(g, r);
        }
        if (!label && options.hash.fallback) {
          label = options.hash.fallback;
        }
      }
    }
    return { label: label || fallback, description: description || '', option };
  };

  const propExtratorHelp = (prop, options, stmt) => {
    const val2named = registry.get('blocks_named');
    const val2choice = registry.get('itemstore_choices');
    const es = registry.getEntryStore();
    const localize = registry.get('localize');
    const rdfutils = registry.get('rdfutils');
    return propExtractor({ prop, options, stmt, val2named, val2choice, localize, es, rdfutils });
  };
  const propExtratorLabel = (prop, options, stmt) => propExtratorHelp(prop, options, stmt).label;
  const propExtratorOption = (prop, options, stmt) => propExtratorHelp(prop, options, stmt).option;
  const propExtratorDescription = (prop, options, stmt) => propExtratorHelp(prop, options, stmt).description;

  const safe = val => new handlebars.SafeString(
    val.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/(\r\n|\r|\n)/g, '<br/>'));

  const regexpExtract = (regexpStr) => {
    if (regexpStr) {
      try {
        return new RegExp(regexpStr);
        // eslint-disable-next-line no-empty
      } catch (regExpError) {
      }
    }
    return undefined;
  };

  /**
   * Format value to local dateTime string
   *
   * @param {rdfjson/Graph} stmt
   * @param {string} val
   * @returns {string} local dateTime string
   */
  const getDateValue = (stmt, val) => {
    if (Number.isNaN(Date.parse(val))) return '';
    const valueAsDate = new Date(Date.parse(val));
    const dataType = stmt.getDatatype();
    const dateTimeFormat = dataTypeToMomentDataType[dataType];
    if (!dateTimeFormat) return '';
    return moment(valueAsDate).format(dateTimeFormat);
  };

  handlebars.registerHelper('eachprop', (prop, options) => {
    if (currentEntry) {
      const subject = !options.hash.nested ? currentEntry.getResourceURI() : undefined;
      let stmts = currentEntry.getAllMetadata().find(subject, prop);
      const val2choice = registry.get('itemstore_choices');
      const val2named = registry.get('blocks_named');
      const localize = registry.get('localize');
      const es = registry.getEntryStore();
      const rdfutils = registry.get('rdfutils');
      const filterRegexp = regexpExtract(options.hash.filter);
      const matchRegexp = regexpExtract(options.hash.regexp);
      const filterFunc = (stmt) => {
        if (options.hash.nodetype && stmt.getType() !== options.hash.nodetype) {
          return false;
        }
        if (filterRegexp) {
          return filterRegexp.test(stmt.getValue());
        }
        return true;
      };
      const perStmt = (stmt, last) => {
        const { label, description, option } = propExtractor(
          { prop, options, stmt, val2named, val2choice, localize, es, rdfutils });
        const val = stmt.getValue();
        let regexp = '';
        if (filterRegexp) {
          regexp = (val.match(matchRegexp) || ['', ''])[1];
        }
        return options.fn(Object.assign(options.data.root, {
          value: val,
          optionvalue: option ? option.value : '',
          md5: md5(val),
          type: stmt.getType(),
          language: stmt.getLanguage(),
          lang: stmt.getLanguage(),
          datatype: stmt.getDatatype(),
          dateValue: getDateValue(stmt, val),
          regexp,
          label,
          labelish: label || val,
          description,
          separator: last === true ? '' : new handlebars.SafeString(options.hash.separator || ', '),
        }));
      };
      let ret = [];
      stmts = stmts.filter(filterFunc);
      if (stmts.length > 1) {
        if (options.hash.limit !== undefined && stmts.length > options.hash.limit) {
          const firststmts = stmts.slice(0, options.hash.limit);
          const firstLastStmt = firststmts.pop();
          const reststmts = stmts.slice(options.hash.limit);
          const lastStmt = reststmts.pop();
          const expandid = `eachpropexpand_${eachpropExpand}`;
          eachpropExpand += 1;
          ret = [`<span id=${expandid} class="eachprop">`];
          ret = ret.concat(firststmts.map(s => perStmt(s, false)));
          ret.push(perStmt(firstLastStmt, true));
          ret.push(`<span class="eachprop__restseparator">${options.hash.separator || ', '}</span>`);
          ret.push(`<span class="eachprop__ellipsis">${options.hash.expandellipsis || '…'}</span>`);
          ret.push(`<button class="eachprop__expandbutton" onclick="document.getElementById('${expandid}').classList.add('eachprop--expanded');">${options.hash.expandbutton || 'Show more'}</button>`);
          ret.push('<span class="eachprop__rest">');
          ret = ret.concat(reststmts.map(s => perStmt(s, false)));
          ret.push(perStmt(lastStmt, true));
          ret.push('</span>');
          ret.push(`<button class="eachprop__unexpandbutton" onclick="document.getElementById('${expandid}').classList.remove('eachprop--expanded');">${options.hash.unexpandbutton || 'Show less'}</button>`);
          ret.push('</span>');
        } else {
          const lastStmt = stmts.pop();
          ret = stmts.map(s => perStmt(s, false));
          ret.push(perStmt(lastStmt, true));
        }
      } else if (stmts.length === 1) {
        ret = [perStmt(stmts[0], true)];
      }
      return ret.join('');
    }
    return null;
  });

  handlebars.registerHelper('resourceURI', (options) => {
    if (currentEntry) {
      const resURI = currentEntry.getResourceURI();
      return transformURI(resURI, options.hash.mask, options.hash.pattern) || resURI;
    }
    return undefined;
  });
  handlebars.registerHelper('metadataURI', (options) => {
    if (currentEntry) {
      const mdURI = currentEntry.getEntryInfo().getMetadataURI();
      return transformURI(mdURI, options.hash.mask, options.hash.pattern) || mdURI;
    }
    return undefined;
  });
  handlebars.registerHelper('entryURI', (options) => {
    if (currentEntry) {
      const entryURI = currentEntry.getURI();
      return transformURI(entryURI, options.hash.mask, options.hash.pattern) || entryURI;
    }
    return undefined;
  });

  /**
   * Get the localized value for literal statements if the language is set
   *
   * @param {Array<Statements>} statements
   * @returns {string|undefined}
   */
  const extractLocalizedValue = (statements) => {
    const localize = registry.get('localize');
    const localizedValues = {};
    statements.forEach((statement) => {
      if (statement.getType() !== 'literal') return;
      const languageCode = statement.getLanguage();
      const value = statement.getValue();
      if (languageCode && value) {
        localizedValues[languageCode] = value;
      }
    });
    if (Object.keys(localizedValues).length < 1) return;
    return localize(localizedValues);
  };

  handlebars.registerHelper('prop', (prop, options) => {
    if (currentEntry) {
      const subject = !options.hash.nested ? currentEntry.getResourceURI() : undefined;
      const filterRegexp = regexpExtract(options.hash.filter);
      const filterFunc = (stmt) => {
        if (options.hash.nodetype && stmt.getType() !== options.hash.nodetype) {
          return false;
        }
        if (filterRegexp) {
          return filterRegexp.test(stmt.getValue());
        }
        return true;
      };
      const stmts = currentEntry.getAllMetadata().find(subject, prop).filter(filterFunc);

      if (stmts.length === 0) {
        return '';
      }
      const val = extractLocalizedValue(stmts) || stmts[0].getValue();
      const stmt = stmts[0];
      const matchRegexp = regexpExtract(options.hash.regexp);
      if (matchRegexp) {
        return (val.match(matchRegexp) || ['', ''])[1];
      }
      switch (options.hash.render) {
        case 'label':
          return safe(propExtratorLabel(prop, options, stmt));
        case 'optionvalue':
          return propExtratorOption(prop, options, stmt);
        case 'description':
        case 'desc':
          return safe(propExtratorDescription(prop, options, stmt));
        case 'type':
          return stmts[0].getType();
        case 'language':
        case 'lang':
          return stmts[0].getLanguage();
        case 'datatype':
          return stmts[0].getDatatype();
        case 'md5':
          return md5(val);
        case 'dateValue':
          return getDateValue(stmt, val);
        default:
          break;
      }
      return safe(val);
    }
    return null;
  });
  handlebars.registerHelper('helperMissing', (options) => {
    throw new Error(`No helper for tag: ${options.name}`);
  });

  // Make sure this is only run once by emptying the function after first run
  initializeHelpers = () => {};
};

const parseValues = (obj, parentObj) => {
  const nobj = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (typeof value === 'string') {
      if (value.indexOf('inherit') === 0) {
        const useKey = value.split(':').length === 1 ? key : value.split(':')[1];
        if (parentObj[useKey] !== undefined) {
          nobj[key] = parentObj[useKey];
        }
      } else if (value[0] === '{' || value[0] === '[') {
        try {
          nobj[key] = JSON.parse(value);
        } catch (e) {
          nobj[key] = value;
        }
      } else {
        nobj[key] = obj[key];
      }
    } else if (typeof value === 'boolean') {
      nobj[key] = obj[key];
    }
  });
  return nobj;
};

export default {
  unGroup(template) {
    idx.push({});
    group = {};
    handlebars.compile(template)({});
    idx.pop();
    return group;
  },
  /**
   * @typedef {string} HandlebarsTemplate
   */
  /**
   * @param {Node} node - Node to insert into.
   * @param {object} data - Data for template rendering.
   * @param {HandlebarsTemplate} template - String template
   * @param {Store/Entry} entry - Data for template rendering.
   * @param {boolean} body - not sure yet
   *
   */
  run(node, data, template, entry, body = false) {
    // register handlebars helpers only once
    initializeHelpers();

    const runAllBlocksInTemplate = () => {
      const subscribeToStateChanges = () => {
        let subscribeTo = Array.isArray(data.subscribe) ? data.subscribe : data.subscribe.split(',');
        subscribeTo = subscribeTo.filter(property => data.state.hasOwnProperty(property));
        registry.onChange('blocks_state', (newState) => {
          let changed = false;
          subscribeTo.forEach((property) => {
            if (data.state[property] !== newState[property]) {
              changed = true;
            }
          });
          if (changed) {
            currentEntry = entry;
            runAllBlocksInTemplate();
          } else {
            subscribeToStateChanges();
          }
        }, false, true);
      };
      data.state = blocksState.getState();
      idx.push({});
      let handlebarTemplate;

      try {
        handlebarTemplate = handlebars.compile(template || data.htemplate || data.template,
          { data: { strict: true, knownHelpersOnly: true } });
        node.innerHTML = handlebarTemplate(data);
      } catch (e) {
        data.error = e.toString();
        data.errorCode = 4;
        data.errorCause = template || data.htemplate;
        error(node, data);
        return;
      }

      const cidx = idx.pop();
      if (data.subscribe) {
        subscribeToStateChanges();
      }
      Object.keys(cidx).forEach((id) => {
        const ob = cidx[id];
        const obj = {
          ...{
            templates: ob.templates,
            entry: data.entry || currentEntry,
            context: data.context,
            parentEntry: data.parentEntry,
            rowId: data.rowId || '',
          },
          ...parseValues(ob.options.hash || {}, data),
          ...{ block: ob.block || ob.component },
        };
        if (obj.entry === undefined) {
          delete obj.entry;
        }
        if (obj.context === undefined) {
          delete obj.context;
        }

        const attachNode = jquery(node).find(`#${ob.id}`)[0];
        if (attachNode.parentNode.childNodes.length !== 1) {
          block.run(ob.component, attachNode, obj);
        } else {
          block.run(ob.component, attachNode.parentNode, obj);
        }
      });
    };

    if (body) {
      runAllBlocksInTemplate();
      return jquery(node).find(`#${bodycomponentId}`)[0];
    }
    currentEntry = entry;
    runAllBlocksInTemplate();

    return null;
  },
};
