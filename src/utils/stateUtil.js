import registry from 'blocks/registry';
import params from 'blocks/boot/params';
import { getBoolean } from 'blocks/utils/configUtil';

/**
 * Initiates the state in registry from the state configuration and url hash-parameters if present
 *
 * @param {{string: boolean|number|string}} stateConfig
 */
export const initState = (stateConfig) => {
  if (registry.get('blocks_state')) {
    return;
  }
  const urlParams = params.getUrlParams();
  const blocksState = {};
  Object.keys(stateConfig).forEach((parameter) => {
    const urlKey = stateConfig[parameter].key || parameter;
    const parameterValue = urlParams[urlKey] ? urlParams[urlKey][0] : stateConfig[parameter].value;
    if (stateConfig[parameter].type === 'boolean') {
      blocksState[parameter] = getBoolean(parameterValue, true);
    } else if (stateConfig[parameter].type === 'string') {
      blocksState[parameter] = parameterValue.toString();
    } else if (stateConfig[parameter].type === 'number') {
      blocksState[parameter] = parseInt(parameterValue, 10);
    }
  });
  registry.set('blocks_state', blocksState);
};

export const blocksState = {
  /**
   * Returns returns a shallow copy of state parameters with values
   * {parameter: value, ...}
   *
   * @returns {object|undefined}
   */
  getState: () => {
    const stateObject = registry.get('blocks_state');
    if (!stateObject) {
      return;
    }
    return JSON.parse(JSON.stringify(stateObject));
  },

  /**
   * Update the values for dynamic parameters
   *
   * @param {{string: boolean|number|string}} parameterValues {parameter1: newValue, parameter2: newValue, ...}
   */
  updateValues: (parameterValues) => {
    const stateConfig = registry.get('blocks_state_config');
    const newState = blocksState.getState();
    Object.keys(parameterValues).forEach((parameterName) => {
      if (stateConfig[parameterName] && getBoolean(stateConfig[parameterName].dynamic, false)) {
        newState[parameterName] = parameterValues[parameterName];
      }
    });
    registry.set('blocks_state', newState);
  },
};
