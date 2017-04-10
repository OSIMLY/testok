import { getCell, getColumnByCell, getRowIdentity } from './util';
import ElCheckbox from 'element-ui/packages/checkbox';

export default {
  components: {
    // 用于选择列的多选框
    ElCheckbox
  },

  props: {
    // 表格状态管理对象
    store: {
      required: true
    },
    // 表格对象本身
    context: {},
    // 布局对象
    layout: {
      required: true
    },
    // 行样式类名
    rowClassName: [String, Function],
    // 行样式
    rowStyle: [Object, Function],
    // 是否为固定列容器
    fixed: String,
    // 是否高亮当前航
    highlight: Boolean
  },
  // 自定义渲染函数
  render(h) {
    // 确定隐藏列
    const columnsHidden = this.columns.map((column, index) => this.isColumnHidden(index));
    // JSX 语法描述渲染结果
    return (
      <table
        class="el-table__body"
        cellspacing="0"
        cellpadding="0"
        border="0">
        <colgroup>
          {
            // 设定列的名称和宽度，_l 为列表渲染函数。
            this._l(this.columns, column =>
              <col
                name={ column.id }
                width={ column.realWidth || column.width }
              />)
          }
        </colgroup>
        <tbody>
          {
            // 根据表格数据逐行渲染
            this._l(this.data, (row, $index) =>
              [<tr
                style={ this.rowStyle ? this.getRowStyle(row, $index) : null }
                key={ this.table.rowKey ? this.getKeyOfRow(row, $index) : $index }
                on-dblclick={ ($event) => this.handleDoubleClick($event, row) }
                on-click={ ($event) => this.handleClick($event, row) }
                on-contextmenu={ ($event) => this.handleContextMenu($event, row) }
                on-mouseenter={ _ => this.handleMouseEnter($index) }
                on-mouseleave={ _ => this.handleMouseLeave() }
                class={ [this.getRowClass(row, $index)] }>
                {
                  // 根据列逐单元格渲染
                  this._l(this.columns, (column, cellIndex) =>
                    <td
                      class={ [column.id, column.align, column.className || '', columnsHidden[cellIndex] ? 'is-hidden' : '' ] }
                      on-mouseenter={ ($event) => this.handleCellMouseEnter($event, row) }
                      on-mouseleave={ this.handleCellMouseLeave }>
                      {
                        // 渲染单元格内容
                        column.renderCell.call(this._renderProxy, h, { row, column, $index, store: this.store, _self: this.context || this.table.$vnode.context }, columnsHidden[cellIndex])
                      }
                    </td>
                  )
                }
                {
                  // 若为固定列容器则在最右边显示滚动槽
                  !this.fixed && this.layout.scrollY && this.layout.gutterWidth ? <td class="gutter" /> : ''
                }
              </tr>,
                // 显示展开面板
                this.store.states.expandRows.indexOf(row) > -1
                ? (<tr>
                    <td colspan={ this.columns.length } class="el-table__expanded-cell">
                      { this.table.renderExpanded ? this.table.renderExpanded(h, { row, $index, store: this.store }) : ''}
                    </td>
                  </tr>)
                : ''
              ]
            )
          }
        </tbody>
      </table>
    );
  },

  watch: {
    // 观察鼠标选定行变化
    'store.states.hoverRow'(newVal, oldVal) {
      if (!this.store.states.isComplex) return;
      const el = this.$el;
      if (!el) return;
      const rows = el.querySelectorAll('tbody > tr');
      const oldRow = rows[oldVal];
      const newRow = rows[newVal];
      if (oldRow) {
        oldRow.classList.remove('hover-row');
      }
      if (newRow) {
        newRow.classList.add('hover-row');
      }
    },
    // 观测当前行变化
    'store.states.currentRow'(newVal, oldVal) {
      if (!this.highlight) return;
      const el = this.$el;
      if (!el) return;
      const data = this.store.states.data;
      const rows = el.querySelectorAll('tbody > tr');
      const oldRow = rows[data.indexOf(oldVal)];
      const newRow = rows[data.indexOf(newVal)];
      if (oldRow) {
        oldRow.classList.remove('current-row');
      } else if (rows) {
        [].forEach.call(rows, row => row.classList.remove('current-row'));
      }
      if (newRow) {
        newRow.classList.add('current-row');
      }
    }
  },

  computed: {
    // 获取父组件即表格
    table() {
      return this.$parent;
    },
    // 获取表格数据源
    data() {
      return this.store.states.data;
    },
    // 获取列的数量
    columnsCount() {
      return this.store.states.columns.length;
    },
    // 获取左侧固定列数量
    leftFixedCount() {
      return this.store.states.fixedColumns.length;
    },
    // 获取右侧固定列数量
    rightFixedCount() {
      return this.store.states.rightFixedColumns.length;
    },
    // 获取列对象
    columns() {
      return this.store.states.columns;
    }
  },

  data() {
    return {
      // 是否禁用 tooltip
      tooltipDisabled: true
    };
  },

  methods: {
    /**
     * 获取行的键值
     * @param {Object} row 行对象
     * @param {Number} index 行序号
     */
    getKeyOfRow(row, index) {
      const rowKey = this.table.rowKey;
      if (rowKey) {
        return getRowIdentity(row, rowKey);
      }
      return index;
    },
    /**
     * 判断列是否隐藏，用于隐藏非固定列
     * @param {Number} index 列序号
     */
    isColumnHidden(index) {
      if (this.fixed === true || this.fixed === 'left') {
        return index >= this.leftFixedCount;
      } else if (this.fixed === 'right') {
        return index < this.columnsCount - this.rightFixedCount;
      } else {
        return (index < this.leftFixedCount) || (index >= this.columnsCount - this.rightFixedCount);
      }
    },
    /**
     * 根据表格 row-style 属性获取行的样式
     * @param {Object} row 行对象
     * @param {Number} index 行序号
     */
    getRowStyle(row, index) {
      const rowStyle = this.rowStyle;
      if (typeof rowStyle === 'function') {
        return rowStyle.call(null, row, index);
      }
      return rowStyle;
    },
    /**
     * 根据表格 row-class-name 属性获取行的样式类名
     * @param {Object} row 行对象
     * @param {Number} index 行序号
     */
    getRowClass(row, index) {
      const classes = [];

      const rowClassName = this.rowClassName;
      if (typeof rowClassName === 'string') {
        classes.push(rowClassName);
      } else if (typeof rowClassName === 'function') {
        classes.push(rowClassName.call(null, row, index) || '');
      }

      return classes.join(' ');
    },
    /**
     * 处理鼠标悬停单元格事件，触发 cell-mouse-enter 事件并显示 tooltip。
     * @param {Object} event 事件对象
     * @param {Number} index 行序号
     */
    handleCellMouseEnter(event, row) {
      const table = this.table;
      const cell = getCell(event);

      if (cell) {
        const column = getColumnByCell(table, cell);
        const hoverState = table.hoverState = {cell, column, row};
        table.$emit('cell-mouse-enter', hoverState.row, hoverState.column, hoverState.cell, event);
      }

      // 判断是否text-overflow, 如果是就显示tooltip
      const cellChild = event.target.querySelector('.cell');

      this.tooltipDisabled = cellChild.scrollWidth <= cellChild.offsetWidth;
    },
    /**
     * 处理鼠标离开单元格事件，触发 cell-mouse-leave 事件。
     * @param {Object} event 事件对象
     */
    handleCellMouseLeave(event) {
      const cell = getCell(event);
      if (!cell) return;

      const oldHoverState = this.table.hoverState;
      this.table.$emit('cell-mouse-leave', oldHoverState.row, oldHoverState.column, oldHoverState.cell, event);
    },
    /**
     * 处理鼠标进入行事件
     * @param {Number} index 行序号
     */
    handleMouseEnter(index) {
      this.store.commit('setHoverRow', index);
    },
    /**
     * 处理鼠标离开行事件
     */
    handleMouseLeave() {
      this.store.commit('setHoverRow', null);
    },
    /**
     * 处理右键菜单事件
     * @param {Object} event 事件对象
     * @param {Number} index 行序号
     */
    handleContextMenu(event, row) {
      this.handleEvent(event, row, 'contextmenu');
    },
    /**
     * 处理行的双击事件
     * @param {Object} event 事件对象
     * @param {Number} index 行序号
     */
    handleDoubleClick(event, row) {
      this.handleEvent(event, row, 'dblclick');
    },
    /**
     * 处理行的单击事件
     * @param {Object} event 事件对象
     * @param {Number} index 行序号
     */
    handleClick(event, row) {
      this.store.commit('setCurrentRow', row);
      this.handleEvent(event, row, 'click');
    },
    /**
     * 事件公共处理函数
     * @param {Object} event 事件对象
     * @param {Number} index 行序号
     * @param {String} name 事件名称
     */
    handleEvent(event, row, name) {
      const table = this.table;
      const cell = getCell(event);
      let column;
      if (cell) {
        column = getColumnByCell(table, cell);
        if (column) {
          table.$emit(`cell-${name}`, row, column, cell, event);
        }
      }
      table.$emit(`row-${name}`, row, event, column);
    },
    /**
     * 处理展开按钮点击事件
     * @param {Object} row 行对象
     */
    handleExpandClick(row) {
      this.store.commit('toggleRowExpanded', row);
    }
  }
};
