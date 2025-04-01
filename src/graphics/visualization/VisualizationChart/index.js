import uniq from 'lodash-es/uniq';
import {
  VIZ_CHART_TYPE_BAR,
  VIZ_CHART_TYPE_LINE,
  VIZ_CHART_TYPE_PIE,
  VIZ_CHART_TYPE_MAP,
  VIZ_OPERATION_COUNT,
  VIZ_OPERATION_SUM,
} from '../visualizationUtil';
import BarChart from '../BarChart';

const cleanFalseRows = ({ xLabels, yData }) => {
  if (
    (
      (xLabels[xLabels.length - 1] === null)
      || (xLabels[xLabels.length - 1] === '')
    )
    && (
      (yData[yData.length - 1] !== 0)
      && (
        (yData[yData.length - 1] === null)
        || (yData[yData.length - 1] === '')
      )
    )
  ) {
    xLabels.pop();
    yData.pop();
  }

  const xLabelsClean = xLabels.map(label => ((label === null) || (label === '')) ? 'No Label' : label);

  return {
    xLabels: xLabelsClean,
    yData,
  };
};

const toFloat = (value) => {
  const f = parseFloat(value);
  return isNaN(f) ? 0 : f;
};

const processSum = (dataset, xField, yField) => {
  const csvData = dataset.data || dataset.csv.data;
  const fields = uniq(csvData.map(row => row[xField]));
  const fieldMap = new Map(fields.map(field => ([field, null])));

  csvData.forEach(row =>
    fieldMap.set(row[xField], (fieldMap.get(row[xField]) ? fieldMap.get(row[xField]) : 0) + toFloat(row[yField])));
  const countedFields = [Array.from(fieldMap.keys()), Array.from(fieldMap.values())];

  const cleaned = cleanFalseRows({
    xLabels: countedFields[0],
    yData: countedFields[1],
  });

  return {
    ...cleaned,
    label: dataset.label,
  };
};

const processCount = (dataset, xField, yField) => {
  const fieldMap = new Map();
  const csvData = dataset.data || dataset.csv.data;
  csvData.forEach(row =>
    fieldMap.set(row[xField], (fieldMap.get(row[xField]) ? fieldMap.get(row[xField]) : 0) + 1));
  const countedFields = [Array.from(fieldMap.keys()), Array.from(fieldMap.values())];

  const cleaned = cleanFalseRows({
    xLabels: countedFields[0],
    yData: countedFields[1],
  });

  return {
    ...cleaned,
    label: dataset.label,
  };
};

const processGeoData = (data, xField, yField) => {
  if (Array.isArray(data)) {
    // const cleanGeoCSVDatas = data.map(mapData => mapData.csv.data.filter(row => (
    // (row[mapData.xField] && parseFloat(row[mapData.yField])) === false
    // )));

    // const parsedGeoDatas = cleanGeoDatas.map(mapData => mapData.csv.data.map(row => (row[mapData.xField] && row[mapData.yField]) ? `POINT(${row[mapData.xField]} ${row[mapData.yField]})` : null).filter(point => point !== null));
    const parsedGeoDatas = data.map(mapData => mapData.csv.data.map(row => (parseFloat(row[mapData.xField]) && parseFloat(row[mapData.yField])) ? `POINT(${parseFloat(row[mapData.xField])} ${parseFloat(row[mapData.yField])})` : null).filter(point => point !== null));

    return parsedGeoDatas;
  }
  const parsedGeoData = data ? data.data.map(row => (row[xField] && row[yField]) ? `POINT(${parseFloat(row[xField])} ${parseFloat(row[yField])})` : null).filter(point => point !== null) : null;

  return parsedGeoData;
};

