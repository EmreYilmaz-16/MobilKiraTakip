import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PropertyList from './pages/Properties/PropertyList';
import PropertyForm from './pages/Properties/PropertyForm';
import TenantList from './pages/Tenants/TenantList';
import TenantForm from './pages/Tenants/TenantForm';
import ContractList from './pages/Contracts/ContractList';
import ContractForm from './pages/Contracts/ContractForm';
import PaymentList from './pages/Payments/PaymentList';
import ExpenseList from './pages/Expenses/ExpenseList';
import MaintenanceList from './pages/Maintenance/MaintenanceList';
import Reports from './pages/Reports/Reports';
import MonthlyReport from './pages/Reports/MonthlyReport';
import LawyerList from './pages/Lawyers/LawyerList';
import MarketPriceList from './pages/MarketPrices/MarketPriceList';
import TaxList from './pages/Taxes/TaxList';
import IncomeList from './pages/Income/IncomeList';
import MoreMenu from './pages/More/MoreMenu';

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="properties" element={<PropertyList />} />
          <Route path="properties/new" element={<PropertyForm />} />
          <Route path="properties/:id/edit" element={<PropertyForm />} />
          <Route path="tenants" element={<TenantList />} />
          <Route path="tenants/new" element={<TenantForm />} />
          <Route path="tenants/:id/edit" element={<TenantForm />} />
          <Route path="contracts" element={<ContractList />} />
          <Route path="contracts/new" element={<ContractForm />} />
          <Route path="payments" element={<PaymentList />} />
          <Route path="expenses" element={<ExpenseList />} />
          <Route path="maintenance" element={<MaintenanceList />} />
          <Route path="reports" element={<Reports />} />
          <Route path="monthly-report" element={<MonthlyReport />} />
          <Route path="lawyers" element={<LawyerList />} />
          <Route path="market-prices" element={<MarketPriceList />} />
          <Route path="taxes" element={<TaxList />} />
          <Route path="income" element={<IncomeList />} />
          <Route path="more" element={<MoreMenu />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
