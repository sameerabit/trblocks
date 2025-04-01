import jquery from 'jquery';
import clone from 'lodash-es/clone';

/**
 * Extracts an array of nodes in the current document that contains entryscape blocks information.
 * @return {Element[]}
 */
export const extractNodes = () => {
  let nodes = document.querySelectorAll('*[data-entryscape],*[data-entryscape-block],' +
    'script[type="text/x-entryscape-json"],script[type="text/x-entryscape-handlebar"]');
  return Array.from(nodes);
};

/**
 * Extracts parameters from a entryscape blocks node via it's data attributes.
 * @param {Element} node
 * @return {object}
 */
export const extractParameters = (node) => {
  const inmap = clone(jquery(node).data()); // Avoid modifying attributes on node
  let outmap = {};
  if (typeof inmap.entryscape === 'string') {
    outmap.block = inmap.entryscape;
    inmap.entryscape = true;
  }
  if (!inmap.entryscape && inmap.entryscapeBlock) {
    inmap.entryscape = true;
  }
  if (!inmap.entryscape && node.type === 'text/x-entryscape-handlebar') {
    inmap.entryscape = true;
  }

  if (typeof inmap.entryscape === 'object') {
    // As json in one param
    outmap = inmap.entryscape;
  } else if (inmap.entryscape === true) {
    Object.keys(inmap).forEach((key) => {
      if (key.indexOf('entryscape') === 0 && key.length > 10) {
        outmap[key[10].toLowerCase() + key.substr(11)] = inmap[key];
      }
    });
  } else {
    outmap.error = 'Wrong parameter value in entryscape trigger attribute, ' +
      'must either be boolean true or an json string';
    outmap.errorCode = 1;
    outmap.errorCause = inmap.entryscape;
  }

  /*if (outmap.extend && econfig.macros[outmap.extend]) {
    outmap = merge(econfig.macros[outmap.extend], outmap);
  }*/

  const scripttype = jquery(node).attr('type');
  if (scripttype === 'text/x-entryscape-json') {
    const datastr = jquery(node).html();
    try {
      outmap = JSON.parse(datastr);
    } catch (e) {
      outmap.error = `Expression inside script tag with type "text/x-entryscape-json" is not valid json: ${e}`;
      outmap.errorCode = 2;
      outmap.errorCause = datastr;
    }
    if (!outmap.block && !outmap.component) {
      outmap.block = 'config';
    }
  } else if (scripttype === 'text/x-entryscape-handlebar') {
    outmap.htemplate = jquery(node).html();
    if (!outmap.block && !outmap.component) {
      outmap.block = 'template';
    }
  }
  return outmap;
};

export const normalizeNode = (node) => {
  const scripttype = jquery(node).attr('type');
  if (scripttype !== 'text/x-entryscape-json' && scripttype !== 'text/x-entryscape-handlebar') {
    jquery(node).addClass('entryscape');
  }
  return jquery(node).is('script') ? jquery('<span>')
    .addClass('entryscape')
    .insertAfter(node)[0] : node;
};

//  fixStuff(outmap);
