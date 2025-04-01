import jquery from 'jquery';
import DOMUtil from 'blocks/utils/htmlUtil';
import 'blocks/list/esbPagination';
import { i18n } from 'esi18n';
import registry from 'blocks/registry';
import ArrayList from 'blocks/utils/ArrayList';
import handlebars from 'blocks/boot/handlebars';
import error from 'blocks/boot/error';
import constraints from 'blocks/utils/constraints';
import dependencyList from 'blocks/utils/dependencyList';
import randomizeList from 'blocks/utils/randomizeList';
import filter from 'blocks/utils/filter';
import TemplateRow from 'blocks/list/row/TemplateRow';
import TemplateExpandRow from 'blocks/list/row/TemplateExpandRow';
import params from 'blocks/boot/params';
import { getBoolean } from 'blocks/utils/configUtil';

const getPageFromUrl = () => {
  const currentUrlParams = new URLSearchParams(window.location.search);
  return currentUrlParams.get(`${params.getParamPrefix()}page`);
};

const loadSwiperDependencies = async () => {
  await import(/* webpackChunkName: "slick-carousel" */ 'slick-carousel');
  await import(/* webpackChunkName: "slick-carousel" */ 'slick-carousel/slick/slick.css');
  await import(/* webpackChunkName: "slick-carousel" */ 'slick-carousel/slick/slick-theme.css');
};

const getSwiperConfig = ({ swiperSettings = {} }) => {
  const { slidesToShow = 1, slidesToScroll = 1, infinite = false, arrowElementId } = swiperSettings;
  const swiperConfig = { slidesToShow, slidesToScroll, infinite };
  if (arrowElementId) {
    swiperConfig.appendArrows = `#${arrowElementId}`;
  }
  return swiperConfig;
};

const getSpinner = () => {
  const spinner = document.createElement('div');
  spinner.classList.add('esbSpinner');
  spinner.innerHTML = `<div class="spinner-border" role="status">
        <span class="sr-only">Loading...</span>
      </div>`;
  return spinner;
};

let listNumber = 0;

export default class List {
  constructor({ conf, block, contextId, entry }, node) {
    this.conf = conf;
    this.block = block;
    this.contextId = contextId;
    this.entry = entry;
    this.domNode = node;
    this.domNode.classList.add('escoList');
    this.rowClass = TemplateRow;
    this.minimumSearchLength = registry.get('blocks_minimumSearchLength') || 3;
    this.rows = [];
    this.paginationControl = null;
    this.pageInUrl = getBoolean(this.conf.pageInUrl, false);
    this.pageReloaded = true;
    this.currentPage = 1;
    this.spinner = getSpinner();
    this.facetStore = registry.get('blocks_facet_store');
    this.listNumber = listNumber;
    listNumber += 1;

    if (this.conf.layout === 'cards') {
      this.domNode.classList.add('cardLayout');
    }
    if (this.conf.layout === 'swiper') {
      this.domNode.classList.add('esbSwiperLayout');
    }

    // Ungroup potential single big template
    if (this.conf.htemplate && !this.conf.templates) {
      try {
        this.conf.templates = handlebars.unGroup(this.conf.htemplate);
      } catch (e) {
        this.conf.error = e.toString();
        this.conf.errorCode = 3;
        this.conf.errorCause = this.conf.htemplate;
        error(this.domNode, this.conf);
        return;
      }
    }

    // If there is a listhead, add it first
    if (this.conf.templates && this.conf.templates.listhead) {
      this.listHeadNode = DOMUtil.create('div');
      this.domNode.appendChild(this.listHeadNode);
    }

    // Add a listbody with results, potentially with help of a listbody template
    if (this.conf.templates && this.conf.templates.listbody) {
      // Fix for use of <main> in opendata extensions
      if (registry.get('blocks_strictStandardHtml')) {
        const listBodyTemplate = this.conf.templates.listbody;
        this.conf.templates.listbody = listBodyTemplate.replace('<main>', '<div>').replace('</main>', '</div>') ;
      }

      this.listbody = handlebars.run(DOMUtil.create('div', undefined, this.domNode), this.conf,
        this.conf.templates.listbody, null, true);
    } else {
      this.listbody = DOMUtil.create('div', undefined, this.domNode);
    }
    this.resultsNode = DOMUtil.create('div', {
      class: 'entryList regular',
      'aria-live': this.conf.live || 'polite',
      'aria-labelledby': this.conf.labelledby,
    }, this.listbody);
    this.paginationNode = DOMUtil.create('nav', {
      'aria-label': 'pagination',
      'aria-labelledby': this.conf.labelledby,
      class: 'entryPagination',
    }, this.listbody);

    // Add placeholder last
    if (conf.templates && conf.templates.listplaceholder) {
      this.placeholderNode = DOMUtil.create('div');
      this.domNode.appendChild(this.placeholderNode);
      handlebars.run(this.placeholderNode, Object.assign({}, conf, {
        htemplate: conf.templates.listplaceholder,
        context: conf.context,
        entry: conf.entry,
      }));
    }

    // Use TemplateExpandRow class (instead of default TemplateRow) if there is a rowexpand template
    if ((this.conf.templates != null && this.conf.templates.rowexpand) ||
      this.conf.rdformsid != null || this.conf.template != null) {
      this.rowClass = TemplateExpandRow;
    }

    if (this.pageInUrl) {
      window.addEventListener('popstate', () => {
        const page = getPageFromUrl() || 1;
        if (page !== this.currentPage) {
          this.getListResults(page).then((resultEntryArray) => this.showPage(resultEntryArray, page));
        }
      });
    }
  }
  showPlaceholder(/* searchMode */) {
    if (this.placeholderNode) {
      this.placeholderNode.style.display = '';
      this.listbody.style.display = 'none';
    }
  }
  hidePlaceholder() {
    if (this.placeholderNode) {
      this.placeholderNode.style.display = 'none';
      this.listbody.style.display = '';
    }
  }

