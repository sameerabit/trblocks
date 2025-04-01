import registry from 'blocks/registry';
import { createSetState } from 'blocks/utils/util';
import LoadingSpinner from 'blocks/graphics/visualization/Spinner';
import VisualizationChart from '../VisualizationChart';
import { getSourceEntriesForVisualization, loadCSVFile, vizNamespace } from '../visualizationUtil';
import './index.scss';

// Get a sensible name to show for distribution or file entry. Default to distribution URI since a distribution
// presenter will be triggered onclick
const getDistributionAndFileLabel = (distEntry, fileEntry) => {
  const getLabel = registry.get('rdfutils').getLabel;
  return getLabel(distEntry) || getLabel(fileEntry) || distEntry.getResourceURI();
};

export default (initialVnode) => {
  const { visualizationEntry, ariaLabel } = initialVnode.attrs;
  const state = {
    initialized: false,
    distEntry: null,
    fileEntry: null,
  };
  const setState = createSetState(state);

  let csvData;
  const updateCSVData = (data) => {
    csvData = data;
    setState({ initialized: true });
  };

  return {
    oninit() {
      const ruri = visualizationEntry.getResourceURI();
      const metadata = visualizationEntry.getAllMetadata();
      const encoding = metadata.findFirstValue(ruri, vizNamespace.encoding);

      getSourceEntriesForVisualization(visualizationEntry)
        .then(([fileEntry, distEntry]) => {
          setState({
            distEntry,
            fileEntry,
          }, true);
          return loadCSVFile({ entry: fileEntry, encoding, ignoreStats: true });
        })
        .then(updateCSVData)
        .catch((err) => {
          console.error('Could not get CSV file: ', err);
        });
    },
    view() {
      const ruri = visualizationEntry.getResourceURI();
      const metadata = visualizationEntry.getAllMetadata();
      const name = metadata.findFirstValue(ruri, 'dcterms:title');
      const chartType = metadata.findFirstValue(ruri, vizNamespace.chartType);
      const xAxisField = (metadata.findFirstValue(ruri, vizNamespace.xAxis) || '').trim();
      const yAxisField = (metadata.findFirstValue(ruri, vizNamespace.yAxis) || '').trim();
      const operation = metadata.findFirstValue(ruri, vizNamespace.operation);


      const bundle = {
        previewVisualizationSource: 'Source',
      };

      return (
        <div className="escaVisualizationPreview">
          {state.initialized
            ? <div>
              <p className="card-text mb-2">
                <small className="text-muted">
                  <span className="mr-1">{bundle.previewVisualizationSource}:</span>
                  {state.distEntry && <span className="sourceDistribution">{
                    getDistributionAndFileLabel(state.distEntry, state.fileEntry)}</span>}
                </small>
              </p>
              <div className="Chart">
                {csvData && <VisualizationChart
                  name={name}
                  type={chartType}
                  xAxisField={xAxisField}
                  yAxisField={yAxisField}
                  operation={operation}
                  data={csvData}
                  areaLabel={ariaLabel} />}
              </div>
            </div>
            : <LoadingSpinner />
          }
        </div>
      );
    },
  };
};
