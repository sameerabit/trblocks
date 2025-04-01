import escaStatisticsNLS from 'blocks/migration/nls/escaStatistics.nls';
import { i18n } from 'esi18n';

const updateColors = (colorsToApply, chartData) => {
  if (colorsToApply.length > 0) {
    const colorOptionsCount = colorsToApply.length;
    chartData.datasets.forEach((dataset, idx) => {
      const colorIdx = idx % colorOptionsCount; // repeat colors
      Object.assign(chartData.datasets[idx], { ...colorsToApply[colorIdx] });
    });
  }
  return chartData;
};

export default () => {
  return {
    oncreate(vnode) {
      import(/* webpackChunkName: "chart.js" */ 'chart.js')
        .then(Chart => Chart.default)
        .then((Chart) => {
          const canvasNode = vnode.dom.getElementsByTagName('canvas')[0];
          const { type = 'bar', options = {}, data, colors = [] } = vnode.attrs;

          if (data && data.datasets && data.datasets.length > 0
            && data.datasets[0].data.length > 0) {
            let chartData = {
              labels: [],
              ...data,
            };
            chartData = updateColors(colors, chartData);

            const chart = new Chart(canvasNode, {
              type,
              data: chartData,
              options,
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
        <canvas className={` ${noData ? 'd-none' : ''}`} aria-label="Statistics chart" role="img"/>
      </div>);
    },
  };
};
