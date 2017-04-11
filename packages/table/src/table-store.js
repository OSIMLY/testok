import Vue from 'vue';
import debounce from 'throttle-debounce/debounce';
import { orderBy, getColumnById, getRowIdentity } from './util';
/**
 * 表格数据排序
 * @param {Object} data 
 * @param {Object} states 
 */
const sortData = (data, states) => {
  const sortingColumn = states.sortingColumn;
  if (!sortingColumn || typeof sortingColumn.sortable === 'string') {
    return data;
  }
  return orderBy(data, states.sortProp, states.sortOrder, sortingColumn.sortMethod);
};
/**
 * 从行集合中提取某个属性的集合
 * @param {Array} array 行集合
 * @param {String} rowKey 属性名称
 */
const getKeysMap = function(array, rowKey) {
  const arrayMap = {};
  (array || []).forEach((row, index) => {
    arrayMap[getRowIdentity(row, rowKey)] = { row, index };
  });
  return arrayMap;
};
/**
 * 切换行的选中状态
 * @param {Object} states 表格状态对象
 * @param {Object} row 行对象
 * @param {Boolean} selected 选中状态
 */
const toggleRowSelection = function(states, row, selected) {
  let changed = false;
  const selection = states.selection;
  const index = selection.indexOf(row);
  if (typeof selected === 'undefined') {
    if (index === -1) {
      selection.push(row);
      changed = true;
    } else {
      selection.splice(index, 1);
      changed = true;
    }
  } else {
    if (selected && index === -1) {
      selection.push(row);
      changed = true;
    } else if (!selected && index > -1) {
      selection.splice(index, 1);
      changed = true;
    }
  }

  return changed;
};
/**
 * 表格状态存储对象
 * @param {Object} table 表格对象
 * @param {Object} initialState 状态初始化对象
 */
const TableStore = function(table, initialState = {}) {
  if (!table) {
    throw new Error('Table is required.');
  }
  this.table = table;

  this.states = {
    // 行对象属性名
    rowKey: null,
    // 列集合的副本
    _columns: [],
    // 根级列集合
    originColumns: [],
    // 全部子列集合
    columns: [],
    // 左侧固定列集合
    fixedColumns: [],
    // 右侧固定列集合
    rightFixedColumns: [],
    // 是否含有多级表头
    isComplex: false,
    // 表格数据源副本，用于数据处理
    _data: null,
    // 排序后的表格数据
    filteredData: null,
    // 表格数据源
    data: null,
    // 排序的列对象
    sortingColumn: null,
    // 排序的字段名
    sortProp: null,
    // 排序方式
    sortOrder: null,
    // 是否全选
    isAllSelected: false,
    // 行的选择集
    selection: [],
    // 是否保留之前的数据选项
    reserveSelection: false,
    // 选择列处理行可选状态的函数
    selectable: null,
    // 当前行
    currentRow: null,
    // 鼠标悬停的行
    hoverRow: null,
    // 筛选值的集合
    filters: {},
    // 展开的行集合
    expandRows: [],
    // 默认全部展开
    defaultExpandAll: false,
    // 新增汇总列
    summary: null
  };
  // 根据初始值设置状态对象
  for (let prop in initialState) {
    if (initialState.hasOwnProperty(prop) && this.states.hasOwnProperty(prop)) {
      this.states[prop] = initialState[prop];
    }
  }
};
/**
 * 表格状态修改，类似于 VueX，通过 mutations 修改数据
 */
