import DOMUtil from 'blocks/utils/htmlUtil';
import registry from 'blocks/registry';
import params from 'blocks/boot/params';
import { blocksState } from 'blocks/utils/stateUtil';
import { getBoolean } from 'blocks/utils/configUtil';
import utils from '../search/utils';

const updateCheckbox = (stateObject, checkbox, parameterName, checkedIf) => {
  if (parameterName in stateObject) {
    checkbox.checked = checkedIf === getBoolean(stateObject[parameterName], true);
  }
};

const updateState = (e, stateConfig, parameterName, valueIfChecked) => {
  const parameterConfig = stateConfig[parameterName];
  const urlKey = parameterConfig.key || parameterName;
  const checkboxChecked = e.target.checked;
  const newStateValues = {};
  const urlParams = params.getUrlParams();
  newStateValues[parameterName] = checkboxChecked ? valueIfChecked : !valueIfChecked;
  blocksState.updateValues(newStateValues);
  if (parameterConfig?.persistent === 'url') {
    urlParams[urlKey] = checkboxChecked ? valueIfChecked : !valueIfChecked;
    registry.set('urlParams', urlParams); // For triggering onChange
  }
};
/**
 * Renders a checkbox control for changing state parameter value.
 * Works with boolean dynamic state parameters
 *
 * @function renderStateControl
 * @param {Element} node node to add block to
 * @param {Object} data block config
 * @param {string} data.stateParameter The parameter to control with the checkbox
 * @param {string} [data.label='stateParameter'] The text label for the checkbox
 * @param {boolean} [data.checkedIf=true] Value for the checkbox
 * @param {string} [data.class] A class can be added to the wrapper element
 */
export default (node, data) => {
  const stateConfig = registry.get('blocks_state_config');
  const parameterName = data.stateParameter;
  data.state = blocksState.getState();
  if (stateConfig && stateConfig[parameterName]) {
    node.classList.add('esbCheckboxFilter');
    const checkboxWrapper = DOMUtil.create('div', {
      class: data.class ? data.class : 'form-check',
    }, node);
    const checkboxLabel = DOMUtil.create('label', {
      class: 'esbCheckboxFilter__label form-check-label',
      innerText: data.label || data.stateParameter,
    }, checkboxWrapper);
    const checkbox = DOMUtil.create('input', utils.commonAttrs({
      type: 'checkbox',
      class: 'esbCheckboxFilter__checkbox form-check-input',
    }, data), checkboxLabel, true);

    const checkedIf = getBoolean(data.checkedIf, true);
    checkbox.checked = checkedIf === getBoolean(data.state[parameterName], true);

    params.onInit((urlParams) => {
      registry.onChange('blocks_state', (stateObject) => {
        updateCheckbox(stateObject, checkbox, parameterName, checkedIf);
      });
      checkbox.addEventListener('change', (e) => {
        updateState(e, stateConfig, parameterName, checkedIf);
      });
    });
  }
};

