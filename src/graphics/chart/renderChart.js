import Chart from 'blocks/graphics/chart/BasicChart';
import BarChart from 'blocks/graphics/chart/BarChart';
import DoughnutChart from 'blocks/graphics/chart/DoughnutChart';
import DOMUtil from 'blocks/utils/htmlUtil';
import merge from 'lodash-es/merge';
import m from 'mithril';
import utils from './chartUtils';

/**
 * Return as many items as limit indicates.
 *
 * @todo re-write as pure function
 *
 * @param data
 * @param limit
 */
const applyLimit = (data, limit) => {
  data.labels = data.labels.slice(0, limit);
  if (Array.isArray(data.data[0])) {
    data.data = data.data.map(t => t.slice(0, limit));
  } else {
    data.data = data.data.slice(0, limit);
  }

  return data;
};

const filterZeroValues = (data) => {
  const filteredLabels = [];
  const filteredDatasets = [];
  const filteredValues = [];
  const datasets = data.data;
  const lengths = datasets.map(dataset => dataset.length);
  const maxLength = Math.max(...lengths);

  for (let i = 0; i < maxLength; i++) {
    const allZero = datasets.every(dataset => (dataset[i] === 0 || dataset[i] === '0'));

    if (!allZero) {
      datasets.forEach((dataset, idx) => {
        if (filteredDatasets[idx]) {
          filteredDatasets[idx].push(dataset[i]);
        } else {
          filteredDatasets.push([dataset[i]] || '');
        }
      });
      filteredLabels.push(data.labels[i]);
      if (data.values) {
        filteredValues.push(data.values[i]);
      }
    }
  }
  data.data = filteredDatasets;
  data.labels = filteredLabels;
  if (filteredValues.length > 0) {
    data.values = filteredValues;
  }
  return data;
};

/**
 *
 * @param data
 * @return {{datasets: {data: *}[], labels: *}}
 */
const convertToChartJs = (data, configData) => ({
  datasets: data.data.map(d => ({data: d, values: data.values})),
  labels: data.labels,
  origLabels: data.origLabels,
  labelMaxLength: configData.labelMaxLength,
});

/**
 * If series expression it is normalized into:
 * data = {
 *   data: [
 *     [1, 2, 3],
 *     [4, 5, 6]
 *   ],
 *   labels: [ "col1", "col2", "col3"],
 *   values: [ "xrf", "kdg", "zrd"]
 * }
 *
 * And then exported in Chart.js format as:
 *
 * {
 *   datasets: [{
 *     data: [1, 2, 3],
 *     values: ["xrf", "kdg", "zrd"] //????
 *   },
 *   {
 *    data: [4, 5, 7],
 *    values: ["xrf", "kdg", "zrd"] //????
 *   }
 *  ],
 *  labels: [ "col1", "col2", "col3" ]
 * }
 *
 *
 * @param data
 * @param configData
 * @return {{datasets: {data: *}[], labels: *}}
 */
const transformData = (data, configData) => {
  let filteredData = data;
  // Unify to old format for simplified cleanup
  if (data.datasets) {
    data.data = data.datasets;
    delete data.datasets;
  }
  if (data.series) {
    data.data = data.series;
    delete data.series;
  }
  if (data.data && Array.isArray(data.data) && !Array.isArray(data.data[0])) {
    data.data = [data.data];
  }
  if (configData.filterZeroValues === true) {
    filterZeroValues(data);
  }
  if (configData.limit) {
    filteredData = applyLimit(filteredData, configData.limit);
  }
  if (configData.labelMaxLength) {
    filteredData.origLabels = filteredData.labels;
    filteredData.labels = utils.breakLabels(filteredData.labels, configData.labelMaxLength);
  }

  // Convert back to Chart.js format
  return convertToChartJs(filteredData, configData);
};

// Utility to fetch value from object when single key exists.
const singleVal = obj => obj[Object.keys(obj)[0]];

/**
 * Match block config data with mithril chart component
 *
 * @param node
 * @param configData
 * @param rawData
 */
const renderChartComponent = (node, configData, rawData) => {
  // transform fetched data
  const data = transformData(Object.assign({}, rawData), configData);
  if (configData.legend) {
    data.datasets[0].label = configData.legend;
  }

  let activeSegment;
  // prepare chartjs options
  const type = configData.type;
  const options = merge({
    data,
    colors: configData.backgroundColor || configData.colors,
    type: configData.type,
    dimensions: {
      width: configData.width,
      height: configData.height,
    },
  }, {
    options: {
      legend: {
        onHover: function (e, legendItem) {
          // Show tooltip on legend as well
          if (legendItem.index !== undefined) {
            e.target.style.cursor = 'pointer';
            const chart = this.chart;
            const meta = singleVal(chart.data.datasets[0]._meta);
            const newActiveSegment = meta.data[legendItem.index];
            if (newActiveSegment === activeSegment) {
              return;
            }
            activeSegment = newActiveSegment;
            chart.tooltip.initialize();
            chart.tooltip._active = [activeSegment];
            chart.tooltip.update(true);
            meta.controller.setHoverStyle(activeSegment);
            chart.render(chart.options.hover.animationDuration, false);
          }
        },
        onLeave: function (e, legendItem) {
          // Hide tooltip on legend on leave
          if (activeSegment) {
            const chart = this.chart;
            const meta = singleVal(chart.data.datasets[0]._meta);
            meta.controller.removeHoverStyle(activeSegment);
            chart.tooltip._active = [];
            chart.tooltip.update(true);
            activeSegment = undefined;
          }
        },
      },
    },
  }, {
    options: configData.options,
  });

  // find suitable chartjs component
  let chartComponent = null;
  switch (type) {
    case 'bar':
    case 'line':
    case 'horizontalBar':
      if (!configData.legend) {
        options.options.legend.display = false;
      }
      chartComponent = { view: () => m(BarChart, merge(options, utils.barChartOptions)) };
      break;
    case 'pie':
    case 'doughnut':
      chartComponent = { view: () => m(DoughnutChart, merge(options, utils.dougnutOptions)) };
      break;
    default:
      if (!configData.legend) {
        options.options.legend.display = false;
      }
      chartComponent = { view: () => m(Chart, options) };
      break;
  }

  m.mount(DOMUtil.create('div', {}, node), chartComponent);
};

export default (node, configData) => {
  if (configData.data) {
    renderChartComponent(node, configData, configData.data);
  } else if (configData.url) {
    if (configData.url.endsWith('.json')) {
      fetch(configData.url)
        .then(res => res.json())
        .then(data => renderChartComponent(node, configData, data));
    } else {
      require([configData.url], data => renderChartComponent(node, configData, data));
    }
  }
};