TableStore.prototype.mutations = {
  /**
   * 重设表格数据源
   * @param {Object} states 表格状态对象
   * @param {Object} data 表格数据源
   */
  setData(states, data) {
    const dataInstanceChanged = states._data !== data;
    states._data = data;
    states.data = sortData((data || []), states);

    // states.data.forEach((item) => {
    //   if (!item.$extra) {
    //     Object.defineProperty(item, '$extra', {
    //       value: {},
    //       enumerable: false
    //     });
    //   }
    // });

    this.updateCurrentRow();

    if (!states.reserveSelection) {
      if (dataInstanceChanged) {
        this.clearSelection();
      } else {
        this.cleanSelection();
      }
      this.updateAllSelected();
    } else {
      const rowKey = states.rowKey;
      if (rowKey) {
        const selection = states.selection;
        const selectedMap = getKeysMap(selection, rowKey);

        states.data.forEach((row) => {
          const rowId = getRowIdentity(row, rowKey);
          const rowInfo = selectedMap[rowId];
          if (rowInfo) {
            selection[rowInfo.index] = row;
          }
        });

        this.updateAllSelected();
      } else {
        console.warn('WARN: rowKey is required when reserve-selection is enabled.');
      }
    }

    const defaultExpandAll = states.defaultExpandAll;
    if (defaultExpandAll) {
      this.states.expandRows = (states.data || []).slice(0);
    }

    Vue.nextTick(() => this.table.updateScrollY());
  },
  /**
   * 更新排序状态
   * @param {Object} states 表格状态对象
   */
  changeSortCondition(states) {
    states.data = sortData((states.filteredData || states._data || []), states);

    this.table.$emit('sort-change', {
      column: this.states.sortingColumn,
      prop: this.states.sortProp,
      order: this.states.sortOrder
    });

    Vue.nextTick(() => this.table.updateScrollY());
  },
  /**
   * 更新筛选状态
   * @param {Object} states 表格状态对象
   * @param {Object} options 选项对象
   */
  filterChange(states, options) {
    let { column, values } = options;
    if (values && !Array.isArray(values)) {
      values = [values];
    }

    const prop = column.property;
    const filters = [];

    if (prop) {
      states.filters[column.id] = values;
      filters[column.columnKey || column.id] = values;
    }

    let data = states._data;

    Object.keys(states.filters).forEach((columnId) => {
      const values = states.filters[columnId];
      if (!values || values.length === 0) return;
      const column = getColumnById(this.states, columnId);
      if (column && column.filterMethod) {
        data = data.filter((row) => {
          return values.some(value => column.filterMethod.call(null, value, row));
        });
      }
    });

    states.filteredData = data;
    states.data = sortData(data, states);

    this.table.$emit('filter-change', filters);

    Vue.nextTick(() => this.table.updateScrollY());
  },
  /**
   * 动态插入列
   * @param {Object} states 表格状态对象
   * @param {Object} column 列对象
   * @param {Number} index 序号
   * @param {Object} parent 父组件
   */
  insertColumn(states, column, index, parent) {
    let array = states._columns;
    if (parent) {
      array = parent.children;
      if (!array) array = parent.children = [];
    }

    if (typeof index !== 'undefined') {
      array.splice(index, 0, column);
    } else {
      array.push(column);
    }

    if (column.type === 'selection') {
      states.selectable = column.selectable;
      states.reserveSelection = column.reserveSelection;
    }

    this.scheduleLayout();
  },
  /**
   * 动态移除列
   * @param {Object} states 表格状态对象
   * @param {Object} column 列对象
   */
  removeColumn(states, column) {
    let _columns = states._columns;
    if (_columns) {
      _columns.splice(_columns.indexOf(column), 1);
    }

    this.scheduleLayout();
  },
  /**
   * 设置鼠标悬停行
   * @param {Object} states 表格状态对象
   * @param {Object} row 行对象
   */
  setHoverRow(states, row) {
    states.hoverRow = row;
  },
  /**
   * 设置单选行
   * @param {Object} states 表格状态对象
   * @param {Object} row 行对象
   */
  setCurrentRow(states, row) {
    const oldCurrentRow = states.currentRow;
    states.currentRow = row;

    if (oldCurrentRow !== row) {
      this.table.$emit('current-change', row, oldCurrentRow);
    }
  },
  /**
   * 刷新行的选择集
   * @param {Object} states 表格状态对象
   * @param {Object} row 行对象
   */
  rowSelectedChanged(states, row) {
    const changed = toggleRowSelection(states, row);
    const selection = states.selection;

    if (changed) {
      const table = this.table;
      table.$emit('selection-change', selection);
      table.$emit('select', selection, row);
    }

    this.updateAllSelected();
  },
  /**
   * 切换行的展开状态
   * @param {Object} states 表格状态对象
   * @param {Object} row 行对象
   * @param {Boolean} expanded 展开状态
   */
  toggleRowExpanded: function(states, row, expanded) {
    const expandRows = states.expandRows;
    if (typeof expanded !== 'undefined') {
      const index = expandRows.indexOf(row);
      if (expanded) {
        if (index === -1) expandRows.push(row);
      } else {
        if (index !== -1) expandRows.splice(index, 1);
      }
    } else {
      const index = expandRows.indexOf(row);
      if (index === -1) {
        expandRows.push(row);
      } else {
        expandRows.splice(index, 1);
      }
    }
    this.table.$emit('expand', row, expandRows.indexOf(row) !== -1);
  },
  /**
   * 切换全部行展开状态，通过节流函数调用
   * @param {Object} states 表格状态对象
   */
  toggleAllSelection: debounce(10, function(states) {
    const data = states.data || [];
    const value = !states.isAllSelected;
    const selection = this.states.selection;
    let selectionChanged = false;

    data.forEach((item, index) => {
      if (states.selectable) {
        if (states.selectable.call(null, item, index) && toggleRowSelection(states, item, value)) {
          selectionChanged = true;
        }
      } else {
        if (toggleRowSelection(states, item, value)) {
          selectionChanged = true;
        }
      }
    });

    const table = this.table;
    if (selectionChanged) {
      table.$emit('selection-change', selection);
    }
    table.$emit('select-all', selection);
    states.isAllSelected = value;
  })
};
/**
 * 递归获取所有子列
 * @param {Object} columns 列对象
 */
