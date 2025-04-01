import DOMUtil from 'blocks/utils/htmlUtil';
import getEntry from 'blocks/utils/getEntry';
import Presenter from '@entryscape/rdforms/src/view/Presenter';
import '@entryscape/rdforms/src/view/bootstrap/labels';
import renderingContext from '@entryscape/rdforms/src/view/renderingContext';
import linkBehaviour from 'blocks/migration/linkBehaviourDialog';
import registry from 'blocks/registry';
import throttle from 'lodash-es/throttle';
import getLookupStore from 'blocks/utils/lookupStoreUtil';
import { getBoolean } from 'blocks/utils/configUtil';

export default function (node, data, items) {
  const linkBehaviourConfig = registry.get('linkBehaviour');
  linkBehaviour.dialog = linkBehaviourConfig !== 'link';
  linkBehaviour.includeResourceInfo = linkBehaviourConfig === 'dialogWithResourceLink';
  if (data.class) {
    DOMUtil.addClass(node, data.class);
  }
  getEntry(data, async (entry) => {
    if (entry) {
      const templateId = data.rdformsid || data.template;
      let template;
      if (templateId === undefined) {
        const lookupStore = await getLookupStore(entry);
        template = await lookupStore.getTemplate(entry, data.parentEntry);
      } else if (Array.isArray(templateId)) {
        template = items.createTemplateFromChildren(templateId);
      } else if (templateId.indexOf(',') !== -1) {
        template = items.createTemplateFromChildren(templateId.split(','));
      } else {
        template = items.getItem(templateId);
        if (template && (template.getType() !== 'group' || template.getProperty() != null)) {
          if (data.label === false || data.label === 'false') {
            const styles = template.getStyles().slice(0);
            styles.push('noLabelInPresent');
            const newsource = items.createExtendedSource(template.getSource(), { styles });
            delete newsource._extendedSource; // Hack, for some reason the children will be empty otherwise
            const newItem = items.createItem(newsource, true, true);
            template = items.createTemplateFromChildren([newItem]);
          } else {
            template = items.createTemplateFromChildren([templateId]);
          }
        }
      }
      if (!template) {
        if (templateId) {
          console.error(`Cannot show metadata, no template with name ${templateId} could be found`);
        } else {
          console.error(
            'Cannot show metadata, no template found for current entry, ' +
            'probably mapping from rdf:type to template is missing.'
          );
        }
        return;
      }
      const fp = {};
      const filterpredicates = data.filterpredicates || data.filterPredicates;
      if (filterpredicates) {
        filterpredicates.split(',').forEach((p) => {
          fp[p] = true;
        });
      }
      const showLanguage = !(data.showLanguage === 'false' || data.showLanguage === false);
      const filterTranslations = !(data.filterTranslations === 'false' || data.filterTranslations === false);
      const compact = !(data.onecol === true || data.onecol === 'true');
      const popupOnLabel = getBoolean(data.popupOnLabel, true);
      node.innerHTML = '';
      node.classList.add('esbRDFormsWrapper');
      const presenter = new Presenter(
        {
          compact,
          filterPredicates: fp,
          showLanguage,
          filterTranslations,
          popupOnLabel,
        },
        DOMUtil.create('div')
      );
      node.appendChild(presenter.domNode);
      presenter.show({
        showLanguage,
        resource: entry.getResourceURI(),
        graph: entry.getAllMetadata(),
        template,
      });
      if (compact) {
        const twocolbreak = data.twocolbreak ? parseInt(data.twocolbreak, 10) : 400;
        const updateCompact = () => {
          if (node.clientWidth < twocolbreak) {
            renderingContext.domClassToggle(presenter.domNode, 'compact', false);
          } else {
            renderingContext.domClassToggle(presenter.domNode, 'compact', compact);
          }
        };
        window.addEventListener('resize', throttle(updateCompact, 200));
      }
    }
  });
}