  showEntryList(list) {
    this.entryList = list;
    dependencyList(list, this.conf);
    if (this.conf.randomize && filter.isEmpty()) {
      randomizeList(list, this.conf);
    }
    this.pageCount = -1;
    this.actualListSize = -1;
    let currentPage = 1;
    if (this.pageInUrl && this.pageReloaded) {
      const pageFromUrl = getPageFromUrl();
      currentPage = pageFromUrl || currentPage;
      this.pageReloaded = false;
    }
    this.getListResults(currentPage).then((resultEntryArray) => {
      if (this.conf.facets) {
        this.facetStore.getFacetValues(list).then((facetValuesArray) => {
          registry.set('blocks_search_facets_query', list.getQuery());
          registry.set('blocks_search_facets', facetValuesArray);
        });
      }
      this.showPage(resultEntryArray, currentPage);
    });
  }

  showPage(resultEntryArr, page) {
    if (this.resultsNode.contains(this.spinner)) this.resultsNode.removeChild(this.spinner);
    this.resultsNode.classList.remove('esbList__hidden');
    const entryArr = resultEntryArr.filter((entry) => {
      return entry !== null;
    });
    if (entryArr.length === 0 && page > 1) {
      this.emptyPage = true;
      this.showPage(page - 1);
      return;
    }
    // Clear previous rows
    if (this.rows != null && this.rows.length > 0) {
      this.rows.forEach((row) => {
        row.destroy();
      });
      this.rows = [];
    }
    if (entryArr.length === 0) {
      this.showPlaceholder(this.searchTerm != null && this.searchTerm.term !== '' && this.searchTerm.term !== '*');
    } else {
      this.hidePlaceholder();
    }
    this.updateSize(entryArr);
    entryArr.forEach((entry, index) => {
      const rowId = `${this.listNumber}-${index}`;
      const node = DOMUtil.create('div', null, this.resultsNode);
      const Cls = this.rowClass;
      const row = new Cls({ list: this, entry, rowId }, node);
      row.domNode.classList.add('entryListRow');
      this.rows.push(row);
    });
    this.doneRenderingPage();
  }

