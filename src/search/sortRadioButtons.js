import DOMUtil from 'blocks/utils/htmlUtil';
import registry from 'blocks/registry';
import params from 'blocks/boot/params';
import utils from './utils';

export default function (node, data) {
  const fieldset = DOMUtil.create('fieldset', utils.commonAttrs({ class: data.class || '' }, data), node);
  const options = registry.get('blocks_sortOptions');
  const radioButtonMap = new Map();
  options.forEach(({ label, value }) => {
    const radioOption = DOMUtil.create('div', { class: 'esbRadioOption' }, fieldset);
    const labelElement = DOMUtil.create('label', { innerText: label }, radioOption);
    const radioButton = DOMUtil.create(
      'input',
      {
        class: 'esbRadioButton',
        type: 'radio',
        value,
        name: 'sort',
      },
      labelElement,
      true
    );
    radioButtonMap.set(value, radioButton);
  });

  params.onInit((urlParams) => {
    let changeTriggeredFromRegistry = false;
    let currentValue = utils.getCurrentSortValue(options, urlParams);
    if (radioButtonMap.has(currentValue)) {
      radioButtonMap.get(currentValue).checked = true;
    }

    fieldset.addEventListener('change', (e) => {
      const { value } = e.target;
      if (!utils.isValidSortOption(options, value)) return;
      currentValue = value;
      if (changeTriggeredFromRegistry) {
        changeTriggeredFromRegistry = false;
        return;
      }
      utils.updateRegistryWithCurrentSortValue(options, value);
    });

    registry.onChange('blocks_sortOrder', (value) => {
      if (value === currentValue || !radioButtonMap.has(value)) return;
      changeTriggeredFromRegistry = true;
      radioButtonMap.get(value).click();
    });
  });
}
