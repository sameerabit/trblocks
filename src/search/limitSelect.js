import DOMUtil from 'blocks/utils/htmlUtil';
import registry from 'blocks/registry';
import jquery from 'jquery';
import '@selectize/selectize';
import params from 'blocks/boot/params';
import utils from './utils';

export default function (node, data) {
  node.classList.add('esbLimit');
  const selectElement = DOMUtil.create(
    'select',
    utils.commonAttrs({ class: data.class || 'form-control' }, data),
    node
  );
  const options = registry.get('blocks_limitOptions').map((option) => option.toString());
  const validOptionValues = [];
  options.forEach((value) => {
    validOptionValues.push(value);
    DOMUtil.create(
      'option',
      utils.commonAttrs(
        {
          value,
          innerHTML: value,
        },
        data
      ),
      selectElement
    );
  });
  const { selectize } = jquery(selectElement).selectize()[0];

  params.onInit((urlParams) => {
    let changeTriggeredFromRegistry = false;
    let currentValue = utils.getCurrentLimitValue(options, urlParams);
    if (validOptionValues.includes(currentValue)) {
      selectize.setValue(currentValue);
    }

    selectize.on('change', (value) => {
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
      if (valueString === currentValue || !validOptionValues.includes(valueString)) return;
      changeTriggeredFromRegistry = true;
      selectize.setValue(valueString);
    });
  });
}
