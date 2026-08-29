import {createSlice, type PayloadAction} from '@reduxjs/toolkit';

/** The order-inbox tab and the catalog filters, kept out of screen state so a
 *  back-navigation lands on the tab the supplier was last looking at. */
export interface FilterState {
  orderTab: string;
  catalogSearch: string;
  catalogCategoryId: number | null;
  catalogBrandId: number | null;
  catalogLowStockOnly: boolean;
  ticketTab: 'live' | 'closed';
  disputeTab: 'live' | 'closed';
}

const initialState: FilterState = {
  orderTab: 'new',
  catalogSearch: '',
  catalogCategoryId: null,
  catalogBrandId: null,
  catalogLowStockOnly: false,
  ticketTab: 'live',
  disputeTab: 'live',
};

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setOrderTab: (state, action: PayloadAction<string>) => {
      state.orderTab = action.payload;
    },
    setCatalogSearch: (state, action: PayloadAction<string>) => {
      state.catalogSearch = action.payload;
    },
    setCatalogCategory: (state, action: PayloadAction<number | null>) => {
      state.catalogCategoryId = action.payload;
    },
    setCatalogBrand: (state, action: PayloadAction<number | null>) => {
      state.catalogBrandId = action.payload;
    },
    setCatalogLowStock: (state, action: PayloadAction<boolean>) => {
      state.catalogLowStockOnly = action.payload;
    },
    setTicketTab: (state, action: PayloadAction<'live' | 'closed'>) => {
      state.ticketTab = action.payload;
    },
    setDisputeTab: (state, action: PayloadAction<'live' | 'closed'>) => {
      state.disputeTab = action.payload;
    },
    resetCatalogFilters: state => {
      state.catalogSearch = '';
      state.catalogCategoryId = null;
      state.catalogBrandId = null;
      state.catalogLowStockOnly = false;
    },
  },
});

export const {
  setOrderTab,
  setCatalogSearch,
  setCatalogCategory,
  setCatalogBrand,
  setCatalogLowStock,
  setTicketTab,
  setDisputeTab,
  resetCatalogFilters,
} = filterSlice.actions;

export default filterSlice.reducer;
