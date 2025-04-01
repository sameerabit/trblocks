import DOMUtil from 'blocks/utils/htmlUtil';
import registry from 'blocks/registry';
import jquery from 'jquery';
import '@selectize/selectize';
import params from 'blocks/boot/params';
import utils from './utils';

export default function (node, data) {
  node.classList.add('esbSort');
  const selectElement = DOMUtil.create('select', utils.commonAttrs({ class: data.class || '' }, data), node);
  const options = registry.get('blocks_sortOptions');
  const validOptionValues = [];
  options.forEach(({ value, label }) => {
    validOptionValues.push(value);
    DOMUtil.create(
      'option',
      utils.commonAttrs(
        {
          value,
          innerHTML: label,
        },
        data
      ),
      selectElement
    );
  });
  const { selectize } = jquery(selectElement).selectize()[0];

  params.onInit((urlParams) => {
    let changeTriggeredFromRegistry = false;
    let currentValue = utils.getCurrentSortValue(options, urlParams);
    if (validOptionValues.includes(currentValue)) {
      selectize.setValue(currentValue);
    }

    selectize.on('change', (value) => {
      if (!utils.isValidSortOption(options, value)) return;
      currentValue = value;
      if (changeTriggeredFromRegistry) {
        changeTriggeredFromRegistry = false;
        return;
      }
      utils.updateRegistryWithCurrentSortValue(options, value);
    });

    registry.onChange('blocks_sortOrder', (value) => {
      if (value === currentValue || !validOptionValues.includes(value)) return;
      changeTriggeredFromRegistry = true;
      selectize.setValue(value);
    });
  });
}