const doFlattenColumns = (columns) => {
  const result = [];
  columns.forEach((column) => {
    if (column.children) {
      result.push.apply(result, doFlattenColumns(column.children));
    } else {
      result.push(column);
    }
  });
  return result;
};
// 以下为 TableStore 实例的公共方法
/**
 * 更新状态对象中所有与列相关的属性
 */
TableStore.prototype.updateColumns = function() {
  const states = this.states;
  const _columns = states._columns || [];
  states.fixedColumns = _columns.filter((column) => column.fixed === true || column.fixed === 'left');
  states.rightFixedColumns = _columns.filter((column) => column.fixed === 'right');

  if (states.fixedColumns.length > 0 && _columns[0] && _columns[0].type === 'selection' && !_columns[0].fixed) {
    _columns[0].fixed = true;
    states.fixedColumns.unshift(_columns[0]);
  }
  states.originColumns = [].concat(states.fixedColumns).concat(_columns.filter((column) => !column.fixed)).concat(states.rightFixedColumns);
  states.columns = doFlattenColumns(states.originColumns);
  states.isComplex = states.fixedColumns.length > 0 || states.rightFixedColumns.length > 0;
};
/**
 * 判断行是否选中
 * @param {Object} row 行对象
 */
TableStore.prototype.isSelected = function(row) {
  return (this.states.selection || []).indexOf(row) > -1;
};
/**
 * 清除选择集
 */
TableStore.prototype.clearSelection = function() {
  const states = this.states;
  states.isAllSelected = false;
  const oldSelection = states.selection;
  states.selection = [];
  if (oldSelection.length > 0) {
    this.table.$emit('selection-change', states.selection);
  }
};
/**
 * 通过属性名集合设置展开行
 * @param {Array} rowKeys 属性名集合
 */
