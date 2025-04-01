import getEntry from 'blocks/utils/getEntry';
import { vizNamespace } from 'blocks/graphics/visualization/visualizationUtil';
import renderTable from 'blocks/graphics/renderTable';
// eslint-disable-next-line import/no-named-as-default,import/no-named-as-default-member
import VisualizationPreview from 'blocks/graphics/visualization/VisualizationPreview';
import { renderMapFromCsvVisualization } from 'blocks/graphics/map/renderMapFromCsvVisualization';
import { renderMapFromWmsVisualization } from 'blocks/graphics/map/renderMapFromWmsVisualization';

export default (node, data) => {
  getEntry(data, async (entry) => {
    if (!entry) return;
    data.entry = entry;
    const ruri = entry.getResourceURI();
    const md = entry.getAllMetadata();
    const chartType = md.findFirstValue(ruri, vizNamespace.chartType);
    if (chartType === 'wms') {
      await renderMapFromWmsVisualization(node, data);
    } else if (chartType === 'map') {
      await renderMapFromCsvVisualization(node, data);
    } else if (chartType === 'table') {
      renderTable(node, data);
    } else {
      m.mount(node, { view: () => m(VisualizationPreview, { visualizationEntry: entry, ariaLabel: data.label}) });
    }
  });
};
