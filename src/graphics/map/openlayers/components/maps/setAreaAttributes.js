/**
 * Adds label to canvas and aria-labelledby on the focusable div container
 *
 * @param {object} data
 * @param {string} data.mapId
 * @param {string} [data.rowId]
 * @param {string} data.label
 * @param {OLMap} olMap
 */
export const setAreaAttributes = ({ mapId, rowId = '', label }, olMap) => {
  const labelId = `${rowId}-${mapId}`;
  const targetElement = olMap.getTargetElement();
  if (!targetElement) return;
  targetElement.setAttribute('labelled-by', labelId);
  const canvasElement = targetElement.querySelector('canvas');
  if (!canvasElement) return;
  canvasElement.setAttribute('aria-label', label);
  canvasElement.id = labelId;
};
