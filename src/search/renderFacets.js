import DOMUtil from 'blocks/utils/htmlUtil';
import md5 from 'md5';
import registry from 'blocks/registry';
import filter from 'blocks/utils/filter';
import { getSelectedItems } from 'blocks/utils/collectionUtil';
import params from 'blocks/boot/params';
import 'jquery';
import cloneDeep from 'lodash-es/cloneDeep';
import { namespaces } from '@entryscape/rdfjson';

/**
 * Construct a link to a given facet, or a without a facet.
 *
 * @param facetKey the key for the facet
 * @param value the value to include or exclude from the link
 * @param include if true the link will include the facet
 * @return {string}
 */
const getHrefFor = (facetKey, value, include) => {
  const filterObj = registry.get('blocks_search_filter') || {};
  const urlParams = cloneDeep(params.getUrlParams());

  const collections = registry.get('blocks_collections');
  delete urlParams.term;
  collections.forEach((c) => {
    delete urlParams[c.name];
  });

  Object.keys(filterObj).forEach((key) => {
    const vs = filterObj[key].filter(v => v.value !== '__other'); // Do not add the other option to the page parameters.
    urlParams[key] = vs.map(v => namespaces.shortenKnown(v.value));
  });

  const shortValue = namespaces.shortenKnown(value);
  const collectionFilter = urlParams[facetKey] || [];
  if (include) {
    collectionFilter.push(shortValue);
    urlParams[facetKey] = collectionFilter;
  } else {
    collectionFilter.splice(collectionFilter.indexOf(shortValue), 1);
    if (collectionFilter.length === 0) {
      delete urlParams[facetKey];
    }
  }

  return params.getLink('', urlParams);
};

class FacetBlock {
  constructor(collection, node, data) {
    this.def = collection;
    this.domNode = DOMUtil.create('div', { class: `esbFacets__collection collection_${collection.name}` });
    this.data = data;
    node.appendChild(this.domNode);
    const hl = data.hl !== undefined && !isNaN(parseInt(data.hl, 10)) ? parseInt(data.hl, 10) : 3;
    this.headerNode = DOMUtil.create(`h${hl}`, { class: 'esbFacets__facetHeader', innerHTML: this.def.label });
    this.domNode.appendChild(this.headerNode);
    this.bodyNode = DOMUtil.create('ul');
    this.domNode.appendChild(this.bodyNode);
    this.viewAllNode = DOMUtil.create('div', { class: 'esbFacets__limit' }, this.domNode);
    this.viewAllNode.style.display = 'none';
    this.viewAllButtonNode = DOMUtil.create('button',
      { class: 'btn btn-sm btn-secondary esbFacets__limitButton',
        innerHTML: data.showmore || 'Show more' }, this.viewAllNode);
    const self = this;
    this.viewAllButtonNode.onclick = () => {
      if (self.def.loadedLimit > 0) {
        self.def.changeLoadLimit();
      } else {
        self.def.changeLoadLimit(self.def.limit);
      }
    };
    this.collectionName = `blocks_collection_${collection.name}`;
    registry.onChange(this.collectionName, this.render.bind(this), true);
  }

  render() {
    if (!this.def.list) {
      return;
    }
    const list = this.def.list;
    const selectedItems = getSelectedItems(this.def);
    const hasSelected = selectedItems.length > 0;
    const onlyOneOption = hasSelected && !this.def.multiSelect;
    this.renderExpand(list, onlyOneOption);
    this.bodyNode.innerHTML = '';

    const isSelected = ({ value }) => {
      return selectedItems.some((item) => item.value === value);
    };
    if (onlyOneOption) {
      selectedItems.forEach((item) => this.drawOption(item, true), this);
    } else {
      list.forEach((item) => this.drawOption(item, isSelected(item)), this);
    }
  }

  renderExpand(list, onlyOneOption) {
    if (onlyOneOption || (!this.def.limitReached && (typeof this.def.limit === 'undefined' || (this.def.limit > 0 &&
      list.length <= this.def.limit)))) {
      // Nothing to expand
      this.viewAllNode.style.display = 'none';
    } else if (this.def.loadedLimit > 0) {
      this.viewAllButtonNode.innerHTML = this.data.showmore || 'Show more';
      this.viewAllNode.style.display = '';
    } else {
      this.viewAllButtonNode.innerHTML = this.data.showless || 'Show less';
      this.viewAllNode.style.display = '';
    }
  }

  drawOption(item, selected) {
    const md = md5(item.value);
    let el = DOMUtil.create('li', { class: `esbFacets__option md5_${md} ${selected ? 'esbFacets--selected' : ''}` });
    this.bodyNode.appendChild(el);
    if (!selected) {
      const a = DOMUtil.create('a', {
        class: 'esbFacets__optionLink',
        href: getHrefFor(this.def.name, item.value, true),
      });
      el.appendChild(a);
      el = a;
    }
    const labelAttr = { innerHTML: item.label, class: 'facetLabel' };
    if (this.def.badgeColors) {
      labelAttr[`data-esb-collection-${item.group}`] = item.value;
      labelAttr.class = 'facetLabel esbBadge';
    }
    el.appendChild(DOMUtil.create('span', labelAttr));
    if (item.occurence) {
      el.appendChild(DOMUtil.create('span', { class: 'esbFacets__occurence', innerHTML: `(${item.occurence})` }));
    }
    if (selected) {
      const label = this.data.removefacet || 'Remove filter';
      const button = DOMUtil.create('a', {
        class: 'btn btn-sm btn-link esbFacets__clear',
        'aria-label': label,
        title: label,
        href: getHrefFor(this.def.name, item.value, false) });
      el.appendChild(button);
      button.appendChild(DOMUtil.create('i', {
        'aria-hidden': 'true',
        class: 'fas fa-times',
      }));

      button.onclick = function (e) {
        e.stopPropagation();
        filter.remove(item);
        return false;
      };
    }
    el.onclick = function () {
      filter.add(item);
      return false;
    };
  }
}

export default (node, data, items) => {
  registry.onChange('blocks_collections', (collections) => {
    node.innerHTML = '';
    if (data.include) {
      const include = Array.isArray(data.include) ? data.include : data.include.split(',');
      include.forEach((collectionKey) => {
        const collection = collections.find(col => col.name === collectionKey);
        if (collection) {
          new FacetBlock(collection, node, data);
        }
      });
    } else {
      // eslint-disable-next-line no-nested-ternary
      const exclude = data.exclude ? (Array.isArray(data.exclude) ? data.exclude : data.exclude.split(',')) : [];
      collections.forEach((collection) => {
        if (collection.includeAsFacet && !exclude.includes(collection.name) && collection.property != null) {
          new FacetBlock(collection, node, data);
        }
      });
    }
  }, true, true);
};
