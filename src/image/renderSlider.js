import DOMUtil from 'blocks/utils/htmlUtil';
import getEntry from 'blocks/utils/getEntry';
import registry from 'blocks/registry';
import constraints from 'blocks/utils/constraints';
import handlebars from 'blocks/boot/handlebars';
import jquery from 'jquery';

const loadDependencies = async () => {
  await import(/* webpackChunkName: "slick-carousel" */ 'slick-carousel');
  import(/* webpackChunkName: "slick-carousel" */ 'slick-carousel/slick/slick.css');
  import(/* webpackChunkName: "slick-carousel" */ 'slick-carousel/slick/slick-theme.css');
  import(/* webpackChunkName: "slick-carousel" */ 'lightbox2/dist/css/lightbox.min.css');
  return await import(/* webpackChunkName: "slick-carousel" */ 'lightbox2');
};

const loadImages = (entry, data) => {
  const es = registry.get('entrystore');
  // Check in metadata for images via property
  if (data.imagesProperty || data.property) {
    const md = entry.getAllMetadata();
    const subject = entry.getResourceURI();
    const images = md.find(subject, data.imagesProperty || data.property).map(stmt => stmt.getValue());

    // Load the related image entries only if needed,
    // otherwise assume their resourceURI is useful as src in an img tag
    if (data.caption || data.captionTemplate) {
      if (images.length > 0) {
        const ruri2entry = {};
        const query = constraints(es.newSolrQuery().resource(images), data.constraints);
        if (registry.get('blocks_forcePublicRequests') !== false) {
          query.publicRead();
        }
        return query.context(data.context).forEach((imageEntry) => {
          ruri2entry[imageEntry.getResourceURI()] = imageEntry;
        }).then(() => images.map(ruri => ruri2entry[ruri]));
      }
    }

    return Promise.resolve(images);
  } else if (data.imagesPropertyInverse) {
    const images = [];
    const query = constraints(es.newSolrQuery().uriProperty(
      data.imagesPropertyInverse, entry.getResourceURI()), data.constraints);
    if (registry.get('blocks_forcePublicRequests') !== false) {
      query.publicRead();
    }
    return query.context(data.context).forEach((imageEntry) => {
      images.push(imageEntry);
    }).then(() => images);
  }

  return Promise.resolve([]);
};

export default (node, data) => {
  loadDependencies().then((lblib) => {
    const sliderContainer = DOMUtil.create('div', { class: 'slider-container' });
    const headerContainer = DOMUtil.create('div', { class: 'slider-header' });
    node.appendChild(headerContainer);
    node.appendChild(sliderContainer);
    const singleItem = DOMUtil.create('div', {
      class: 'single-item',
    });
    sliderContainer.appendChild(singleItem);
    getEntry(data, (entry) => {
      loadImages(entry, data).then((images) => {
        if (images.length === 0 && data.fallback) {
          images.push(data.fallback);
        }
        if (images.length > 0 && data.headerTemplate) {
          handlebars.run(headerContainer, data, data.headerTemplate, entry);
        }
        const lightboxes = [];
        images.forEach((imageEntry, index) => {
          let uri = imageEntry.getResourceURI ? imageEntry.getResourceURI() : imageEntry;
          if (data.src && imageEntry.getResourceURI) {
            if (typeof data.src === 'function') {
              uri = data.src(imageEntry);
            } else {
              uri = imageEntry.getAllMetadata().findFirstValue(imageEntry.getResourceURI(), data.src);
            }
          }
          const caption = (data.caption && imageEntry.getAllMetadata) ? imageEntry.getAllMetadata()?.findFirstValue(uri, data.caption) : undefined;
          const lconf = {
            class: 'lightbox-link',
            'data-lightbox': 'slider',
            href: uri,
          };
          if (caption) {
            lconf['data-title'] = caption;
          }
          const wrapper = DOMUtil.create('div', lconf);
          singleItem.appendChild(wrapper);
          const lightboxNode = DOMUtil.create('a', lconf);
          wrapper.appendChild(lightboxNode);
          const sliderImage = DOMUtil.create('img', {
            class: 'slider-img',
            src: uri,
          });
          lightboxNode.appendChild(sliderImage);

          if (data.captionTemplate && imageEntry.getResourceURI) {
            const sliderCaptionEl = DOMUtil.create('div', {
              class: 'slider-caption',
            });
            wrapper.appendChild(sliderCaptionEl);
            handlebars.run(sliderCaptionEl, Object.assign({}, data, { entry: imageEntry }), data.captionTemplate, imageEntry);
            lightboxes.push({
              sliderCaptionEl,
              wrapper,
              lightboxNode,
              sliderImage,
            });
          } else if (caption) {
            const sliderCaptionEl = DOMUtil.create('div', {
              class: 'slider-caption',
              innerHTML: caption,
            });
            wrapper.appendChild(sliderCaptionEl);
          }

          if (index === 0) {
            sliderImage.onload = () => {
              jquery('.single-item').slick('setPosition');
            };
          }
        });
        jquery(document).ready(() => {
          lightboxes.forEach(({ sliderCaptionEl, wrapper, lightboxNode, sliderImage }) => {
            const captionText = sliderCaptionEl.innerText;
            jquery(wrapper).attr('data-title', captionText);
            jquery(lightboxNode).attr('data-title', captionText);
            jquery(sliderImage).attr('alt', captionText);
          });
          jquery(singleItem).slick({
            dots: true,
            arrows: true,
            cssEase: 'linear',
            fade: true,
            adaptiveHeight: true,
          });

          lblib.option({
            alwaysShowNavOnTouchDevices: true,
          });
          registry.onChange('slider-lightbox-open', () => {
            jquery('.slick-current .slider-img')[0].click();
          });
        });
      });
    });
  });
};
