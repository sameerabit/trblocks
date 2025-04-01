import Papa from 'papaparse';
import { convertBytesToMBytes } from 'blocks/utils/util';
import registry from 'blocks/registry';
import readFileAsText from 'blocks/utils/readFileAsText';
import SizeError from './SizeError';
import error from 'blocks/boot/error';

export const isIE = window.navigator.userAgent.indexOf('Trident/') > 0;

/**
 *
 * @param fileEntry
 * @return {Promise<store/Entry>}
 */
export const getDistributionFromFileEntry = async (fileEntry) => {
  const distributionEntries = await fileEntry.getEntryStore().newSolrQuery()
    .rdfType('dcat:Distribution')
    .uriProperty('dcat:accessURL', fileEntry.getResourceURI())
    .limit(1)
    .getEntries();

  return distributionEntries[0];
};

const esviz = 'http://entryscape.com/terms/visualization/';

const vizNamespace = {
  Visualization: `${esviz}Visualization`,
  xAxis: `${esviz}xAxis`,
  yAxis: `${esviz}yAxis`,
  featureTitle: `${esviz}featureTitle`,
  operation: `${esviz}operation`,
  chartType: `${esviz}chartType`,
  encoding: `${esviz}encoding`,
  basemap: `${esviz}basemap`,
  legendControl: `${esviz}legendControl`,
  scaleLineControl: `${esviz}scaleLineControl`,
  wmsBaseURI: `${esviz}wmsBaseURI`,
  extent: `${esviz}extent`,
  initialView: `${esviz}initialView`,
  layers: `${esviz}layers`,
};

const VIZ_OPERATION_SUM = 'sum';
const VIZ_OPERATION_COUNT = 'count';
const VIZ_OPERATION_NONE = 'none';
const VIZ_CHART_TYPE_MAP = 'map';
const VIZ_CHART_TYPE_BAR = 'bar';
const VIZ_CHART_TYPE_LINE = 'line';
const VIZ_CHART_TYPE_PIE = 'pie';

const CSV_FILE_MB_LIMIT = 1;
const isCSVFileSizeWithinLimit = (fileEntry) => {
  const fileSize = fileEntry.getEntryInfo().getSize();
  const fileSizeMb = convertBytesToMBytes(fileSize);
  return fileSizeMb <= CSV_FILE_MB_LIMIT;
};

/**
 * @param csvData
 * @return {Promise}
 */
const parseCSVFile = (csvData, allowDotsInHeaders) => {
  let result = Papa.parse(csvData, {
    header: true,
    transformHeader: allowDotsInHeaders ? h => h.trim() : h => h.trim().replace(/\./g, ' '),
    skipEmptyLines: true,
  });
  if (result.errors.length > 0 && result.errors[0].code === 'UndetectableDelimiter') {
    try {
      const firstline = csvData.match(/^(.*)/)[1];
      const commas = firstline.split(',').length - 1;
      const semis = firstline.split(';').length - 1;
      if (commas > 0 || semis > 0) {
        result = Papa.parse(csvData, {
          header: true,
          delimiter: commas > semis ? ',' : ';',
          transformHeader: allowDotsInHeaders ? h => h.trim() : h => h.trim().replace(/\./g, ' '),
          skipEmptyLines: true,
        });
      }
    } catch (e) {
    }
  }
  return result;
};

const parseJSONAsCSV = (textData) => {
  const arr = JSON.parse(textData);
  if (Array.isArray(arr[0])) {
    const fields = arr.shift();
    const data = arr.map((row) => {
      const rowObj = {};
      fields.forEach((field, idx) => {
        rowObj[field] = row[idx];
      });
      return rowObj;
    });
    return {
      meta: { fields },
      data,
    };
  }
  const columns = {};
  const range = arr.length < 100 ? arr.length : 100;
  for (let i = 0; i < range; i++) {
    const row = arr[i];
    if (typeof row === 'object' && !Array.isArray(row)) {
      Object.keys(row).forEach((key) => { columns[key] = true; });
    } else {
      throw new Error('JSON is not an array of objects on top-level, hence no way to export as table');
    }
  }
  return {
    meta: {
      fields: Object.keys(columns),
    },
    data: arr,
    errors: [],
  };
};

