import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "./state/AuthContext.jsx";
import { StoreLayout, AdminLayout } from "./components/Layout.jsx";

const WELCOME_OFFER_DISMISSED_KEY = "ab-beauty-welcome-offer-dismissed";

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
const PaymentReturnPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.PaymentReturnPage,
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
const ReceiptPage = lazy(() =>
  import("./pages/StorePages.jsx").then((module) => ({
    default: module.ReceiptPage,
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
const InfoPages = () => import("./pages/InfoPages.jsx");
const AboutPage = lazy(() =>
  InfoPages().then((module) => ({ default: module.AboutPage })),
);
const ContactPage = lazy(() =>
  InfoPages().then((module) => ({ default: module.ContactPage })),
);
const FaqPage = lazy(() =>
  InfoPages().then((module) => ({ default: module.FaqPage })),
);
const CustomerReviewsPage = lazy(() =>
  InfoPages().then((module) => ({ default: module.CustomerReviewsPage })),
);
const PolicyPage = lazy(() =>
  InfoPages().then((module) => ({ default: module.PolicyPage })),
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

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function SitePreloader() {
  const [phase, setPhase] = useState("visible");
  const dismissed = useRef(false);

  function dismiss() {
    if (dismissed.current) return;
    dismissed.current = true;
    setPhase("leaving");
    window.setTimeout(() => setPhase("hidden"), 260);
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dismiss();
      return;
    }
    const timeout = window.setTimeout(dismiss, 2800);
    return () => window.clearTimeout(timeout);
  }, []);

  if (phase === "hidden") return null;
  return (
    <div
      className={`site-preloader ${phase === "leaving" ? "is-leaving" : ""}`}
      role="status"
      aria-label="Loading AB Beauty Conner"
    >
      <video
        src="/cart-preloader.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={dismiss}
        onError={dismiss}
      />
      <span className="sr-only">Loading AB Beauty Conner</span>
    </div>
  );
}

function WelcomeOfferPopup() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const popupRef = useRef(null);

  const eligiblePage =
    pathname === "/" ||
    pathname === "/shop" ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/product/");

  useEffect(() => {
    if (loading || user || !eligiblePage) return;
    try {
      if (window.localStorage.getItem(WELCOME_OFFER_DISMISSED_KEY)) return;
    } catch (error) {
      console.error("Unable to read welcome offer preference.", error);
    }

    const timer = window.setTimeout(() => setOpen(true), 6000);
    return () => window.clearTimeout(timer);
  }, [eligiblePage, loading, user]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        dismiss();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = popupRef.current?.querySelectorAll(
        "a[href], button:not([disabled])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(WELCOME_OFFER_DISMISSED_KEY, "true");
    } catch (error) {
      console.error("Unable to save welcome offer preference.", error);
    }
  }

  if (!open || user || !eligiblePage) return null;
  return (
    <div
      className="welcome-offer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <section
        ref={popupRef}
        className="welcome-offer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-offer-title"
      >
        <div className="welcome-offer-image">
          <img
            src="/images/ab.jpg"
            alt="AB Beauty Conner skincare and beauty"
          />
          <span>AB BEAUTY CONNER</span>
        </div>
        <div className="welcome-offer-content">
          <button
            ref={closeButtonRef}
            className="welcome-offer-close"
            type="button"
            aria-label="Close welcome offer"
            onClick={dismiss}
          >
            <X size={19} />
          </button>
          <span className="eyebrow">A LITTLE SOMETHING FOR YOU</span>
          <h2 id="welcome-offer-title">
            Welcome,
            <br />
            Enjoy <em>20% off</em>
            <br />
            your first order.
          </h2>
          <p>Discover beauty and style made to help you feel like yourself.</p>
          <Link
            className="button button-dark welcome-offer-cta"
            to="/"
            onClick={dismiss}
          >
            Explore the collection
          </Link>
        </div>
      </section>
    </div>
  );
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
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/reviews" element={<CustomerReviewsPage />} />
          <Route path="/policies/:slug" element={<PolicyPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/account/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/payment/return" element={<PaymentReturnPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/orders" element={<OrdersPage />} />
            <Route
              path="/account/orders/:orderId/receipt"
              element={<ReceiptPage />}
            />
            <Route path="/account/addresses" element={<AddressesPage />} />
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
      <ScrollToTop />
      <SitePreloader />
      <WelcomeOfferPopup />
      <AppRoutes />
    </BrowserRouter>
  );
}
