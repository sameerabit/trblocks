import './index.scss';

const COLOR_OPTIONS = [
  {
    borderColor: '#00838f',
    backgroundColor: '#00838F33',
    borderWidth: 3,
  },
  {
    borderColor: '#165b98',
    backgroundColor: '#165B9833',
    borderWidth: 3,
  },
  {
    borderColor: '#aed581',
    backgroundColor: '#AED58133',
    borderWidth: 3,
  },
  {
    borderColor: '#fbc02d',
    backgroundColor: '#FBC02D33',
    borderWidth: 3,
  },
  {
    borderColor: '#e91e63',
    backgroundColor: '#E91E6333',
    borderWidth: 3,
  },
];

const getNewChart = (Chart, ctx, type, displayLegend, scales) => {
  return new Chart(ctx, {
    type,
    options: {
      maintainAspectRatio: false,
      legend: {
        display: displayLegend,
      },
      scales: scales,
    },
  });
};

/**
 *
 * @param {Object[]} datasets
 * @param {Object[]} colors
 * @returns {Object[]}
 */
export const mergeDatasetColors = (datasets, colors) => {
  const datasetCount = datasets?.length;
  if (!datasetCount) return datasets;

  const mergedColors = colors
    ? [...colors, ...COLOR_OPTIONS]
    : COLOR_OPTIONS;
  return datasets.map((dataset, index) => {
    const datasetIndex = index % datasetCount;
    return { ...dataset, ...mergedColors[datasetIndex] };
  });
};

export default () => {
  let chart;

  return {
    oncreate(vnode) {
      import(/* webpackChunkName: "chart.js" */ 'chart.js')
        .then(Chart => Chart.default)
        .then((Chart) => {
          const { type = 'bar', displayLegend, displayScales } = vnode.attrs;
          const canvasEl = vnode.dom.querySelector('canvas');
          chart = getNewChart(Chart, canvasEl, type, displayLegend, displayScales);
          m.redraw();

          const data = vnode.attrs.data;
          if (chart && data) {
            // update chart data and xAxis if needed
            chart.data = {
              labels: data[0].xLabels,
              datasets: data.map(dataset => ({
                //labels: dataset.xLabels,
                data: dataset.yData,
                label: dataset.label || '',
              })),
            };

            const colors =
              type === 'pie'
                ? [
                  {
                    backgroundColor: data[0].yData.map(
                      (_, index) => `hsl(${(index / data[0].yData.length) * 360}, 50%, 50%)`
                    )
                  },
                ]
                : [];


            // update chart colors and axes and re-render
            if (chart.data.datasets) {
              chart.data.datasets = mergeDatasetColors(chart.data.datasets, colors);
              chart.update();
            }
          }
        });
    },
    onupdate(vnode) {
      const { type = 'bar' } = vnode.attrs;
      if (chart && type !== chart.config.type) {
        chart.config.type = type;
        chart.update();
      }
    },
    view(vnode) {
      const { data, chartDimensions = {}, ariaLabel: ariaLabel = 'Visualization chart' } = vnode.attrs;
      const { width = 400, height = 400 } = chartDimensions;

      return (
        <div>
          <div className="chart-container">
            <canvas
              config={this.setCanvasRef}
              width={width}
              height={height}
              aria-label={ariaLabel} role="img"
            />
          </div>
        </div>
      );
    },
  };
};
