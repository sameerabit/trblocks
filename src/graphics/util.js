import template from 'lodash-es/template';
import md5 from 'md5';
import {
  getSourceEntriesForVisualization,
  loadCSVFile,
  vizNamespace
} from 'blocks/graphics/visualization/visualizationUtil';
import handlebars from 'blocks/boot/handlebars';

export const fixURL = (url, data, origUrl) => {
  let newUrl = url;
  if (url.startsWith('http:') && data.forceHttps) {
    newUrl = newUrl.replace('http:', 'https:');
  }
  if (data.proxy) {
    const templatedUrl = template(data.proxy)({
      url: newUrl,
      encoded: encodeURIComponent(newUrl),
      md5: md5(origUrl || url),
    });
    if (templatedUrl !== data.proxy) {
      newUrl = templatedUrl;
    } else {
      newUrl = `${data.proxy}${newUrl}`;
    }
  }
  return newUrl;
};

export const fixCapabilitiesURL = (url, data, service) => {
  let _url = url;
  if (!url.toLowerCase().includes('getcapabilities')) {
    let separator = url.indexOf('?') > 0 ? '&' : '?';
    if (url[url.length - 1] === '?') {
      separator = '';
    }
    _url = `${_url}${separator}request=getCapabilities`;
  }

  if (!url.toLowerCase().includes('service=') && service) {
    const separator = url.indexOf('?') > 0 ? '&' : '?';
    _url = `${_url}&service=${service}`;
  }
  return fixURL(_url, data, url);
};

const rowIsEmpty = (x, y) => x === undefined || y === undefined || x.trim() === '' || y.trim() === '';

export const isValidGeoData = (csvData, xField, yField) => {
  // making sure the data was parsed correctly
  const hasNeededFields = d => d.csv && d.csv.data && Array.isArray(d.csv.data);
  const containsOnlyFloats = (floats, x, y) =>
    floats.some(row => !rowIsEmpty(row[x], row[y])) && // do we have data?
    floats.filter(row => !rowIsEmpty(row[x], row[y])) // remove the empty data if any
      .every(row => (!isNaN(parseFloat(row[x])) && !isNaN(parseFloat(row[y])))); // is the remainder just floats?

  // if the data is an array
  if (Array.isArray(csvData)) {
    return csvData.every(d => hasNeededFields(d) && containsOnlyFloats(d.csv.data, xField, yField));
  }
  // if the data is an obj
  return csvData && csvData.data && Array.isArray(csvData.data) && containsOnlyFloats(csvData.data, xField, yField);
};

const getPopupContentFromTableRow = (content, visualizationTitle) => {
  const tableElement = document.createElement('table');
  Object.keys(content).forEach((key) => {
    if (key === visualizationTitle) {
      return;
    }
    const tableRowElement = document.createElement('tr');
    const tableHeadElement = document.createElement('th');
    tableHeadElement.innerText = key;
    tableRowElement.appendChild(tableHeadElement);
    const tableDataElement = document.createElement('td');
    tableDataElement.innerText = content[key];
    tableRowElement.appendChild(tableDataElement);
    tableElement.appendChild(tableRowElement);
  });
  return tableElement;
};

export const getPropertiesFromCsvData = (csvData, xField, yField, featureTitle = '') => {
  const csvDataArray = Array.isArray(csvData) ? csvData : csvData.data;
  if (csvDataArray) {
    const points = csvDataArray
      .filter((row) => row[xField] && row[yField])
      .map((row) => {
        return {
          lonLatCoordinates: [parseFloat(row[xField]), parseFloat(row[yField])],
          featureInfoData: { popupContent: getPopupContentFromTableRow(row, featureTitle), title: row[featureTitle] },
        };
      });
    return points;
  }
};

export const getCsvData = async (ruri, md, entry) => {
  const encoding = md.findFirstValue(ruri, vizNamespace.encoding);
  const [fileEntry] = await getSourceEntriesForVisualization(entry);
  return loadCSVFile({
    entry: fileEntry,
    encoding,
    ignoreStats: true,
  });
};

export const getPopupContentFromTemplate = (data) => {
  const popupContentContainer = document.createElement('div');
  handlebars.run(popupContentContainer, data, data.popup, data.entry, false);
  return popupContentContainer;
};
