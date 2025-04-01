import DOMUtil from 'blocks/utils/htmlUtil';
import { getBindingBounds } from 'blocks/graphics/locationViewUtils';

/**
 * LocationPresenter is used for presenting location Metadata
 */

export default (node, binding, bundle) => {
  const bounds = getBindingBounds(binding);

  const componentsContainer = DOMUtil.create('div', { class: 'escoPosition' }, node);
  DOMUtil.create('span', { class: 'fas fa-globe fa-2x escoPosition__globe', 'aria-hidden': 'true' }, componentsContainer);

  let geoCoords;
  if (bounds.type === 'point') {
    geoCoords = ['latitude', 'longitude'];
  } else {
    geoCoords = ['north', 'south', 'east', 'west'];
  }

  geoCoords.forEach((dir) => {
    let dirTemp = dir.toLowerCase();
    const lable = DOMUtil.create('span', {
      class: 'escoPosition__label',
      title: bundle[`${dirTemp}Placeholder`],
    }, componentsContainer);
    lable.innerText = bundle[`${dirTemp}LabelShort`];


    // There is a difference in naming between the bound type and the label naming on points
    // so we need to account for that here after adding the label
    if (dirTemp === 'latitude') {
      dirTemp = 'north';
    }
    if (dirTemp === 'longitude') {
      dirTemp = 'west';
    }

    const directionValue = bounds !== undefined ? Number.parseFloat(bounds.directions[dirTemp]) : '';

    const dirValueNode = DOMUtil.create('span', {
      class: 'escoPosition__value',
      title: 'directionValue',
    }, componentsContainer);
    dirValueNode.innerText = !Number.isNaN(directionValue) ? directionValue.toFixed(1) : '';
  });
};
