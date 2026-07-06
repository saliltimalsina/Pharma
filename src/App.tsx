import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProcurementProvider } from './procurement/store/ProcurementStore';
import { InventoryProvider } from './inventory/store/InventoryStore';
import { FinanceProvider } from './finance/store/FinanceStore';
import Dashboard from './dashboard/Dashboard';
import ProcurementDashboard from './procurement/pages/dashboard/ProcurementDashboard';
import RequisitionList from './procurement/pages/requisitions/RequisitionList';
import RequisitionForm from './procurement/pages/requisitions/RequisitionForm';
import RequisitionDetail from './procurement/pages/requisitions/RequisitionDetail';
import VendorList from './procurement/pages/vendors/VendorList';
import VendorForm from './procurement/pages/vendors/VendorForm';
import VendorProfile from './procurement/pages/vendors/VendorProfile';
import RFQList from './procurement/pages/rfq/RFQList';
import RFQForm from './procurement/pages/rfq/RFQForm';
import RFQDetail from './procurement/pages/rfq/RFQDetail';
import POList from './procurement/pages/purchase-orders/POList';
import POForm from './procurement/pages/purchase-orders/POForm';
import PODetail from './procurement/pages/purchase-orders/PODetail';
import GRNList from './procurement/pages/grn/GRNList';
import GRNForm from './procurement/pages/grn/GRNForm';
import GRNDetail from './procurement/pages/grn/GRNDetail';
import ProcurementReports from './procurement/pages/reports/ProcurementReports';
import InventoryDashboard from './inventory/pages/dashboard/InventoryDashboard';
import ItemList from './inventory/pages/items/ItemList';
import ItemForm from './inventory/pages/items/ItemForm';
import ItemDetail from './inventory/pages/items/ItemDetail';
import WarehouseList from './inventory/pages/warehouses/WarehouseList';
import WarehouseProfile from './inventory/pages/warehouses/WarehouseProfile';
import StockList from './inventory/pages/stock/StockList';
import StockInForm from './inventory/pages/stock/StockInForm';
import StockDetail from './inventory/pages/stock/StockDetail';
import BatchList from './inventory/pages/batches/BatchList';
import BatchForm from './inventory/pages/batches/BatchForm';
import BatchDetail from './inventory/pages/batches/BatchDetail';
import TransferList from './inventory/pages/transfers/TransferList';
import TransferForm from './inventory/pages/transfers/TransferForm';
import TransferDetail from './inventory/pages/transfers/TransferDetail';
import AdjustmentList from './inventory/pages/adjustments/AdjustmentList';
import AdjustmentForm from './inventory/pages/adjustments/AdjustmentForm';
import AdjustmentDetail from './inventory/pages/adjustments/AdjustmentDetail';
import ExpiryMonitoring from './inventory/pages/expiry/ExpiryMonitoring';
import InventoryReports from './inventory/pages/reports/InventoryReports';
import FinanceDashboard from './finance/pages/dashboard/FinanceDashboard';
import InvoiceList from './finance/pages/invoices/InvoiceList';
import InvoiceForm from './finance/pages/invoices/InvoiceForm';
import InvoiceDetail from './finance/pages/invoices/InvoiceDetail';
import BillList from './finance/pages/bills/BillList';
import BillForm from './finance/pages/bills/BillForm';
import BillDetail from './finance/pages/bills/BillDetail';
import PaymentList from './finance/pages/payments/PaymentList';
import PaymentForm from './finance/pages/payments/PaymentForm';
import PaymentDetail from './finance/pages/payments/PaymentDetail';
import AccountingHub from './finance/pages/accounting/AccountingHub';
import JournalEntryForm from './finance/pages/accounting/JournalEntryForm';
import BankingHub from './finance/pages/banking/BankingHub';
import TaxesHub from './finance/pages/taxes/TaxesHub';
import FinancialReports from './finance/pages/reports/FinancialReports';

