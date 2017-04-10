import ElCheckbox from 'element-ui/packages/checkbox';
import ElTag from 'element-ui/packages/tag';
import objectAssign from 'element-ui/src/utils/merge';
import { getValueByPath } from './util';

let columnIdSeed = 1;

const defaults = {
  // 默认列的初始属性
  default: {
    order: ''
  },
  // 选择列的初始属性
  selection: {
    width: 48,
    minWidth: 48,
    realWidth: 48,
    order: '',
    className: 'el-table-column--selection'
  },
  // 展开列的初始属性
  expand: {
    width: 48,
    minWidth: 48,
    realWidth: 48,
    order: ''
  },
  // 序号列的初始属性
  index: {
    width: 48,
    minWidth: 48,
    realWidth: 48,
    order: ''
  }
};

const forced = {
  // 定义选择列的列头及单元格渲染方式等
  selection: {
    renderHeader: function(h) {
      return <el-checkbox
        nativeOn-click={ this.toggleAllSelection }
        domProps-value={ this.isAllSelected } />;
    },
    renderCell: function(h, { row, column, store, $index }) {
      return <el-checkbox
        domProps-value={ store.isSelected(row) }
        disabled={ column.selectable ? !column.selectable.call(null, row, $index) : false }
        on-input={ () => { store.commit('rowSelectedChanged', row); } } />;
    },
    sortable: false,
    resizable: false
  },
  // 定义序号列的列头及单元格渲染方式等
  index: {
    renderHeader: function(h, { column }) {
      return column.label || '#';
    },
    renderCell: function(h, { $index }) {
      return <div>{ $index + 1 }</div>;
    },
    sortable: false
  },
  // 定义展开列的列头及单元格渲染方式等
  expand: {
    renderHeader: function(h, {}) {
      return '';
    },
    renderCell: function(h, { row, store }, proxy) {
      const expanded = store.states.expandRows.indexOf(row) > -1;
      return <div class={ 'el-table__expand-icon ' + (expanded ? 'el-table__expand-icon--expanded' : '') }
                  on-click={ () => proxy.handleExpandClick(row) }>
        <i class='el-icon el-icon-arrow-right'></i>
      </div>;
    },
    sortable: false,
    resizable: false,
    className: 'el-table__expand-column'
  }
};
// 生成一个默认初始值的列对象
const getDefaultColumn = function(type, options) {
  const column = {};

  objectAssign(column, defaults[type || 'default']);

  for (let name in options) {
    if (options.hasOwnProperty(name)) {
      const value = options[name];
      if (typeof value !== 'undefined') {
        column[name] = value;
      }
    }
  }

  if (!column.minWidth) {
    column.minWidth = 80;
  }

  column.realWidth = column.width || column.minWidth;

  return column;
};
// 默认单元格渲染函数
const DEFAULT_RENDER_CELL = function(h, { row, column }) {
  const property = column.property;
  if (column && column.formatter) {
    return column.formatter(row, column);
  }

  if (property && property.indexOf('.') === -1) {
    return row[property];
  }

  return getValueByPath(row, property);
};

