import escaStatisticsNLS from 'blocks/migration/nls/escaStatistics.nls';
import { i18n } from 'esi18n';
import { COLOURS_PIE } from './ChartColors';

const updateColors = (colorsToApply, chartData) => {
  if (colorsToApply.length > 0) {
    chartData.datasets[0].backgroundColor = colorsToApply;
  }
  return chartData;
};

export default () => ({
  oncreate(vnode) {
    import(/* webpackChunkName: "chart.js" */ 'chart.js')
      .then(Chart => Chart.default)
      .then((Chart) => {
        const canvasNode = vnode.dom.getElementsByTagName('canvas')[0];
        const { type = 'doughnut', options = {}, data, colors = [] } = vnode.attrs;

        const hardcodedOptions = type === 'doughnut' ? {
          circumference: Math.PI, // half doughnut
          rotation: -Math.PI,
        } : {
          legend: {
            position: 'right',
          },
        };
        if (data && data.datasets && data.datasets.length > 0
          && data.datasets[0].data.length > 0) {
          let chartData = {
            labels: [],
            ...data,
          };
          chartData = updateColors([...colors, ...COLOURS_PIE], chartData);
          const chart = new Chart(canvasNode, {
            type,
            data: chartData,
            options: Object.assign(hardcodedOptions, options),
          });
        }
      });
  },
  view(vnode) {
    const data = vnode.attrs.data;
    const noData = !(data && data.datasets && data.datasets.length > 0 && data.datasets[0].data.length > 0);
    const escaStatistics = i18n.getLocalization(escaStatisticsNLS);
    return (<div className="chart-container">
      <div className={`no-data ${noData ? '' : 'd-none'}`}>{escaStatistics.timeRangeNoDataAvailable}</div>
      <canvas
        className={` ${noData ? 'd-none' : ''}`}
        aria-label="Statistics chart"
        role="img"/>
    </div>);
  },
});
