import registry from 'blocks/registry';
import labels from 'blocks/utils/labels';
import params from 'blocks/boot/params';

export default {
  setValues(filters, group, setValue) {
    const values = filters[group];
    if (values) {
      if (!values[0].label) {
        const addFromCollection = (col) => {
          values.forEach((item) => {
            const it = col.list.find(colItem => colItem.value === item.value);
            if (it) {
              setValue(it);
            } else {
              labels([item.value]).then((uri2label) => {
                setValue({ label: uri2label[item.value], group, value: item.value });
              });
            }
          });
        };
        if (group === 'term') {
          values.forEach(setValue);
        } else {
          const collectionName = `blocks_collection_${group}`;
          const collection = registry.get(collectionName);
          if (collection && collection.type === 'check') {
            return;
          }
          if (collection && collection.list) {
            addFromCollection(collection);
          } else if (collection && collection.type === 'facet') {
            registry.onChangeOnce(collectionName, (col) => {
              if (col.list) {
                addFromCollection(col);
              } else {
                registry.onChangeOnce(collectionName, addFromCollection);
              }
            });
          } else {
            values.forEach((item) => {
              labels([item.value]).then((uri2label) => {
                setValue({ label: uri2label[item.value], group, value: item.value });
              });
            });
          }
        }
      } else {
        values.forEach(setValue);
      }
    }
  },
  commonAttrs(conf, data) {
    if (data.title) {
      conf.title = data.title;
    }
    if (data.label) {
      conf['aria-label'] = data.label;
    }
    if (data.labelledby) {
      conf['aria-labelledby'] = data.labelledby;
    }
    if (data.describedby) {
      conf['aria-describedby'] = data.describedby;
    }
    if (data.live) {
      conf['aria-live'] = data.live;
    }
    if (data.placeholder) {
      conf.placeholder = data.placeholder;
    }
    return conf;
  },
  checkValidSearchString(query, data) {
    const regex = new RegExp(data.invalidSearchFilter || /[\^+\-[\]{}\\/!#~"]/);
    return query.match(regex) === null;
  },
  invalidSearchStringMessage(data) {
    return data.invalidSearchMessage || 'Search string not allowed to contain characters ^+-[]{}\\/!#"~.';
  },
  isValidSortOption(options, sortOption) {
    return !!options.find((option) => option.value === sortOption);
  },
  getCurrentSortValue(options, urlParams) {
    if (urlParams.sort && this.isValidSortOption(options, urlParams.sort[0])) {
      return options.find((option) => option.label === urlParams.sort[0]).value;
    }
    return registry.get('blocks_sortOrder');
  },
  getCurrentLimitValue(options, urlParams) {
    if (urlParams.limit && options.includes(urlParams.limit[0])) {
      return urlParams.limit[0];
    }
    return registry.get('blocks_limit').toString();
  },
  updateRegistryWithCurrentSortValue(options, sortValue) {
    const { label } = options.find((option) => option.value === sortValue);
    const latestUrlParams = { ...params.getUrlParams() };
    const urlParamValue = label;
    latestUrlParams.sort = [urlParamValue];
    registry.set('urlParams', latestUrlParams);
    registry.set('blocks_sortOrder', sortValue);
  },
  updateRegistryWithCurrentLimitValue(limitValue) {
    const latestUrlParams = { ...params.getUrlParams() };
    latestUrlParams.limit = [limitValue];
    registry.set('urlParams', latestUrlParams);
    registry.set('blocks_limit', parseInt(limitValue, 10));
  },
};
