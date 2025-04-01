import { Overlay } from 'ol';
import Popover from 'bootstrap/js/src/popover';

const createPopup = (popupElement, map, content, title = '') => {
  return new Popover(popupElement, {
    placement: 'left',
    customClass: 'esbMapPopover',
    html: true,
    container: map.getTarget(),
    content,
    title,
  });
};

export const addPopupOverlay = (olMap) => {
  const popupElement = document.createElement('div');
  olMap.getTarget().appendChild(popupElement);
  const olOverlay = new Overlay({
    element: popupElement,
    positioning: 'bottom-center',
    stopEvent: false,
    autoPan: true,
  });
  olMap.addOverlay(olOverlay);
  let popover;

  const disposePopover = () => {
    if (popover) {
      popover.dispose();
      popover = undefined;
    }
  };

  olMap.on('click', (e) => {
    const feature = olMap.forEachFeatureAtPixel(e.pixel, (eventFeature) => eventFeature);
    disposePopover();
    if (!feature) {
      return;
    }
    olOverlay.setPosition(e.coordinate);
    const properties = feature.get('properties');
    if (properties.popupContent) {
      const { popupContent, title } = properties;
      popover = createPopup(popupElement, olMap, popupContent, title);
    }
    popover.show();
  });

  olMap.on('pointermove', (e) => {
    const pixel = olMap.getEventPixel(e.originalEvent);
    const hit = olMap.hasFeatureAtPixel(pixel);
    olMap.getTarget().style.cursor = hit ? 'pointer' : '';
  });
  olMap.on('movestart', disposePopover);
};
