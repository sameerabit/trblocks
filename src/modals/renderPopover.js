import 'blocks/modals/esbModal';
import { createModalElement, createToggleElement } from 'blocks/modals/modalUtils';

/**
 * Renders a popover on button click built on esb-modal component
 *
 * @function renderPopover
 * @param {Element} node node to add block to
 * @param {object} data block config
 * @param {string} [data.saveButtonText='Close'] The text label for the close button
 * @param {string} [data.openButtonText='Open'] The text label for the open button
 * @param {string} [data.openTemplate] A handlebar template for popover toggle default to a button
 * @param {string} [data.class] A class can be added to the modals content container
 * @param {string} [data.headerTemplate] Handle bar template for heading
 * @param {string} [data.contentTemplate] Handle bar template for content of modals
 * @param {string} [data.block] Name of custom block
 * @param {'popover'} data.extends
 */
const renderPopover = (node, data) => {
  let modalActive = false;
  const configData = { ...data, openTemplate: data.openTemplate || data.openButtonText || 'Open' };
  const modalButtons = ['close'];
  const toggleTagName = data.openTemplate ? 'div' : 'button';
  const toggleElement = createToggleElement(configData, node, toggleTagName);

  toggleElement.addEventListener('click', () => {
    if (modalActive) {
      return;
    }
    modalActive = true;
    toggleElement.setAttribute('aria-expanded', 'true');
    let modalElement = createModalElement(configData, node, modalButtons);

    const removeModal = () => {
      modalElement.remove();
      modalElement = null;
      modalActive = false;
      toggleElement.setAttribute('aria-expanded', 'false');
    };

    modalElement.addEventListener('clickOnClose', () => {
      removeModal();
    });

    modalElement.addEventListener('clickOnBackdrop', () => {
      removeModal();
    });
  });
};
export default renderPopover;
