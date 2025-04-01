import 'blocks/modals/esbModal';
import registry from 'blocks/registry';
import filter from 'blocks/utils/filter';
import { blocksState } from 'blocks/utils/stateUtil';
import { createModalElement, createToggleElement } from 'blocks/modals/modalUtils';

/**
 * Renders a modals on button click
 * Filter controls and state controls placed inside the modals template will not take effect until the modals is saved
 *
 * @function renderDialog
 * @param {Element} node node to add block to
 * @param {object} data block config
 * @param {string} [data.openButtonText='Settings'] The text label for the button that will open the modals
 * @param {string} [data.openTemplate] A handlebar template for popover toggle default to a button
 * @param {string} [data.saveButtonText='Save'] The text label for the save button
 * @param {string} [data.cancelButtonText='Cancel'] The text label for the cancel button
 * @param {string} [data.class] A class can be added to the modals content container
 * @param {string} [data.headerTemplate] Handle bar template for heading
 * @param {string} [data.contentTemplate] Handle bar template for content of modals
 * @param {string} [data.block] Name of custom block
 * @param {'dialog'} data.extends
 */
const renderDialog = (node, data) => {
  let modalActive = false;
  const configData = { ...data, openTemplate: data.openTemplate || data.openButtonText || 'Settings' };
  const modalButtons = ['cancel', 'save'];
  const toggleTagName = data.openTemplate ? 'div' : 'button';
  const toggleElement = createToggleElement(configData, node, toggleTagName);

  toggleElement.addEventListener('click', () => {
    if (modalActive) {
      return;
    }
    modalActive = true;
    toggleElement.setAttribute('aria-expanded', 'true');
    let modalElement = createModalElement(configData, node, modalButtons);
    const registryKeys = [
      'blocks_search_filter',
      'urlParams',
      'blocks_limit',
      'blocks_sortOrder',
      'blocks_state',
    ];
    registry.beginBuffer(registryKeys);

    const removeModal = () => {
      modalElement.remove();
      modalElement = null;
      modalActive = false;
      toggleElement.setAttribute('aria-expanded', 'false');
    };

    modalElement.addEventListener('clickOnSave', () => {
      registry.applyBuffer(registryKeys);
      filter.updateFilter(filter.getFilterGroupValues()); // For triggering onChange
      blocksState.updateValues({}); // For triggering onChange
      removeModal();
    });

    modalElement.addEventListener('clickOnCancel', () => {
      registry.rollbackBuffer();
      removeModal();
    });

    modalElement.addEventListener('clickOnBackdrop', () => {
      registry.rollbackBuffer();
      removeModal();
    });
  });
};
export default renderDialog;
