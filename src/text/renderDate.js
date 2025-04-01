import filter from 'blocks/utils/filter';
import getEntry from 'blocks/utils/getEntry';
import moment from 'moment';

export default (node, data) => {
  filter.guard(node, data.if);
  getEntry(data, (entry) => {
    const ei = entry.getEntryInfo();
    const property = data.property;
    let date;
    if (property === undefined || property === 'modified') {
      date = ei.getModificationDate();
    } else if (property === 'issued') {
      date = ei.getCreationDate();
    } else {
      const dateStr = entry.getAllMetadata().findFirstValue(null, property);
      if (dateStr && !isNaN(Date.parse(dateStr))) {
        date = new Date(Date.parse(dateStr));
      }
    }
    if (date) {
      node.innerHTML = moment(date).format(data.format || 'l');
      node.title = moment(date).format(data.tooltipformat || 'LLLL');
    }
  });
};
