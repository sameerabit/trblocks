import Control from 'ol/control/Control';
import DOMUtil from 'blocks/utils/htmlUtil';

/**
 * OpenLayers LayerLegend Control, displays an expandable box whit legend-images for the layers.
 *
 * The legends are toggled on and off with the layers visibility
 *
 * The control will be added if 'legend' is set to true in the geoMap-block and there are legends included
 * from the getCapabilities call or in the metadata.
 * The text for the button can be set in the geoMap-block by setting 'legendButtonText'
 */

export default class LayerLegend extends Control {
  constructor(options) {
    const olLegend = document.createElement('div');
    super({ element: olLegend });
    this.olLegend = olLegend;
    this.legendButtonText = options.legendButtonText;
    this.noLegendText = options.noLegendText;
    this.expandableBox = document.createElement('div');
    this.legends = [];
    this.view = null;
  }

  // The legend control gets access to the map because setMap is executed when the controls are added to the map
  setMap(olMap) {
    super.setMap(olMap);
    const layers = olMap.getLayers().getArray().flat().reverse();
    this.view = olMap.getView();
    this.addExpandableContent(layers);
    this.createLegendControl();
  }

  addExpandableContent(layers) {
    this.expandableBox.classList.add('esbLayerLegend__expandable');
    layers.forEach((layer) => {
      if (typeof layer.getSource().getLegendUrl === 'function') {
        // Not all source-types have this method
        const layerLegend = DOMUtil.create('div', {}, this.expandableBox);
        layerLegend.style.display = layer.getVisible() ? 'block' : 'none';
        const titleText = layer.get('title');
        const title = DOMUtil.create('p', { class: 'esbLayerLegend__title' }, layerLegend);
        title.innerText = titleText;
        const WMSSource = layer.getSource();
        const legendImage = DOMUtil.create(
          'img',
          {
            class: 'esbLayerLegend__image',
            src: WMSSource.getLegendUrl(this.view.getResolution()),
            alt: `Legend for layer: ${titleText}`,
            title: `Legend for layer: ${titleText}`,
          },
          layerLegend
        );
        const noLegend = DOMUtil.create('span', {}, layerLegend);
        const noLegendContent = DOMUtil.create(
          'div',
          {
            class: 'alert alert-info esbLayerLegend__alert',
            role: 'alert',
          },
          noLegend
        );
        noLegendContent.innerText = this.noLegendText;
        noLegend.style.display = 'none';
        this.legends.push({ legendImage, noLegend, WMSSource });
        legendImage.addEventListener('error', () => {
          legendImage.style.display = 'none';
          noLegend.style.display = 'inline-block';
        });
        layer.addEventListener('change:visible', (e) => {
          const visible = e.target.get(e.key);
          if (visible) {
            layerLegend.style.display = 'block';
          } else {
            layerLegend.style.display = 'none';
          }
        });
      }
    });
  }

  createLegendControl() {
    this.olLegend.classList.add('esbLayerLegend__root', 'ol-unselectable', 'ol-control');
    const legendButton = DOMUtil.create(
      'button',
      {
        class: 'esbLayerLegend__button',
        role: 'button',
        'aria-label': 'Toggle legend visibility on and off',
      },
      this.olLegend
    );
    const buttonText = DOMUtil.create('span', {}, legendButton);
    buttonText.innerText = this.legendButtonText;
    const arrow = DOMUtil.create('i', { class: 'fas fa-fw fa-chevron-up' }, legendButton);
    this.olLegend.appendChild(this.expandableBox);
    this.olLegend.addEventListener('click', () => {
      if (this.olLegend.classList.contains('expanded')) {
        this.olLegend.classList.remove('expanded');
        legendButton.setAttribute('expanded', false);
        arrow.classList.replace('fa-chevron-down', 'fa-chevron-up');
      } else {
        this.olLegend.classList.add('expanded');
        legendButton.setAttribute('expanded', true);
        arrow.classList.replace('fa-chevron-up', 'fa-chevron-down');
      }
    });
    let oldZoom = Math.floor(this.view.getZoom());
    this.view.addEventListener('change:resolution', () => {
      const newZoom = Math.floor(this.view.getZoom());
      if (oldZoom !== newZoom) {
        oldZoom = newZoom;
        this.updateLegends();
      }
    });
  }

  updateLegends() {
    this.legends.forEach((legend) => {
      legend.noLegend.style.display = 'none';
      legend.legendImage.src = legend.WMSSource.getLegendUrl(this.view.getResolution());
    });
  }
}