  getListResults(page) {
    if (page < 1 || (page !== 1 && this.pageCount !== -1 && page > this.pageCount)) {
      return;
    }
    this.currentPage = page;
    this.resultsNode.classList.add('esbList__hidden');
    this.resultsNode.insertBefore(this.spinner, this.resultsNode.firstChild);
    return this.entryList
      .getEntries(page - 1)
      .catch((err) => {
      if (this.resultsNode.contains(this.spinner)) this.resultsNode.removeChild(this.spinner);
      console.error(`Server responded with: ${err}`);
    });
  }
  updateSize(arr) {
    this.listSize = this.entryList.getSize();
    if (arr.length < this.entryList.getLimit()
      || (arr.length === this.entryList.getLimit() && this.emptyPage)) {
      this.actualListSize = ((this.currentPage - 1) * this.entryList.getLimit()) + arr.length;
    }
    this.emptyPage = false;
    if (this.actualListSize >= 0) {
      this.listSize = this.actualListSize;
    }
    this.pageCount = Math.ceil(this.listSize / this.entryList.getLimit());
    if (this.pageCount > 1 || (arr.length === 0 && this.currentPage > 1)) {
      this.domNode.classList.add('multiplePages');
    } else {
      this.domNode.classList.remove('multiplePages');
    }
    // Update pagination
    const currentPage = this.currentPage - 1;
    const pageSize = parseInt(this.entryList.getLimit(), 10);
    const totalCount = this.actualListSize === -1 ? this.listSize : this.actualListSize;
    const showPagination = this.conf.layout !== 'swiper' && totalCount > pageSize;
    if (showPagination) {
      if (this.paginationControl && this.paginationControl.isConnected) {
        this.paginationControl.setAttribute('currentpage', currentPage);
        this.paginationControl.setAttribute('totalcount', totalCount);
        this.paginationControl.setAttribute('pagesize', pageSize);
        return;
      }
      this.paginationControl = DOMUtil.create(
        'esb-pagination',
        {
          link: this.pageInUrl.toString(),
          currentpage: currentPage,
          totalcount: totalCount,
          pagesize: pageSize,
        },
        this.paginationNode
      );
      this.paginationControl.addEventListener('arrow-click', (e) => {
        const newPage = e.detail.page + 1;
        if (this.pageInUrl) {
          const newUrl = new URL(window.location.href);
          const prefix = params.getParamPrefix();
          newUrl.searchParams.set(`${prefix}page`, newPage);
          window.history.pushState(window.history.state, '', newUrl.href);
        }
        this.getListResults(newPage).then((resultEntryArray) => this.showPage(resultEntryArray, newPage));
      });
      this.paginationNode.style.display = '';
      return;
    }
    this.paginationNode.style.display = 'none';
    if (this.paginationControl) {
      this.paginationControl.remove();
    }
  }

  doneRenderingPage() {
    const results = {
      resultsize: this.actualListSize === -1 ? this.listSize : this.actualListSize,
      currentpage: this.currentPage,
      pagecount: this.pageCount,
      term: this.searchTerm ? this.searchTerm.term : undefined,
      list: this.entryList,
    };
    if (this.conf.define) {
      registry.set(this.conf.define, results);
    }
    if (this.conf.templates && this.conf.templates.listhead) {
      handlebars.run(
        this.listHeadNode,
        Object.assign(results, this.conf),
        this.conf.templates.listhead, this.entry);
    }
    if (this.conf.layout === 'swiper') {
      const swiperConfig = getSwiperConfig(this.conf);
      loadSwiperDependencies().then(() => {
        jquery(this.resultsNode).slick(swiperConfig);
      });
    }
    if (typeof this.conf.scrollTop !== 'undefined') {
      jquery(document).scrollTop(parseInt(this.conf.scrollTop, 10));
    }
  }