/**
 * Load the text from the entry resource and parse with PapaParse
 * @param {String} uri - explitly given URI to load from
 * @param {Entry} entry - URI should be extracted from metadata in entry or use the resourceURI
 * @param {string} encoding - for example utf8
 * @param {string} property - for example dcat:downloadURL
 * @param {boolean} ignoreStats - add parameter to avoid statistics being recorded
 * @param {number} maxSize - max size to load before aborting, given in bytes, default is 20 Mb.
 * @param {boolean} allowDotsInHeaders - if false it will strip away dots in all headers and replace with space,
 * this is a hack to avoid weird behaviour in bootstrap-table
 * @return {Promise}
 */
const loadCSVFile = ({
  uri,
  entry,
  encoding,
  property,
  ignoreStats = false,
  maxSize = 1048576,
  allowDotsInHeaders = true,
  proxy,
}) => {
  let requestRURI = uri;
  if (!uri && entry) {
    const ruri = entry.getResourceURI();
    if (property) {
      const objUri = entry.getAllMetadata().findFirstValue(ruri, property);
      if (ignoreStats && objUri.match(/.+\/store\/.*\/resource\/.+$/) !== null) {
        requestRURI = `${objUri}?nostats`;
      } else {
        requestRURI = objUri;
      }
    } else {
      requestRURI = `${ruri}${ignoreStats ? '?nostats' : ''}`;
    }
  }

  if (proxy) {
    requestRURI = proxy(requestRURI);
  }

  const parseCSV = data => parseCSVFile(data, allowDotsInHeaders);

  // Reading through a stream - used to decode in the selected encoding - is not supported on IE
  if (isIE) {
    return fetch(requestRURI, {}) //{ credentials: 'include' })
      .then(res => res.text())
      .then(parseCSV);
  }

  let sizeLoaded = 0;

  return fetch(requestRURI, {}) //{ credentials: 'include' })
    .then((response) => {
      const reader = response.body.getReader();

      // See https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams#Consuming_a_fetch_as_a_stream
      return new ReadableStream({
        start(controller) {
          return pump();

          function pump() {
            return reader.read().then(({ done, value }) => {
              if (done) { // When no more data, close the stream
                controller.close();
                return;
              }
              sizeLoaded += value.length;
              if (sizeLoaded > maxSize) {
                controller.close();
                return;
              }

              controller.enqueue(value); // Enqueue the next data chunk into our target stream
              return pump();
            });
          }
        },
      });
    })
    .then(stream => new Response(stream))
    .then(response => response.blob())
    .then((blob) => {
      if (sizeLoaded > maxSize) {
        throw new SizeError(`File is larger than max size (${maxSize})`);
      }
      return blob;
    })
    .then(blob => readFileAsText(blob, encoding))
    .then((textData) => {
      const taste = textData.substr(0, 20);
      if (taste.match(/^\s*\[\s*[{[]/) !== null) {
        // text seems to contain json
        return parseJSONAsCSV(textData);
      } else if (taste.startsWith('<')) {
        throw new Error('Not CSV');
      }
      // assume CSV
      return parseCSV(textData);
    })
    .catch((err) => {
      data.error = err.toString();
      error(node, data);
    });
};

const CSV_COLUMN_TYPE = {
  NONE: 'none',
  NUMBER: 'number',
  // DATE: 'date',
  GEO_LAT: 'geo-latitude',
  GEO_LONG: 'geo-longitude',
  TEXT: 'text',
  DISCRETE: 'discrete',
};

const CSV_ROWS_TO_SNIFF = 20;

/**
 *
 * @param {number} n
 * @return {boolean}
 */
const isPotentiallyLatitude = n => (n >= -90 && n >= 90);

/**
 *
 * @param {number} n
 * @return {boolean}
 */
const isPotentiallyLongitude = n => (n >= -180 && n >= 180);

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

/**
 *
 * @param data
 * @param column
 * @param count
 * @return {*}
 */
const getColumnSpecificRandomRowValues = (data, column, count = CSV_ROWS_TO_SNIFF) => {
  const randomData = [];
  const maxInteger = data.length - 1;
  for (let i = 0; i < count; i++) {
    const idx = getRandomInt(maxInteger);
    randomData.push(data[idx][column]);
  }

  return randomData;
};

const DISCREET_THRESHOLD = 20; // random

const isPotentiallyDiscrete = (array, totalValues) => {
  const discreteValues = new Set(array).size;
  let threshold = DISCREET_THRESHOLD;
  if (totalValues < threshold) {
    threshold = totalValues; // at least one value is repeated twice (this includes the header)
  }
  return discreteValues > 0 && (discreteValues < threshold); // @todo very random: discrete value means no more than 20
};

const detectTypes = (csvData) => {
  const columns = csvData.meta.fields;

  // pre-liminary check of common names, latitude/longitude
  const csvDataDetectedTypes = columns.map((column) => {
    const normalizedColumnName = column.toLowerCase();
    if (normalizedColumnName.includes('latitud')) {
      return CSV_COLUMN_TYPE.GEO_LAT;
    }
    if (normalizedColumnName.includes('longitud')) {
      return CSV_COLUMN_TYPE.GEO_LONG;
    }
    // if (normalizedColumnName.includes('date')) {
    //   return CSV_COLUMN_TYPE.DATE;
    // }

    return null;
  });

  const rowsToCheckCount = Math.min(CSV_ROWS_TO_SNIFF, csvData.data.length) - 1;
  columns.forEach((column, idx) => {
    // this is used as a benchmark to check against
    // if the detected type in the rows is not consistent with this then ignore type detection
    let detectedType = csvDataDetectedTypes[idx];

    for (let i = 0; i < rowsToCheckCount; i++) {
      const dataPoint = csvData.data[i][column];

      if (!dataPoint) { // empty string
        break;
      }

      // if (moment(dataPoint).isValid()) {
      //   if (detectedType && detectedType !== CSV_COLUMN_TYPE.DATE) {
      //     if (idx === 1) {
      //       console.log('NOT A DATE!!!!!!!!!!!!!!!!!');
      //     }
      //     break;
      //   }
      //   detectedType = CSV_COLUMN_TYPE.DATE;
      // } else
      if (!isNaN(Number(dataPoint))) { // it's a number
        // check if it looks like a coordinate
        if (isPotentiallyLongitude(dataPoint)) {
          if (detectedType &&
            (detectedType !== CSV_COLUMN_TYPE.GEO_LONG || detectedType !== CSV_COLUMN_TYPE.GEO_LAT)) {
            if (detectedType !== CSV_COLUMN_TYPE.NUMBER) {
              break;
            }
            detectedType = CSV_COLUMN_TYPE.NUMBER; // it looked like a co-ordinate before but it's most probably a number
          }
          detectedType = CSV_COLUMN_TYPE.GEO_LONG;
          if (isPotentiallyLatitude(dataPoint)) {
            detectedType = CSV_COLUMN_TYPE.GEO_LAT;
          }
        } else {
          if (detectedType && detectedType !== CSV_COLUMN_TYPE.NUMBER) {
            break;
          }
          detectedType = CSV_COLUMN_TYPE.NUMBER;
        }
      } else {
        const randomValues = getColumnSpecificRandomRowValues(csvData.data, column);
        if (isPotentiallyDiscrete(randomValues, csvData.data.length)) {
          detectedType = CSV_COLUMN_TYPE.DISCRETE;
          break;
        }

        detectedType = CSV_COLUMN_TYPE.TEXT;
      }
    }

    csvDataDetectedTypes[idx] = detectedType;
  });

  return csvDataDetectedTypes;
};

const getVisualizationEntriesForDataset = (datasetEntry) => {
  const metadata = datasetEntry.getAllMetadata();
  const ruri = datasetEntry.getResourceURI();
  const vizStmts = metadata.find(ruri, 'schema:diagram');

  // map viz statements to entry load promises
  const vizRURIs = vizStmts.map(stmt => stmt.getValue());
  return registry.getEntryStoreUtil().loadEntriesByResourceURIs(vizRURIs, registry.getContext(), true);
};

/**
 * The path followed to find visualizations that use a file resource belonging to a dataset is:
 *
 * 1) get all vizualizations entries belonging to the current dataset
 * 2) get all file RURIs belonging to the distribution
 * 3) filter visualization entries that belong to the distribution
 * @param distributionEntry
 * @param datasetEntry
 * @return {Promise.<Entry[]>}
 */
const getVisualizationEntriesForDistribution = async (distributionEntry, datasetEntry = registry.getEntry()) => {
  const vizEntries = await getVisualizationEntriesForDataset(datasetEntry);

  // this might get non uploaded CSV files but it's safe since vizEntries
  // shouldn't have been linked to them in the fist place, and even if they were again the user need to be notified
  const distributionFileRURIs = distributionEntry.getAllMetadata()
    .find(distributionEntry.getResourceURI(), 'dcat:downloadURL')
    .map(stmt => stmt.getValue());

  return vizEntries.filter((vizEntry) => {
    const fileRURI = vizEntry.getAllMetadata().findFirstValue(vizEntry.getResourceURI(), 'dcterms:source');
    return distributionFileRURIs.includes(fileRURI);
  });
};


const getVisualizationEntriesForFile = async (fileEntry, datasetEntry = registry.getEntry()) => {
  const vizEntries = await getVisualizationEntriesForDataset(datasetEntry);
  const fileRURI = fileEntry.getResourceURI();
  return vizEntries.filter(vizEntry => vizEntry.getAllMetadata().findFirstValue(vizEntry.getResourceURI(), 'dcterms:source') === fileRURI);
};


const getVisualizationEntriesForFiles = async (fileRURIs, datasetEntry = registry.getEntry()) => {
  const vizEntries = await getVisualizationEntriesForDataset(datasetEntry);
  return vizEntries.filter((vizEntry) => {
    const fileRURI = vizEntry.getAllMetadata().findFirstValue(vizEntry.getResourceURI(), 'dcterms:source');
    return fileRURIs.includes(fileRURI);
  });
};

/**
 * Get csv files entry and distribution entry
 *
 * @param {store/Entry} visualizationEntry
 * @return {Promise<store/Entry>}
 */
const getSourceEntriesForVisualization = async (visualizationEntry) => {
  const metadata = visualizationEntry.getAllMetadata();
  const ruri = visualizationEntry.getResourceURI();
  const fileEntryRURI = metadata.findFirstValue(ruri, 'dcterms:source');
  const fileEntry = await registry.getEntryStoreUtil().getEntryByResourceURI(fileEntryRURI);

  const distributionEntry = await getDistributionFromFileEntry(fileEntry);

  return [fileEntry, distributionEntry];
};

const removeVisualizationsEntriesFromDataset = async (visualizationsEntries, datasetEntry) => {
  const metadata = datasetEntry.getAllMetadata();
  const ruri = datasetEntry.getResourceURI();

  visualizationsEntries
    .map(visualizationEntry => visualizationEntry.getResourceURI())
    .forEach((vizRURI) => {
      metadata.findAndRemove(ruri, 'schema:diagram', vizRURI);
    });

  await datasetEntry.commitMetadata();

  return Promise.all(visualizationsEntries.map(vizEntry => vizEntry.del()));
};

const deleteVisualizations = async (visualizations, distUri) => {
  const deletions = visualizations
    .filter((viz) => {
      const vizDistributionUri = getDistUriForVisualization(viz); // not implemented, need distribution uri per viz
      return vizDistributionUri === distUri;
    })
    .map(viz => removeVisualization(viz));
  return Promise.all(deletions).then(loadVisualizations);
};


export {
  getVisualizationEntriesForFile,
  getVisualizationEntriesForDistribution,
  getVisualizationEntriesForDataset,
  getSourceEntriesForVisualization,
  removeVisualizationsEntriesFromDataset,
  loadCSVFile,
  parseCSVFile,
  detectTypes,
  isCSVFileSizeWithinLimit,
  vizNamespace,
  VIZ_OPERATION_SUM,
  VIZ_OPERATION_COUNT,
  VIZ_OPERATION_NONE,
  VIZ_CHART_TYPE_MAP,
  VIZ_CHART_TYPE_BAR,
  VIZ_CHART_TYPE_LINE,
  VIZ_CHART_TYPE_PIE,
};
