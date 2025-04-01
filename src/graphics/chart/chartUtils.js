const shortenLabel = (label, maxLength) => {
  if (maxLength) {
    const lbl = Array.isArray(label) ? label.join('') : label;
    if (lbl.length > maxLength) {
      // const halfmaxlength = Math.floor(maxLength / 2);
      // return `${lbl.substr(0, halfmaxlength)} … ${lbl.substr(length - halfmaxlength)}`;
      return `${lbl.substr(0, maxLength)} …`;
    }
  }
  return label;
};

export default {
  shortenLabels: (labels, maxLength) => {
    if (maxLength === undefined) {
      return labels;
    }
    return labels.map(lbl => shortenLabel(lbl, maxLength));
  },
  breakLabels: (labels, maxLength) => {
    if (maxLength === undefined) {
      return labels;
    }
    return labels.map((lbl) => {
      const length = lbl.length;
      if (length < maxLength) {
        return lbl;
      }
      const splitted = [];
      let remaining = lbl;
      while (remaining.length > 0) {
        if (remaining.length < maxLength) {
          splitted.push(remaining);
          remaining = '';
          break;
        }
        let breakPoint = remaining.substr(0, maxLength).lastIndexOf(' ');
        if (breakPoint === -1) {
          breakPoint = maxLength;
        }
        splitted.push(remaining.substr(0, breakPoint));
        remaining = remaining.substr(breakPoint);
      }
      return splitted;
    });
  },
  barChartOptions: {
    options: {
      tooltips: {
        mode: 'y',
        intersect: false,
        callbacks: {
          title: (tooltipItem, d) => {
            let label = (d.origLabels || d.labels)[tooltipItem[0].index] || '';
            if (Array.isArray(label)) {
              label = label.join('');
            }
            return label;
          },
        },
      },
    },
  },
  dougnutOptions: {
    options: {
      tooltips: {
        callbacks: {
          label: (tooltipItem, d) => {
            let label = (d.origLabels || d.labels)[tooltipItem.index];
            const value = `: ${d.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]}`;
            if (Array.isArray(label)) {
              label = label.join('');
            }
            return label + value;
          },
        },
      },
      legend: {
        labels: {
          generateLabels(chart) {
            const arr = Chart.defaults.doughnut.legend.labels.generateLabels(chart);
            arr.forEach((val) => {
              val.text = shortenLabel(val.text, chart.data.labelMaxLength);
            });
            return arr;
          },
        },
        position: 'right',
      },
    },
  }
};
