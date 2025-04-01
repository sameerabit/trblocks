import DOMUtil from 'blocks/utils/htmlUtil';
import handlebars from 'blocks/boot/handlebars';

export const createToggleElement = (configData, node, tagName) => {
  const toggleElement = DOMUtil.create(
    tagName,
    {
      class: `esbModalToggle${tagName === 'button' ? ' btn btn-sm' : ''}`,
      'aria-controls': 'esbModalContainer',
      'aria-expanded': 'false',
    },
    node
  );
  handlebars.run(toggleElement, configData, configData.openTemplate, null);
  return toggleElement;
};

export const createModalElement = (configData, node, buttons) => {
  const modalElement = document.createElement('esb-modal');
  modalElement.data = configData;
  modalElement.buttons = buttons;

  node.appendChild(modalElement);
  if (configData.headerTemplate && configData.headerTemplate.length > 0) {
    handlebars.run(modalElement.slotNodes.header, configData, configData.headerTemplate, null);
  }
  handlebars.run(modalElement.slotNodes.content, configData, configData.contentTemplate, null, false);
  return modalElement;
};
