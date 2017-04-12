/**
 * 获取 <td> 单元格的 DOM 对象
 * @param {Object} event 事件对象
 */
export const getCell = function(event) {
  let cell = event.target;

  while (cell && cell.tagName.toUpperCase() !== 'HTML') {
    if (cell.tagName.toUpperCase() === 'TD') {
      return cell;
    }
    cell = cell.parentNode;
  }

  return null;
};
/**
 * 根据属性名称获取对象的键值，支持级联
 * @param {Object} object 数据对象
 * @param {String} prop 属性名称
 */
export const getValueByPath = function(object, prop) {
  prop = prop || '';
  const paths = prop.split('.');
  let current = object;
  let result = null;
  for (let i = 0, j = paths.length; i < j; i++) {
    const path = paths[i];
    if (!current) break;

    if (i === j - 1) {
      result = current[path];
      break;
    }
    current = current[path];
  }
  return result;
};
/**
 * 判断变量是否为对象
 * @param {*} obj 
 */
const isObject = function(obj) {
  return obj !== null && typeof obj === 'object';
};
/**
 * 数组排序函数，返回排序后的新数组实例
 * @param {Array} array 需要排序的数组
 * @param {String} sortKey 排序属性名
 * @param {String} reverse 排序方式
 * @param {Function} sortMethod 排序函数
 */
export const orderBy = function(array, sortKey, reverse, sortMethod) {
  if (typeof reverse === 'string') {
    reverse = reverse === 'descending' ? -1 : 1;
  }
  if (!sortKey) {
    return array;
  }
  const order = (reverse && reverse < 0) ? -1 : 1;

  // sort on a copy to avoid mutating original array
  return array.slice().sort(sortMethod ? function(a, b) {
    return sortMethod(a, b) ? order : -order;
  } : function(a, b) {
    if (sortKey !== '$key') {
      if (isObject(a) && '$value' in a) a = a.$value;
      if (isObject(b) && '$value' in b) b = b.$value;
    }
    a = isObject(a) ? getValueByPath(a, sortKey) : a;
    b = isObject(b) ? getValueByPath(b, sortKey) : b;
    return a === b ? 0 : a > b ? order : -order;
  });
};
/**
 * 根据列序号获取列对象
 * @param {Object} table 表格对象
 * @param {String} columnId 列序号
 */
export const getColumnById = function(table, columnId) {
  let column = null;
  table.columns.forEach(function(item) {
    if (item.id === columnId) {
      column = item;
    }
  });
  return column;
};
/**
 * 获取根据单元格 DOM 对象所在的列对象
 * @param {Object} table 表格对象
 * @param {Object} cell 单元格 DOM 对象
 */
export const getColumnByCell = function(table, cell) {
  const matches = (cell.className || '').match(/el-table_[^\s]+/gm);
  if (matches) {
    return getColumnById(table, matches[0]);
  }
  return null;
};
/**
 * 判断浏览器是否为 Firefox
 */
const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
/**
 * 为 DOM 元素添加鼠标滚动事件
 * @param {Object} element DOM 元素
 * @param {Function} callback 事件回调函数
 */
export const mousewheel = function(element, callback) {
  if (element && element.addEventListener) {
    element.addEventListener(isFirefox ? 'DOMMouseScroll' : 'mousewheel', callback);
  }
};
/**
 * 获取行的键值，键名由表格 'row-key' 属性定义
 * @param {*} row 行对象
 * @param {*} rowKey 键名
 */
export const getRowIdentity = (row, rowKey) => {
  if (!row) throw new Error('row is required when get row identity');
  if (typeof rowKey === 'string') {
    return row[rowKey];
  } else if (typeof rowKey === 'function') {
    return rowKey.call(null, row);
  }
};