export default {
  name: 'ElTableColumn',

  props: {
    // 列的类型
    type: {
      type: String,
      default: 'default'
    },
    // 列头标题
    label: String,
    // 列的样式类名
    className: String,
    // 列头的样式类名
    labelClassName: String,
    // 列绑定的字段名称
    property: String,
    // 列绑定的字段名称，同于 property
    prop: String,
    // 列宽
    width: {},
    // 列的最小宽度
    minWidth: {},
    // 列头渲染函数
    renderHeader: Function,
    // 是否可排序或自定义排序
    sortable: {
      type: [String, Boolean],
      default: false
    },
    // 指定排序方法
    sortMethod: Function,
    // 是否允许调整列宽
    resizable: {
      type: Boolean,
      default: true
    },
    // 所属的表格对象
    context: {},
    // 列的键值
    columnKey: String,
    // 列的单元格排序方式
    align: String,
    // 列头排序方式
    headerAlign: String,
    // 内容过长时显示气泡提示，兼容老版
    showTooltipWhenOverflow: Boolean,
    // 内容过长时显示气泡提示，同上
    showOverflowTooltip: Boolean,
    // 是否为固定列
    fixed: [Boolean, String],
    // 单元格格式化函数
    formatter: Function,
    // 为选择列时，行是否可选的回调函数
    selectable: Function,
    // 是否保留选择集
    reserveSelection: Boolean,
    // 筛选函数
    filterMethod: Function,
    // 过滤选项预设值
    filteredValue: Array,
    // 过滤选项列表
    filters: Array,
    // 过滤是否允许多选
    filterMultiple: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      // 是否为子列
      isSubColumn: false,
      // 未使用的变量
      columns: []
    };
  },

  beforeCreate() {
    this.row = {};
    this.column = {};
    this.$index = 0;
  },

  components: {
    ElCheckbox,
    ElTag
  },

  computed: {
    // 获取所属的表格组件
    owner() {
      let parent = this.$parent;
      while (parent && !parent.tableId) {
        parent = parent.$parent;
      }
      return parent;
    }
  },

  created() {
    this.customRender = this.$options.render;
    this.$options.render = h => h('div', this.$slots.default);
    this.columnId = (this.$parent.tableId || (this.$parent.columnId + '_')) + 'column_' + columnIdSeed++;

    let parent = this.$parent;
    let owner = this.owner;
    this.isSubColumn = owner !== parent;

    let type = this.type;

    let width = this.width;
    if (width !== undefined) {
      width = parseInt(width, 10);
      if (isNaN(width)) {
        width = null;
      }
    }

    let minWidth = this.minWidth;
    if (minWidth !== undefined) {
      minWidth = parseInt(minWidth, 10);
      if (isNaN(minWidth)) {
        minWidth = 80;
      }
    }

    let isColumnGroup = false;

    let column = getDefaultColumn(type, {
      id: this.columnId,
      columnKey: this.columnKey,
      label: this.label,
      className: this.className,
      labelClassName: this.labelClassName,
      property: this.prop || this.property,
      type,
      renderCell: null,
      renderHeader: this.renderHeader,
      minWidth,
      width,
      isColumnGroup,
      context: this.context,
      align: this.align ? 'is-' + this.align : null,
      headerAlign: this.headerAlign ? 'is-' + this.headerAlign : (this.align ? 'is-' + this.align : null),
      sortable: this.sortable === '' ? true : this.sortable,
      sortMethod: this.sortMethod,
      resizable: this.resizable,
      showOverflowTooltip: this.showOverflowTooltip || this.showTooltipWhenOverflow,
      formatter: this.formatter,
      selectable: this.selectable,
      reserveSelection: this.reserveSelection,
      fixed: this.fixed === '' ? true : this.fixed,
      filterMethod: this.filterMethod,
      filters: this.filters,
      filterable: this.filters || this.filterMethod,
      filterMultiple: this.filterMultiple,
      filterOpened: false,
      filteredValue: this.filteredValue || []
    });

    objectAssign(column, forced[type] || {});

    this.columnConfig = column;

    let renderCell = column.renderCell;
    let _self = this;

    if (type === 'expand') {
      owner.renderExpanded = function(h, data) {
        return _self.$scopedSlots.default
          ? _self.$scopedSlots.default(data)
          : _self.$slots.default;
      };

      column.renderCell = function(h, data) {
        return <div class="cell">{ renderCell(h, data, this._renderProxy) }</div>;
      };

      return;
    }

    column.renderCell = function(h, data) {
      // 未来版本移除
      if (_self.$vnode.data.inlineTemplate) {
        renderCell = function() {
          data._self = _self.context || data._self;
          if (Object.prototype.toString.call(data._self) === '[object Object]') {
            for (let prop in data._self) {
              if (!data.hasOwnProperty(prop)) {
                data[prop] = data._self[prop];
              }
            }
          }
          // 静态内容会缓存到 _staticTrees 内，不改的话获取的静态数据就不是内部 context
          data._staticTrees = _self._staticTrees;
          data.$options.staticRenderFns = _self.$options.staticRenderFns;
          return _self.customRender.call(data);
        };
      } else if (_self.$scopedSlots.default) {
        renderCell = () => _self.$scopedSlots.default(data);
      }

      if (!renderCell) {
        renderCell = DEFAULT_RENDER_CELL;
      }

      return _self.showOverflowTooltip || _self.showTooltipWhenOverflow
        ? <el-tooltip
            effect={ this.effect }
            placement="top"
            disabled={ this.tooltipDisabled }>
            <div class="cell">{ renderCell(h, data) }</div>
            <span slot="content">{ renderCell(h, data) }</span>
          </el-tooltip>
        : <div class="cell">{ renderCell(h, data) }</div>;
    };
  },

  destroyed() {
    if (!this.$parent) return;
    this.owner.store.commit('removeColumn', this.columnConfig);
  },

  watch: {
    label(newVal) {
      if (this.columnConfig) {
        this.columnConfig.label = newVal;
      }
    },

    prop(newVal) {
      if (this.columnConfig) {
        this.columnConfig.property = newVal;
      }
    },

    property(newVal) {
      if (this.columnConfig) {
        this.columnConfig.property = newVal;
      }
    },

    filters(newVal) {
      if (this.columnConfig) {
        this.columnConfig.filters = newVal;
      }
    },

    filterMultiple(newVal) {
      if (this.columnConfig) {
        this.columnConfig.filterMultiple = newVal;
      }
    },

    align(newVal) {
      if (this.columnConfig) {
        this.columnConfig.align = newVal ? 'is-' + newVal : null;

        if (!this.headerAlign) {
          this.columnConfig.headerAlign = newVal ? 'is-' + newVal : null;
        }
      }
    },

    headerAlign(newVal) {
      if (this.columnConfig) {
        this.columnConfig.headerAlign = 'is-' + (newVal ? newVal : this.align);
      }
    },

    width(newVal) {
      if (this.columnConfig) {
        this.columnConfig.width = newVal;
        this.owner.store.scheduleLayout();
      }
    },

    minWidth(newVal) {
      if (this.columnConfig) {
        this.columnConfig.minWidth = newVal;
        this.owner.store.scheduleLayout();
      }
    },

    fixed(newVal) {
      if (this.columnConfig) {
        this.columnConfig.fixed = newVal;
        this.owner.store.scheduleLayout();
      }
    }
  },

  mounted() {
    const owner = this.owner;
    const parent = this.$parent;
    let columnIndex;

    if (!this.isSubColumn) {
      columnIndex = [].indexOf.call(parent.$refs.hiddenColumns.children, this.$el);
    } else {
      columnIndex = [].indexOf.call(parent.$el.children, this.$el);
    }

    owner.store.commit('insertColumn', this.columnConfig, columnIndex, this.isSubColumn ? parent.columnConfig : null);
  }
};
