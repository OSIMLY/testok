import ElCheckbox from 'element-ui/packages/checkbox';
import ElTag from 'element-ui/packages/tag';
import Vue from 'vue';
import FilterPanel from './filter-panel.vue';
/**
 * 根据父级列获取全部子列
 * @param {Object} columns 列对象
 */
const getAllColumns = (columns) => {
  const result = [];
  columns.forEach((column) => {
    if (column.children) {
      result.push(column);
      result.push.apply(result, getAllColumns(column.children));
    } else {
      result.push(column);
    }
  });
  return result;
};
/**
 * 根据列模板生成行
 * @param {*} originColumns 
 */
const convertToRows = (originColumns) => {
  let maxLevel = 1;
  const traverse = (column, parent) => {
    if (parent) {
      column.level = parent.level + 1;
      if (maxLevel < column.level) {
        maxLevel = column.level;
      }
    }
    if (column.children) {
      let colSpan = 0;
      column.children.forEach((subColumn) => {
        traverse(subColumn, column);
        colSpan += subColumn.colSpan;
      });
      column.colSpan = colSpan;
    } else {
      column.colSpan = 1;
    }
  };

  originColumns.forEach((column) => {
    column.level = 1;
    traverse(column);
  });

  const rows = [];
  for (let i = 0; i < maxLevel; i++) {
    rows.push([]);
  }

  const allColumns = getAllColumns(originColumns);

  allColumns.forEach((column) => {
    if (!column.children) {
      column.rowSpan = maxLevel - column.level + 1;
    } else {
      column.rowSpan = 1;
    }
    rows[column.level - 1].push(column);
  });

  return rows;
};

