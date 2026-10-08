import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./state/AuthContext.jsx";
import { StoreLayout, AdminLayout } from "./components/Layout.jsx";

const HomePage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.HomePage,
  })),
);
const ShopPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.ShopPage,
  })),
);
const ProductPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.ProductPage,
  })),
);
const SignInPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.SignInPage,
  })),
);
const SignUpPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.SignUpPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const CartPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.CartPage,
  })),
);
const CheckoutPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.CheckoutPage,
  })),
);
const AccountPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.AccountPage,
  })),
);
const AdminProfilePage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.AdminProfilePage,
  })),
);
const OrdersPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.OrdersPage,
  })),
);
const AddressesPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.AddressesPage,
  })),
);
const WishlistPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.WishlistPage,
  })),
);
const AdminPages = () => import("./pages/AdminPages.jsx");
const AdminDashboard = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminDashboard })),
);
const AdminProducts = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminProducts })),
);
const AdminProductForm = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminProductForm })),
);
const AdminCategories = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminCategories })),
);
const AdminOrders = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminOrders })),
);
const AdminCustomers = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminCustomers })),
);
const AdminInventory = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminInventory })),
);
const AdminReviews = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminReviews })),
);
const AdminSettings = lazy(() =>
  AdminPages().then((module) => ({ default: module.AdminSettings })),
);

function AuthGuard({ admin = false }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="page-wait">
        <span className="spinner" />
        Checking your session
      </div>
    );
  if (!user)
    return <Navigate to="/signin" replace state={{ from: location }} />;
  if (!profile)
    return (
      <div className="page-wait">
        Your profile is not available. Refresh or contact the store
        administrator.
      </div>
    );
  if (admin && profile.role !== "admin")
    return <Navigate to="/account" replace />;
  if (!admin && profile.role === "admin")
    return <Navigate to="/admin/dashboard" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="page-wait">
          <span className="spinner" />
          Loading page
        </div>
      }
    >
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/category/:slug" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/orders" element={<OrdersPage />} />
            <Route path="/account/addresses" element={<AddressesPage />} />
            <Route path="/account/wishlist" element={<WishlistPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="/admin" element={<AuthGuard admin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="profile" element={<AdminProfilePage />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
