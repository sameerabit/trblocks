import renderingContext from '@entryscape/rdforms/src/view/renderingContext';
import registry from 'blocks/registry';

const getChoice = (entry, obj) => {
  const o = obj || {};
  const rdfutils = registry.get('rdfutils');
  o.value = entry.getResourceURI();
  o.label = rdfutils.getLabel(entry);
  o.description = rdfutils.getDescription(entry);

  return o;
};

let asyncCounter = 0;
const ignoreCallType = (callType) => {
  const async = registry.get('asynchandler');
  const ct = callType || `ignoreEC${asyncCounter}`;
  asyncCounter += 1;
  async.addIgnore(ct, async.codes.GENERIC_PROBLEM, true);
  return ct;
};


let defaultRegistered = false;
const ext = {
  getChoice(item, value) {
    const obj = {
      value,
      load(onSuccess) {
        const store = registry.get('entrystore');
        const storeutil = registry.get('entrystoreutil');
        const onError = () => {
          obj.label = value;
          obj.mismatch = true; // TODO replace with something else
          onSuccess();
        };
        const entryToObj = (entry) => {
          getChoice(entry, obj);
          delete obj.load;
          return obj;
        };
        if (value.indexOf(store.getBaseURI()) === 0) {
          const euri = store.getEntryURI(store.getContextId(value), store.getEntryId(value));
          return store.getEntry(euri, { asyncContext: ignoreCallType() })
            .then(entryToObj).then(onSuccess, onError);
        } else if (item.hasStyle('internalLink')) {
          let ct;
          if (store.getCache().getByResourceURI(value).size === 0) {
            ct = ignoreCallType('search');
          }
          return storeutil.getEntryByResourceURI(value, null, ct).then(entryToObj).then(
            onSuccess, onError);
        }
        const storeUtil = registry.get('entrystoreutil');
        const async = registry.get('asynchandler');
        async.addIgnore('search', async.codes.GENERIC_PROBLEM, true);
        return storeUtil.getEntryByResourceURI(value).then((entry) => {
          getChoice(entry, obj);
          delete obj.load;
          return obj;
        }).then(onSuccess, onError);
      },
    };
    return obj;
  },
  registerDefaults() {
    if (!defaultRegistered) {
      renderingContext.chooserRegistry.itemtype('choice').register(ext);
      defaultRegistered = true;
    }
  },
};

export default ext;
