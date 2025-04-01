import renderingContext from '@entryscape/rdforms/src/view/renderingContext';
import { i18n } from 'esi18n';
import escoRdforms from 'blocks/migration/nls/escoRdforms.nls';
import locationMapView from 'blocks/graphics/locationMapView';
import locationTextView from 'blocks/graphics/locationTextView';
import './geochooser.css';

let defaultRegistered = false;

const GeoChooser = {
  presenter(node, binding) {
    const bundle = i18n.getLocalization(escoRdforms);
    locationTextView(node, binding, bundle);
    locationMapView(node, binding, bundle);
  },
  registerDefaults() {
    if (!defaultRegistered) {
      defaultRegistered = true;
      renderingContext.presenterRegistry
        .datatype('http://www.opengis.net/ont/geosparql#wktLiteral')
        .register(GeoChooser.presenter);
      renderingContext.presenterRegistry.style('geoPoint').register(GeoChooser.presenter);
    }
  },
};

export default GeoChooser;