export default {
  name: 'ElTableHeader',

  render(h) {
    const originColumns = this.store.states.originColumns;
    const columnRows = convertToRows(originColumns, this.columns);

    return (
      <table
        class="el-table__header"
        cellspacing="0"
        cellpadding="0"
        border="0">
        <colgroup>
          {
            this._l(this.columns, column =>
              <col
                name={ column.id }
                width={ column.realWidth || column.width }
              />)
          }
          {
            !this.fixed && this.layout.gutterWidth
              ? <col name="gutter" width={ this.layout.scrollY ? this.layout.gutterWidth : '' }></col>
              : ''
          }
        </colgroup>
        <thead>
          {
            this._l(columnRows, (columns, rowIndex) =>
              <tr>
              {
                this._l(columns, (column, cellIndex) =>
                  <th
                    colspan={ column.colSpan }
                    rowspan={ column.rowSpan }
                    on-mousemove={ ($event) => this.handleMouseMove($event, column) }
                    on-mouseout={ this.handleMouseOut }
                    on-mousedown={ ($event) => this.handleMouseDown($event, column) }
                    on-click={ ($event) => this.handleHeaderClick($event, column) }
                    on-contextmenu={ ($event)=>this.handleHeaderContextmenu($event, column) }
                    class={ [column.id, column.order, column.headerAlign, column.className || '', rowIndex === 0 && this.isCellHidden(cellIndex, columns) ? 'is-hidden' : '', !column.children ? 'is-leaf' : '', column.labelClassName] }>
                    <div class={ ['cell', column.filteredValue && column.filteredValue.length > 0 ? 'highlight' : '', column.labelClassName] }>
                    {
                      column.renderHeader
                        ? column.renderHeader.call(this._renderProxy, h, { column, $index: cellIndex, store: this.store, _self: this.$parent.$vnode.context })
                        : column.label
                    }
                    {
                      column.sortable
                        ? <span class="caret-wrapper" on-click={ ($event) => this.handleSortClick($event, column) }>
                            <i class="sort-caret ascending" on-click={ ($event) => this.handleSortClick($event, column, 'ascending') }></i>
                            <i class="sort-caret descending" on-click={ ($event) => this.handleSortClick($event, column, 'descending') }></i>
                          </span>
                        : ''
                    }
                    {
                      column.filterable
                         ? <span class="el-table__column-filter-trigger" on-click={ ($event) => this.handleFilterClick($event, column) }><i class={ ['el-icon-arrow-down', column.filterOpened ? 'el-icon-arrow-up' : ''] }></i></span>
                        : ''
                    }
                    </div>
                  </th>
                )
              }
              {
                !this.fixed && this.layout.gutterWidth
                  ? <th class="gutter" style={{ width: this.layout.scrollY ? this.layout.gutterWidth + 'px' : '0' }}></th>
                  : ''
              }
              </tr>
            )
          }
        </thead>
      </table>
    );
  },

  props: {
    // 是否为固定列容器
    fixed: String,
    // 表格状态管理对象
    store: {
      required: true
    },
    // 表格布局对象
    layout: {
      required: true
    },
    // 是否显示列边线
    border: Boolean,
    // 默认排序的列及排序方式
    defaultSort: {
      type: Object,
      default() {
        return {
          prop: '',
          order: ''
        };
      }
    }
  },

  components: {
    ElCheckbox,
    ElTag
  },

  computed: {
    // 返回是否全选
    isAllSelected() {
      return this.store.states.isAllSelected;
    },
    // 返回列的数量
    columnsCount() {
      return this.store.states.columns.length;
    },
    // 返回左侧固定列的数量
    leftFixedCount() {
      return this.store.states.fixedColumns.length;
    },
    // 返回右侧固定列的数量
    rightFixedCount() {
      return this.store.states.rightFixedColumns.length;
    },
    // 返回列对象
    columns() {
      return this.store.states.columns;
    }
  },

  created() {
    // 定义筛选面板对象，无需响应式更新的数据在此定义
    this.filterPanels = {};
  },

  mounted() {
    // 初始化默认排序列
    if (this.defaultSort.prop) {
      const states = this.store.states;
      states.sortProp = this.defaultSort.prop;
      states.sortOrder = this.defaultSort.order || 'ascending';
      this.$nextTick(_ => {
        for (let i = 0, length = this.columns.length; i < length; i++) {
          let column = this.columns[i];
          if (column.property === states.sortProp) {
            column.order = states.sortOrder;
            states.sortingColumn = column;
            break;
          }
        }

        if (states.sortingColumn) {
          this.store.commit('changeSortCondition');
        }
      });
    }
  },

  beforeDestroy() {
    // 销毁筛选面板
    const panels = this.filterPanels;
    for (let prop in panels) {
      if (panels.hasOwnProperty(prop) && panels[prop]) {
        panels[prop].$destroy(true);
      }
    }
  },

  methods: {
    /**
     * 判断单元格是否隐藏
     * @param {Number} index 列序号
     * @param {Object} columns 列对象
     */
    isCellHidden(index, columns) {
      // 根据列序号及固定列长度确定那些列需要隐藏
      if (this.fixed === true || this.fixed === 'left') {
        return index >= this.leftFixedCount;
      } else if (this.fixed === 'right') {
        let before = 0;
        for (let i = 0; i < index; i++) {
          before += columns[i].colSpan;
        }
        return before < this.columnsCount - this.rightFixedCount;
      } else {
        return (index < this.leftFixedCount) || (index >= this.columnsCount - this.rightFixedCount);
      }
    },
    /**
     * 切换全选状态
     */
    toggleAllSelection() {
      // 通过触发 store 内部方法修改
      this.store.commit('toggleAllSelection');
    },
    /**
     * 处理筛选器点击
     * @param {Object} event 事件对象
     * @param {Object} column 列对象
     */
    handleFilterClick(event, column) {
      event.stopPropagation();
      const target = event.target;
      const cell = target.parentNode;
      const table = this.$parent;
      // 筛选面板以列 id 为索引存储到数组中
      let filterPanel = this.filterPanels[column.id];

      if (filterPanel && column.filterOpened) {
        filterPanel.showPopper = false;
        return;
      }
      // 如果数组中不存在则初始化一个新面板组件
      if (!filterPanel) {
        filterPanel = new Vue(FilterPanel);
        this.filterPanels[column.id] = filterPanel;

        filterPanel.table = table;
        filterPanel.cell = cell;
        filterPanel.column = column;
        !this.$isServer && filterPanel.$mount(document.createElement('div'));
      }

      setTimeout(() => {
        filterPanel.showPopper = true;
      }, 16);
    },
    /**
     * 处理表头点击
     * @param {Object} event 事件对象
     * @param {Object} column 列对象
     */
    handleHeaderClick(event, column) {
      // 确定点击列头进行排序还是筛选
      if (!column.filters && column.sortable) {
        this.handleSortClick(event, column);
      } else if (column.filters && !column.sortable) {
        this.handleFilterClick(event, column);
      }

      this.$parent.$emit('header-click', column, event);
    },
    /**
     * 处理表头右键菜单
     * @param {Object} event 事件对象
     * @param {Object} column 列对象
     */
    handleHeaderContextmenu(event, column) {
      this.$parent.$emit('header-contextmenu', column, event);
    },
    /**
     * 处理鼠标按下
     * @param {Object} event 事件对象
     * @param {Object} column 列对象
     */
    handleMouseDown(event, column) {
      // 处理拖动调整列宽
      if (this.$isServer) return;
      if (column.children && column.children.length > 0) return;
      /* istanbul ignore if */
      if (this.draggingColumn && this.border) {
        this.dragging = true;
        // 显示一条竖线
        this.$parent.resizeProxyVisible = true;

        const table = this.$parent;
        const tableEl = table.$el;
        const tableLeft = tableEl.getBoundingClientRect().left;
        const columnEl = this.$el.querySelector(`th.${column.id}`);
        const columnRect = columnEl.getBoundingClientRect();
        const minLeft = columnRect.left - tableLeft + 30;

        columnEl.classList.add('noclick');

        this.dragState = {
          startMouseLeft: event.clientX,
          startLeft: columnRect.right - tableLeft,
          startColumnLeft: columnRect.left - tableLeft,
          tableLeft
        };

        const resizeProxy = table.$refs.resizeProxy;
        resizeProxy.style.left = this.dragState.startLeft + 'px';

        document.onselectstart = function() { return false; };
        document.ondragstart = function() { return false; };
        // 处理鼠标移动事件
        const handleMouseMove = (event) => {
          const deltaLeft = event.clientX - this.dragState.startMouseLeft;
          const proxyLeft = this.dragState.startLeft + deltaLeft;

          resizeProxy.style.left = Math.max(minLeft, proxyLeft) + 'px';
        };
        // 处理鼠标抬起事件
        const handleMouseUp = () => {
          if (this.dragging) {
            const {
              startColumnLeft,
              startLeft
            } = this.dragState;
            const finalLeft = parseInt(resizeProxy.style.left, 10);
            const columnWidth = finalLeft - startColumnLeft;
            column.width = column.realWidth = columnWidth;
            table.$emit('header-dragend', column.width, startLeft - startColumnLeft, column, event);

            this.store.scheduleLayout();

            document.body.style.cursor = '';
            this.dragging = false;
            this.draggingColumn = null;
            this.dragState = {};

            table.resizeProxyVisible = false;
          }
          // 鼠标抬起后取消监听移动和抬起事件
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.onselectstart = null;
          document.ondragstart = null;

          setTimeout(function() {
            columnEl.classList.remove('noclick');
          }, 0);
        };
        // 鼠标按下后开始监听移动和抬起事件
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    },
    /**
     * 处理鼠标移动
     * @param {Object} event 事件对象
     * @param {Object} column 列对象
     */
    handleMouseMove(event, column) {
      if (column.children && column.children.length > 0) return;
      let target = event.target;
      while (target && target.tagName !== 'TH') {
        target = target.parentNode;
      }

      if (!column || !column.resizable) return;

      if (!this.dragging && this.border) {
        let rect = target.getBoundingClientRect();

        const bodyStyle = document.body.style;
        if (rect.width > 12 && rect.right - event.pageX < 8) {
          bodyStyle.cursor = 'col-resize';
          this.draggingColumn = column;
        } else if (!this.dragging) {
          bodyStyle.cursor = '';
          this.draggingColumn = null;
        }
      }
    },
    /**
     * 处理鼠标移出
     */
    handleMouseOut() {
      if (this.$isServer) return;
      document.body.style.cursor = '';
    },
    /**
     * 切换顺序
     * @param {Number} order 
     */
    toggleOrder(order) {
      return !order ? 'ascending' : order === 'ascending' ? 'descending' : null;
    },
    /**
     * 处理点击排序事件
     * @param {Object} event 事件对象
     * @param {Object} column 列对象
     * @param {String} givenOrder 排序方式
     */
    handleSortClick(event, column, givenOrder) {
      event.stopPropagation();
      let order = givenOrder || this.toggleOrder(column.order);

      let target = event.target;
      while (target && target.tagName !== 'TH') {
        target = target.parentNode;
      }

      if (target && target.tagName === 'TH') {
        if (target.classList.contains('noclick')) {
          target.classList.remove('noclick');
          return;
        }
      }

      if (!column.sortable) return;

      const states = this.store.states;
      let sortProp = states.sortProp;
      let sortOrder;
      const sortingColumn = states.sortingColumn;

      if (sortingColumn !== column) {
        if (sortingColumn) {
          sortingColumn.order = null;
        }
        states.sortingColumn = column;
        sortProp = column.property;
      }

      if (!order) {
        sortOrder = column.order = null;
        states.sortingColumn = null;
        sortProp = null;
      } else {
        sortOrder = column.order = order;
      }

      states.sortProp = sortProp;
      states.sortOrder = sortOrder;

      this.store.commit('changeSortCondition');
    }
  },

  data() {
    return {
      draggingColumn: null,
      dragging: false,
      dragState: {}
    };
  }
};
