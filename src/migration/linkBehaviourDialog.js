import registry from 'blocks/registry';
import jquery from 'jquery';
import Presenter from '@entryscape/rdforms/src/view/Presenter';
import system from '@entryscape/rdforms/src/model/system';
import DOMUtil from 'blocks/utils/htmlUtil';
import { Graph } from '@entryscape/rdfjson';
import getLookupStore from 'blocks/utils/lookupStoreUtil';

const linkBehaviour = {
  dialog: true,
  includeResourceInfo: false,
};

const entrystoreutil = registry.get('entrystoreutil');

/**
 * @param {HTMLElement} presenterNode
 * @param {Entry} entry
 * @returns {HTMLElement} {Node}
 */
const generatePresenterWithResourceInformation = (presenterNode, entry) => {
  const resourceUri = entry.getResourceURI();
  const isLink = entry.isExternal() || (entry.isLocal() && entry.getEntryInfo().getSize() > 0);
  const popoverContent = DOMUtil.create('div', {}, null);
  popoverContent.appendChild(presenterNode);
  if (isLink) {
    const resourceLink = DOMUtil.create(
      'a',
      { innerText: resourceUri, target: '_blank' },
      popoverContent,
      presenterNode
    );
    resourceLink.href = resourceUri;
    DOMUtil.create('i', { class: 'fas fa-external-link-alt ml-2' }, resourceLink);
    return popoverContent;
  }
  DOMUtil.create('span', { innerText: resourceUri }, popoverContent, presenterNode);
  return popoverContent;
};

const choiceClick = (aroundNode, item, template, entry) => {
  const presenter = new Presenter({}, DOMUtil.create('div'));
  let graph;
  if (entry.isReference() || entry.isLinkReference()) {
    graph = new Graph();
    graph.addAll(entry.getAllMetadata());
    graph.addAll(entry.getCachedExternalMetadata());
  } else {
    graph = entry.getAllMetadata();
  }
  presenter.show({
    resource: entry.getResourceURI(),
    graph,
    template,
  });
  let label = item.getLabel();
  if (label != null && label !== '') {
    label = label.charAt(0).toUpperCase() + label.slice(1);
  } else {
    label = '';
  }

  const popoverContent = linkBehaviour.includeResourceInfo
    ? generatePresenterWithResourceInformation(presenter.domNode, entry)
    : presenter.domNode;
  const popoverOptions = {
    html: true,
    container: jquery('#entryscape_dialogs')[0],
    placement: 'auto',
    trigger: 'manual',
    template:
      '<div class="popover" role="tooltip">' +
      '<div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
    title: label,
    content: popoverContent,
  };
  const jn = jquery(aroundNode).popover(popoverOptions).attr('data-toggle', 'popover');
  aroundNode.setAttribute('data-original-title', label); // Hack to make popover pick up a better title
  setTimeout(() => {
    jn.popover('show');
  }, 30);
  jquery(document).on('click.popoverRemover', (e) => {
    if (!e.target.hasAttribute('data-toggle')) {
      jn.popover('hide');
      jquery(document).off('.popoverRemover');
    }
  });
};

const addPresenter = async (node, binding, item) => {
  const entry = await entrystoreutil.getEntryByResourceURI(binding.getValue());
  const context = entry.getContext();
  const lookupStore = await getLookupStore(entry);
  const entityType = await lookupStore.getEntityTypeByConstraints(item.getConstraints(), undefined, context);
  const template = entityType.template();
  if (entityType) {
    choiceClick(node, item, template, entry);
  }
};

system.attachExternalLinkBehaviour = (node) => {
  node.setAttribute('target', '_blank');
};

system.attachLinkBehaviour = async (node, binding) => {
  const item = binding.getItem();
  if (item.getType() === 'choice') {
    node.onclick = (e) => {
      if (linkBehaviour.dialog) {
        e.preventDefault();
        addPresenter(node, binding, item);
      }
    };
    return;
  }
  node.setAttribute('target', '_blank');
};

export default linkBehaviour;