export default () => {

  const processXYData = (datasets, xField, yField, operation) => {
    if (operation === VIZ_OPERATION_SUM) {
      // Needs to support multiple datasets
      if (Array.isArray(datasets)) {
        return datasets.map(dataset => processSum(dataset, dataset.xField, dataset.yField));
      }

      return [processSum(datasets, xField, yField)];
    }
    if (operation === VIZ_OPERATION_COUNT) {
      // Needs to support multiple datasets
      if (Array.isArray(datasets)) {
        return datasets.map(dataset => processCount(dataset, dataset.xField, dataset.yField));
      }

      return [processCount(datasets, xField)];
    }

    if (Array.isArray(datasets)) {
      return datasets.map((dataset) => {
        switch (dataset.operation) {
          case VIZ_OPERATION_SUM:
            return processSum(dataset, dataset.xField, dataset.yField);
          case VIZ_OPERATION_COUNT:
            return processCount(dataset, dataset.xField, dataset.yField);
          default:
            return processXYDataset(dataset, dataset.xField, dataset.yField);
        }
      });
    }

    return [processXYDataset(datasets, xField, yField)];
  };

  const processXYDataset = (data, xField, yField) => {
    const transpose = matrix => Object.keys(matrix[0])
      .map(colNumber => matrix.map(rowNumber => rowNumber[colNumber]));

    //

    const csvData = data.data || data.csv.data;
    const [xLabels, yData] = transpose(
      csvData.map(row => ([row[xField], row[yField]])),
    );

    const cleaned = cleanFalseRows({
      xLabels,
      yData,
    });

    return {
      ...cleaned,
      label: data.label,
    };
  };

  // check if row content is undefined or just a new line/ space i.e. has no data
  const rowIsEmpty = (x, y) => x === undefined || y === undefined || x.trim() === '' || y.trim() === '';

  const isvalidGeoData = (data, xField, yField) => {
    // making sure the data was parsed correctly
    const hasNeededFields = d => d.csv && d.csv.data && Array.isArray(d.csv.data);
    const containsOnlyFloats = (floats, x, y) =>
      floats.some(row => !rowIsEmpty(row[x], row[y])) && // do we have data?
      floats.filter(row => !rowIsEmpty(row[x], row[y])) // remove the empty data if any
        .every(row => (!isNaN(parseFloat(row[x])) && !isNaN(parseFloat(row[y])))); // is the remainder just floats?

    // if the data is an array
    if (Array.isArray(data)) {
      return data.every(d => hasNeededFields(d) && containsOnlyFloats(d.csv.data, xField, yField));
    }
    // if the data is an obj
    return data && data.data && Array.isArray(data.data) && containsOnlyFloats(data.data, xField, yField);
  };

  const isvalidLineData = (datasets, xField, yField) => {
    const data = Array.isArray(datasets) ? datasets : [datasets];

    // confirm that all the data has a ".data" or ".csv.data" (assumed it was important)
    if (!data.every(d => d.data || d.csv.data)) {
      return false;
    }

    const isNumber = v => !isNaN(v);
    const isDate = v => !isNaN(Date.parse(v));
    const isAllowed = v => isNumber(v) || isDate(v);

    // create array of the needed fields
    // Infinity because we want the "innermost" array
    const csvDataArr = data.map(d => d.data || d.csv.data).flat(Infinity);

    // make sure at least some of the data is ok and we have something to show
    return csvDataArr.filter(row => !rowIsEmpty(row[xField], row[yField]))
      .map(row => isAllowed(row[yField]))
      .some(v => v !== false);
  };

  // needed when we switch from a map to a bar/line chart to allow for extra renders triggered by chart.js
  let enforceUpdate = false;

  return {
    onupdate(vnode) {
      if (!enforceUpdate) {
        vnode.state.isInitialized = true;
      }
    },
    onbeforeupdate(vnode, old) {
      if (vnode.state.isInitialized) {

        // some hack to allow for multiple renders needed by chart.js
        if (vnode.attrs.type !== old.attrs.type && old.attrs.type === 'map') {
          vnode.state.isInitialized = false;
          enforceUpdate = true;
          return true;
        }

        // if all attrs are equal between renders than don't re-render
        return !(vnode.attrs.type === old.attrs.type
          && vnode.attrs.xAxisField === old.attrs.xAxisField
          && vnode.attrs.yAxisField === old.attrs.yAxisField
          && vnode.attrs.operation === old.attrs.operation // by default is none for line/map charts
          && vnode.attrs.fileResourceURI === old.attrs.fileResourceURI
          && vnode.attrs.encoding === old.attrs.encoding
        );
      } else {
        if (enforceUpdate) {
          enforceUpdate = false;
        }
      }
      return true;
    },
    view(vnode) {
      const {
        type,
        xAxisField,
        yAxisField,
        operation,
        data,
        ariaLabel,
      } = vnode.attrs;

      const standardScales = {
        yAxes: [{
          ticks: {
            beginAtZero: true,
          },
          "scaleLabel": {
            "display": true,
            "labelString": yAxisField
          }
        }],
        "xAxes": [
          {
            "scaleLabel": {
              "display": true,
              "labelString": xAxisField
            }
          }
        ]
      };
      const doughnutScales = {
        ticks: {
          display: false
        }
      };



      const displayLegend = Array.isArray(data) || type === 'pie';
      const scales = type === 'pie' ? doughnutScales : standardScales;
      let processedData;

      switch (type) {
        case VIZ_CHART_TYPE_MAP:
          if (isvalidGeoData(data, xAxisField, yAxisField, operation)) {
            processedData = processGeoData(data, xAxisField, yAxisField);
          } else {
            processedData = null; // change to {} to avoid having 2 err states
          }
          break;
        case VIZ_CHART_TYPE_BAR:
          processedData = processXYData(data, xAxisField, yAxisField, operation);
          break;

        case VIZ_CHART_TYPE_LINE:
          if (isvalidLineData(data, xAxisField, yAxisField)) {
            processedData = processXYData(data, xAxisField, yAxisField, operation);
          } else {
            processedData = null; // change to {}
          }
          break;

        case VIZ_CHART_TYPE_PIE:
          processedData = processXYData(data, xAxisField, yAxisField, operation);
          break;

        default:
          processedData = {};
          throw Error('no chart type chosen');
      }

      return (
        <div className="chart--size">
          <BarChart
            data={processedData}
            displayLegend={displayLegend}
            displayScales={scales}
            type={type}
            areaLabel={ariaLabel}
          />
        </div>
      );
    },
  };
};
