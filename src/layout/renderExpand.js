import DOMUtil from 'blocks/utils/htmlUtil';
import registry from 'blocks/registry';
import filter from 'blocks/utils/filter';
import handlebars from 'blocks/boot/handlebars';

export default (node, data) => {
  filter.guard(node, data.if);
  node.classList.add('esbExpand');
  node.classList.add('esbCollapsed');
  if (data.class) {
    node.classList.add(data.class);
  }
  const headNode = DOMUtil.create('div', { class: 'esbExpandHead' });
  const expandNode = DOMUtil.create('div', { class: 'esbExpandBody' });
  node.appendChild(headNode);
  node.appendChild(expandNode);
  data.templates = data.templates || {};
  const headTemplate = data.templates.expandhead || data.expandhead;
  const bodyTemplate = data.templates.expandbody || data.expandbody;
  handlebars.run(headNode, data, headTemplate);

  let initialized = false;
  let expanded = false;
  const initialize = () => {
    initialized = true;
    // If no explicit rowexpand template is given use
    handlebars.run(expandNode, data, bodyTemplate);
  };
  const toggle = () => {
    if (!initialized) {
      initialize();
    }
    if (expanded) {
      jquery(expandNode).slideUp(300);
    } else {
      jquery(expandNode).slideDown(300);
    }
    node.classList.toggle('esbExpanded');
    node.classList.toggle('esbCollapsed');
    expanded = !expanded;
  };

  if (data.initialExpandOn) {
    registry.onChange('blocks_search_filter', () => {
      if (data.initialExpandOn.split(',').find(collection => filter.has(collection))) {
        toggle();
      }
    }, true, true);
  }

  // Expand on click on anything with the esbExpandButton class set.
  jQuery(headNode).find('.esbExpandButton').click((ev) => {
    ev.stopPropagation();
    toggle();
  });

  if (data.clickExpand) {
    node.classList.add('esbClickExpand');
    jQuery(headNode).click(() => toggle());
  }
};