  search(term) {
    this.searchTerm = term;
    if (!this.entry && (this.conf.relation || this.conf.relationinverse)) {
      console.log('Cannot follow relation (or inverserelation) when no entry is specified, aborting search in list.');
      return;
    }

    if (this.conf.relation) {
      const relationStmts = this.entry.getAllMetadata().find(this.entry.getResourceURI(), this.conf.relation);
      if (relationStmts.length === 0) {
        this.showEntryList(new ArrayList({ arr: [] }));
        return;
      } else if (relationStmts.length > 10) {
        // Can't use the regular loading mechanism as it yields humungous solr queries
        const esu = registry.get('entrystoreutil');
        const rels = relationStmts.map(stmt => stmt.getValue());
        esu.loadEntriesByResourceURIs(rels, this.getContextRestriction(), true)
          .then(entries => this.showEntryList(new ArrayList({ arr: entries, limit: this.conf.limit || null })));
        return;
      }
    }
    if (this.conf.property) {
      const relationStmts = this.entry.getAllMetadata().find(this.entry.getResourceURI(), this.conf.property);
      if (relationStmts.length === 0) {
        this.showEntryList(new ArrayList({ arr: [] }));
        return;
      }
      if (relationStmts.length > 0) {
        const asc = !this.conf.sortOrder?.includes('desc');
        const locale = i18n.getLocale();
        const sortValues = (a, b) => {
          const aValue = decodeURI(a.getValue());
          const bValue = decodeURI(b.getValue());
          const abComparison = aValue.localeCompare(bValue, locale);
          if (abComparison < 0) return asc ? -1 : 1;
          if (abComparison > 0) return asc ? 1 : -1;
          if (abComparison === 0) return 0;
        };
        const delegatedEntries = relationStmts
          .filter((stmt) => stmt.getType() === 'uri')
          .sort(sortValues)
          .map((stmt) => {
            const delegatedEntry = Object.create(this.entry);
            delegatedEntry.getResourceURI = () => stmt.getValue();
            return delegatedEntry;
          });
        this.showEntryList(new ArrayList({ arr: delegatedEntries, limit: this.conf.limit || null }));
        return;
      }
    }
    const qo = this.getSearchObject();
    const l = this.useNoLangSort ? 'nolang' : i18n.getLocale();
    if (this.conf.randomize && filter.isEmpty()) {
      const sortOptions = [`title.${l}+asc`, `title.${l}+asc`, 'modified+desc', 'modified+asc'];
      qo.sort(sortOptions[Math.floor((Math.random() * 4))]);
    } else if (this.conf.sortOrder) {
      if (this.conf.sortOrder === 'title') {
        qo.sort(`title.${l}+asc`);
      } else {
        qo.sort(this.conf.sortOrder);
      }
    } else if (this.sortOrder === 'title') {
      qo.sort(`title.${l}+asc`);
    } else {
      qo.sort(registry.get('blocks_sortOrder') || 'modified+desc');
    }
    this.showEntryList(qo.list());
  }

  getContextRestriction() {
    if (this.contextId) {
      return this.contextId;
    } else if (this.conf.rowcontext === 'inherit') {
      if (this.conf.context) {
        return this.conf.context;
      } else {
        return this.entry.getContext().getId();
      }
    } else if (this.conf.rowcontext) {
      if (this.conf.rowcontext !== '') {
        return this.conf.rowcontext;
      }
    }
    return undefined;
  }

  getSearchObject() {
    const es = registry.get('entrystore');
    const so = es.newSolrQuery();
    if (this.conf.relation) {
      const stmts = this.entry.getAllMetadata().find(this.entry.getResourceURI(), this.conf.relation);
      const rels = stmts.map(stmt => stmt.getValue());
      so.resource(rels);
    }

    if (this.conf.limit || this.conf.limit === 0) {
      so.limit(parseInt(this.conf.limit, 10));
    } else {
      so.limit(registry.get('blocks_limit') || 10);
    }

    so.context(this.getContextRestriction()); // Setting undefined is ok if no restriction.

    if (this.conf.relationinverse && this.entry) {
      so.uriProperty(this.conf.relationinverse, this.entry.getResourceURI());
    }

    if (this.conf.constraints) {
      constraints(so, this.conf.constraints);
    }

    if (this.conf.rdftype) {
      so.rdfType(this.conf.rdftype);
    }

    if (this.block === 'searchList') {
      filter.constraints(so);
      this.facetStore?.addFacetParameters2Query(so);
    }

    filter.globalFilter(so);

    if (registry.get('blocks_forcePublicRequests') !== false) {
      so.publicRead();
    }

    return so;
  }
}
