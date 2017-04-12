<template>
  <transition name="el-zoom-in-top">
    <!--多项筛选面板-->
    <div class="el-table-filter" v-if="multiple" v-show="showPopper">
      <!--选项列表-->
      <div class="el-table-filter__content">
        <el-checkbox-group class="el-table-filter__checkbox-group" v-model="filteredValue">
          <el-checkbox
            v-for="filter in filters"
            :label="filter.value">{{ filter.text }}</el-checkbox>
        </el-checkbox-group>
      </div>
      <!--按钮-->
      <div class="el-table-filter__bottom">
        <!--确认-->
        <button @click="handleConfirm"
          :class="{ 'is-disabled': filteredValue.length === 0 }"
          :disabled="filteredValue.length === 0">{{ t('el.table.confirmFilter') }}</button>
        <!--重置-->
        <button @click="handleReset">{{ t('el.table.resetFilter') }}</button>
      </div>
    </div>
    <!--单项筛选面板-->
    <div class="el-table-filter" v-else v-show="showPopper">
      <ul class="el-table-filter__list">
        <!--清除筛选-->
        <li class="el-table-filter__list-item"
            :class="{ 'is-active': !filterValue }"
            @click="handleSelect(null)">{{ t('el.table.clearFilter') }}</li>
        <!--选项列表-->
        <li class="el-table-filter__list-item"
            v-for="filter in filters"
            :label="filter.value"
            :class="{ 'is-active': isActive(filter) }"
            @click="handleSelect(filter.value)" >{{ filter.text }}</li>
      </ul>
    </div>
  </transition>
</template>

<script type="text/babel">
  import Popper from 'element-ui/src/utils/vue-popper';
  import Locale from 'element-ui/src/mixins/locale';
  import Clickoutside from 'element-ui/src/utils/clickoutside';
  import Dropdown from './dropdown';
  import ElCheckbox from 'element-ui/packages/checkbox';
  import ElCheckboxGroup from 'element-ui/packages/checkbox-group';

  export default {
    name: 'ElTableFilterPanel',

    mixins: [Popper, Locale],

    directives: {
      Clickoutside
    },

    components: {
      ElCheckbox,
      ElCheckboxGroup
    },

    props: {
      placement: {
        type: String,
        default: 'bottom-end'
      }
    },

    customRender(h) {
      return (<div class="el-table-filter">
        <div class="el-table-filter__content">
        </div>
        <div class="el-table-filter__bottom">
          <button on-click={ this.handleConfirm }>{ this.t('el.table.confirmFilter') }</button>
          <button on-click={ this.handleReset }>{ this.t('el.table.resetFilter') }</button>
        </div>
      </div>);
    },

    methods: {
      /**
       * 获取显示状态
       */
      isActive(filter) {
        return filter.value === this.filterValue;
      },
      /**
       * 处理外部点击指令
       */
      handleOutsideClick() {
        this.showPopper = false;
      },
      /**
       * 处理确认按钮点击事件
       */
      handleConfirm() {
        this.confirmFilter(this.filteredValue);
        this.handleOutsideClick();
      },
      /**
       * 处理重置按钮点击事件
       */
      handleReset() {
        this.filteredValue = [];
        this.confirmFilter(this.filteredValue);
        this.handleOutsideClick();
      },
      /**
       * 处理点击选项事件
       */
      handleSelect(filterValue) {
        this.filterValue = filterValue;

        if ((typeof filterValue !== 'undefined') && (filterValue !== null)) {
          this.confirmFilter(this.filteredValue);
        } else {
          this.confirmFilter([]);
        }

        this.handleOutsideClick();
      },
      /**
       * 通过新筛选对象更新表格状态
       */
      confirmFilter(filteredValue) {
        this.table.store.commit('filterChange', {
          column: this.column,
          values: filteredValue
        });
      }
    },

    data() {
      return {
        table: null,
        cell: null,
        column: null
      };
    },

    computed: {
      filters() {
        return this.column && this.column.filters;
      },

      filterValue: {
        get() {
          return (this.column.filteredValue || [])[0];
        },
        set(value) {
          if (this.filteredValue) {
            if ((typeof value !== 'undefined') && (value !== null)) {
              this.filteredValue.splice(0, 1, value);
            } else {
              this.filteredValue.splice(0, 1);
            }
          }
        }
      },

      filteredValue: {
        get() {
          if (this.column) {
            return this.column.filteredValue || [];
          }
          return [];
        },
        set(value) {
          if (this.column) {
            this.column.filteredValue = value;
          }
        }
      },

      multiple() {
        if (this.column) {
          return this.column.filterMultiple;
        }
        return true;
      }
    },

    mounted() {
      this.popperElm = this.$el;
      this.referenceElm = this.cell;
      this.table.bodyWrapper.addEventListener('scroll', () => {
        this.updatePopper();
      });

      this.$watch('showPopper', (value) => {
        if (this.column) this.column.filterOpened = value;
        if (value) {
          Dropdown.open(this);
        } else {
          Dropdown.close(this);
        }
      });
    }
  };
</script>