TableStore.prototype.setExpandRowKeys = function(rowKeys) {
  const expandRows = [];
  const data = this.states.data;
  const rowKey = this.states.rowKey;
  if (!rowKey) throw new Error('[Table] prop row-key should not be empty.');
  const keysMap = getKeysMap(data, rowKey);
  rowKeys.forEach((key) => {
    const info = keysMap[key];
    if (info) {
      expandRows.push(info.row);
    }
  });

  this.states.expandRows = expandRows;
};
/**
 * 切换行的选中状态
 * @param {Object} row 行对象
 * @param {Boolean} selected 选中状态
 */
TableStore.prototype.toggleRowSelection = function(row, selected) {
  const changed = toggleRowSelection(this.states, row, selected);
  if (changed) {
    this.table.$emit('selection-change', this.states.selection);
  }
};
/**
 * 清除选择集
 */
TableStore.prototype.cleanSelection = function() {
  const selection = this.states.selection || [];
  const data = this.states.data;
  const rowKey = this.states.rowKey;
  let deleted;
  if (rowKey) {
    deleted = [];
    const selectedMap = getKeysMap(selection, rowKey);
    const dataMap = getKeysMap(data, rowKey);
    for (let key in selectedMap) {
      if (selectedMap.hasOwnProperty(key) && !dataMap[key]) {
        deleted.push(selectedMap[key].row);
      }
    }
  } else {
    deleted = selection.filter((item) => {
      return data.indexOf(item) === -1;
    });
  }

  deleted.forEach((deletedItem) => {
    selection.splice(selection.indexOf(deletedItem), 1);
  });

  if (deleted.length) {
    this.table.$emit('selection-change', selection);
  }
};
/**
 * 更新全选状态
 */
TableStore.prototype.updateAllSelected = function() {
  const states = this.states;
  const { selection, rowKey, selectable, data } = states;
  if (!data || data.length === 0) {
    states.isAllSelected = false;
    return;
  }

  let selectedMap;
  if (rowKey) {
    selectedMap = getKeysMap(states.selection, rowKey);
  }

  const isSelected = function(row) {
    if (selectedMap) {
      return !!selectedMap[getRowIdentity(row, rowKey)];
    } else {
      return selection.indexOf(row) !== -1;
    }
  };

  let isAllSelected = true;
  let selectedCount = 0;
  for (let i = 0, j = data.length; i < j; i++) {
    const item = data[i];
    if (selectable) {
      const isRowSelectable = selectable.call(null, item, i);
      if (isRowSelectable) {
        if (!isSelected(item)) {
          isAllSelected = false;
          break;
        } else {
          selectedCount++;
        }
      }
    } else {
      if (!isSelected(item)) {
        isAllSelected = false;
        break;
      } else {
        selectedCount++;
      }
    }
  }

  if (selectedCount === 0) isAllSelected = false;

  states.isAllSelected = isAllSelected;
};
/**
 * 刷新表格布局
 */
TableStore.prototype.scheduleLayout = function() {
  this.table.debouncedLayout();
};
/**
 * 设置当前行键
 */
TableStore.prototype.setCurrentRowKey = function(key) {
  const states = this.states;
  const rowKey = states.rowKey;
  if (!rowKey) throw new Error('[Table] row-key should not be empty.');
  const data = states.data || [];
  const keysMap = getKeysMap(data, rowKey);
  const info = keysMap[key];
  if (info) {
    states.currentRow = info.row;
  }
};
/**
 * 更新当前行
 */
TableStore.prototype.updateCurrentRow = function() {
  const states = this.states;
  const table = this.table;
  const data = states.data || [];
  const oldCurrentRow = states.currentRow;

  if (data.indexOf(oldCurrentRow) === -1) {
    states.currentRow = null;

    if (states.currentRow !== oldCurrentRow) {
      table.$emit('current-change', null, oldCurrentRow);
    }
  }
};
/**
 * 表格状态提交修改
 */
TableStore.prototype.commit = function(name, ...args) {
  const mutations = this.mutations;
  if (mutations[name]) {
    mutations[name].apply(this, [this.states].concat(args));
  } else {
    throw new Error(`Action not found: ${name}`);
  }
};

export default TableStore;