function App() {
  return (
    <ProcurementProvider>
      <InventoryProvider>
        <FinanceProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Dashboard />}>
                <Route index element={<ProcurementDashboard />} />
                <Route path="dashboard" element={<ProcurementDashboard />} />
                <Route path="procurement" element={<ProcurementDashboard />} />

                <Route path="procurement/requisitions" element={<RequisitionList />} />
                <Route path="procurement/requisitions/new" element={<RequisitionForm />} />
                <Route path="procurement/requisitions/:id" element={<RequisitionDetail />} />

                <Route path="procurement/vendors" element={<VendorList />} />
                <Route path="procurement/vendors/new" element={<VendorForm />} />
                <Route path="procurement/vendors/:id" element={<VendorProfile />} />

                <Route path="procurement/rfqs" element={<RFQList />} />
                <Route path="procurement/rfqs/new" element={<RFQForm />} />
                <Route path="procurement/rfqs/:id" element={<RFQDetail />} />

                <Route path="procurement/purchase-orders" element={<POList />} />
                <Route path="procurement/purchase-orders/new" element={<POForm />} />
                <Route path="procurement/purchase-orders/:id" element={<PODetail />} />

                <Route path="procurement/grn" element={<GRNList />} />
                <Route path="procurement/grn/new" element={<GRNForm />} />
                <Route path="procurement/grn/:id" element={<GRNDetail />} />

                <Route path="procurement/reports" element={<ProcurementReports />} />

                <Route path="inventory" element={<InventoryDashboard />} />

                <Route path="inventory/items" element={<ItemList />} />
                <Route path="inventory/items/new" element={<ItemForm />} />
                <Route path="inventory/items/:id" element={<ItemDetail />} />

                <Route path="inventory/warehouses" element={<WarehouseList />} />
                <Route path="inventory/warehouses/:id" element={<WarehouseProfile />} />

                <Route path="inventory/stock" element={<StockList />} />
                <Route path="inventory/stock/new" element={<StockInForm />} />
                <Route path="inventory/stock/:id" element={<StockDetail />} />

                <Route path="inventory/batches" element={<BatchList />} />
                <Route path="inventory/batches/new" element={<BatchForm />} />
                <Route path="inventory/batches/:id" element={<BatchDetail />} />

                <Route path="inventory/transfers" element={<TransferList />} />
                <Route path="inventory/transfers/new" element={<TransferForm />} />
                <Route path="inventory/transfers/:id" element={<TransferDetail />} />

                <Route path="inventory/adjustments" element={<AdjustmentList />} />
                <Route path="inventory/adjustments/new" element={<AdjustmentForm />} />
                <Route path="inventory/adjustments/:id" element={<AdjustmentDetail />} />

                <Route path="inventory/expiry" element={<ExpiryMonitoring />} />
                <Route path="inventory/reports" element={<InventoryReports />} />

                <Route path="finance" element={<FinanceDashboard />} />

                <Route path="finance/invoices" element={<InvoiceList />} />
                <Route path="finance/invoices/new" element={<InvoiceForm />} />
                <Route path="finance/invoices/:id" element={<InvoiceDetail />} />

                <Route path="finance/bills" element={<BillList />} />
                <Route path="finance/bills/new" element={<BillForm />} />
                <Route path="finance/bills/:id" element={<BillDetail />} />

                <Route path="finance/payments" element={<PaymentList />} />
                <Route path="finance/payments/new" element={<PaymentForm />} />
                <Route path="finance/payments/:id" element={<PaymentDetail />} />

                <Route path="finance/accounting" element={<AccountingHub />} />
                <Route path="finance/accounting/journal/new" element={<JournalEntryForm />} />

                <Route path="finance/banking" element={<BankingHub />} />
                <Route path="finance/taxes" element={<TaxesHub />} />
                <Route path="finance/reports" element={<FinancialReports />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </FinanceProvider>
      </InventoryProvider>
    </ProcurementProvider>
  );
}

export default App;
