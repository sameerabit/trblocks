import DOMUtil from 'blocks/utils/htmlUtil';

const getOpenLayerMap = () => import(/* webpackChunkName: "openlayers" */ './openlayers/openLayerMap');

const createMapNode = (data, node) => {
  const mapNode = DOMUtil.create(
    'div',
    {
      class: data.class ? data.class : '',
      tabindex: '0',
      style: 'position:relative;',
    },
    node
  );
  if (data.width) mapNode.style.width = data.width;
  if (data.height) mapNode.style.height = data.height;
  return mapNode;
};

export default async (node, data) => {
  const mapNode = createMapNode(data, node);
  const openLayerMap = await getOpenLayerMap();
  await openLayerMap.default(mapNode, data);
};
