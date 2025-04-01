import DOMUtil from 'blocks/utils/htmlUtil';
import registry from 'blocks/registry';
import params from 'blocks/boot/params';
import utils from './utils';

export default function (node, data) {
  const fieldset = DOMUtil.create('fieldset', utils.commonAttrs({ class: data.class || '' }, data), node);
  const options = registry.get('blocks_limitOptions').map((option) => option.toString());
  const radioButtonMap = new Map();
  options.forEach((value) => {
    const radioOption = DOMUtil.create('div', { class: 'esbRadioOption' }, fieldset);
    const labelElement = DOMUtil.create('label', { innerText: value.toString() }, radioOption);
    const radioButton = DOMUtil.create(
      'input',
      {
        class: 'esbRadioButton',
        type: 'radio',
        value,
        name: 'limit',
      },
      labelElement,
      true
    );
    radioButtonMap.set(value, radioButton);
  });

  params.onInit((urlParams) => {
    let changeTriggeredFromRegistry = false;
    let currentValue = utils.getCurrentLimitValue(options, urlParams);
    if (radioButtonMap.has(currentValue)) {
      radioButtonMap.get(currentValue).checked = true;
    }

    fieldset.addEventListener('change', (e) => {
      const { value } = e.target;
      if (!options.includes(value)) return;
      currentValue = value;
      if (changeTriggeredFromRegistry) {
        changeTriggeredFromRegistry = false;
        return;
      }
      utils.updateRegistryWithCurrentLimitValue(value);
    });

    registry.onChange('blocks_limit', (value) => {
      const valueString = value.toString();
      if (valueString === currentValue || !radioButtonMap.has(valueString)) return;
      changeTriggeredFromRegistry = true;
      radioButtonMap.get(valueString).click();
    });
  });
}
